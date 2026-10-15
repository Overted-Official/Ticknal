/**
 * OpenRouter Resilient AI Client with Multi-Key Pool & Automatic Failover
 * 
 * Capabilities:
 * 1. Multi-key pool: Reads OPENROUTER_API_KEYS (comma/semicolon/newline-delimited) or single OPENROUTER_API_KEY.
 * 2. Rate-limit & quota tracking: Automatically cools down keys that return 429 / 402 / quota errors.
 * 3. Instant failover: If Key 1 hits rate limit, immediately rotates to Key 2 without dropping requests.
 * 4. Model cascading: Fallbacks across verified active free models with up to 3 models per OpenRouter batch.
 * 5. Deterministic fallback: Returns grounded factual template if all keys/models are unavailable.
 * 6. Audit & Telemetry: Exposes key health, usage counters, and generation provenance.
 */

export interface KeyState {
  key: string;
  maskedKey: string;
  cooldownUntil: number;
  failureCount: number;
  successCount: number;
  lastUsedAt: number;
  lastError?: string;
}

export interface KeyPoolStatus {
  totalKeys: number;
  availableKeys: number;
  cooldownKeys: number;
  keys: {
    index: number;
    maskedKey: string;
    isAvailable: boolean;
    cooldownRemainingSeconds: number;
    successCount: number;
    failureCount: number;
    lastError?: string;
  }[];
}

export interface CompleteWithKeyPoolOptions {
  systemPrompt: string;
  userPrompt: string;
  fallbackText: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  validateOutput?: (text: string) => boolean;
}

export interface AICompletionResult {
  text: string;
  source: 'ai_generated' | 'fallback_template';
  modelUsed?: string;
  keyIndexUsed?: number;
  maskedKeyUsed?: string;
  attemptsCount: number;
  durationMs: number;
  error?: string;
}

// Cascaded model tiers using verified active free models on OpenRouter
// (OpenRouter enforces max 3 items in 'models' array)
const MODEL_TIERS: string[][] = [
  [
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3.5-lightning:free',
  ],
  [
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'liquid/lfm-2.5-2.6b:free',
  ],
];

// In-memory key state store (persists across requests in node process)
const keyStates = new Map<string, KeyState>();

function maskKey(key: string): string {
  if (key.length <= 16) return 'sk-or-***';
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

/**
 * Parse and normalize all OpenRouter API keys from environment
 */
export function getAvailableKeys(): string[] {
  const rawList = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';
  const parsed = rawList
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k.startsWith('sk-or-'));

  const unique = Array.from(new Set(parsed));

  // Initialize state tracking for new keys
  for (const k of unique) {
    if (!keyStates.has(k)) {
      keyStates.set(k, {
        key: k,
        maskedKey: maskKey(k),
        cooldownUntil: 0,
        failureCount: 0,
        successCount: 0,
        lastUsedAt: 0,
      });
    }
  }

  return unique;
}

/**
 * Return live status of all configured keys in the pool
 */
export function getKeyPoolStatus(): KeyPoolStatus {
  const keys = getAvailableKeys();
  const now = Date.now();
  let availableCount = 0;
  let cooldownCount = 0;

  const keyDetails = keys.map((key, index) => {
    const state = keyStates.get(key) || {
      key,
      maskedKey: maskKey(key),
      cooldownUntil: 0,
      failureCount: 0,
      successCount: 0,
      lastUsedAt: 0,
    };

    const isAvailable = state.cooldownUntil <= now;
    const cooldownRemaining = isAvailable
      ? 0
      : Math.max(0, Math.ceil((state.cooldownUntil - now) / 1000));

    if (isAvailable) availableCount++;
    else cooldownCount++;

    return {
      index,
      maskedKey: state.maskedKey,
      isAvailable,
      cooldownRemainingSeconds: cooldownRemaining,
      successCount: state.successCount,
      failureCount: state.failureCount,
      lastError: state.lastError,
    };
  });

  return {
    totalKeys: keys.length,
    availableKeys: availableCount,
    cooldownKeys: cooldownCount,
    keys: keyDetails,
  };
}

/**
 * Reset all cooldowns (useful for manual recovery testing)
 */
export function resetKeyCooldowns(): void {
  for (const state of keyStates.values()) {
    state.cooldownUntil = 0;
    state.lastError = undefined;
  }
}

/**
 * Select the best key candidates ordered by availability and least-recent usage
 */
function getOrderedCandidates(keys: string[]): KeyState[] {
  const now = Date.now();
  const states = keys.map((k) => keyStates.get(k)!);

  return states.sort((a, b) => {
    const aAvailable = a.cooldownUntil <= now;
    const bAvailable = b.cooldownUntil <= now;

    // 1. Available keys first
    if (aAvailable && !bAvailable) return -1;
    if (!aAvailable && bAvailable) return 1;

    // 2. If both are on cooldown, pick the one that expires soonest
    if (!aAvailable && !bAvailable) {
      return a.cooldownUntil - b.cooldownUntil;
    }

    // 3. If both are available, pick the least recently used
    return a.lastUsedAt - b.lastUsedAt;
  });
}

/**
 * Sanitize AI model output by stripping thinking scratchpads, markdown preambles, and meta tags
 */
export function sanitizeInsightText(rawText: string): string {
  let text = rawText || '';

  // 1. Remove XML/HTML thinking tags: <think>...</think>
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Remove common thinking preambles
  text = text.replace(/^Here('s| is) a thinking process:[\s\S]*?\n\n/i, '').trim();
  text = text.replace(/^(here is|briefing|summary|market update:)[\s\S]*?\n/i, '').trim();

  // 3. Strip markdown bold wrapping if surrounding entire paragraphs
  text = text.replace(/^```[a-z]*\n([\s\S]*?)\n```$/i, '$1').trim();

  return text;
}

/**
 * Validate that text is not a raw thinking scratchpad and has substantive content
 */
export function defaultValidateOutput(text: string): boolean {
  if (!text || text.length < 35) return false;

  const lower = text.toLowerCase();
  const isScratchpad =
    text.includes('Analyze User') ||
    text.includes('Deconstruct') ||
    text.includes('User is asking') ||
    text.includes('Strict output rules') ||
    text.includes('Drafting -') ||
    text.includes('Key insight:') ||
    lower.includes('the user wants') ||
    lower.includes('the prompt asks') ||
    lower.includes('analyze the content') ||
    lower.includes('routine report') ||
    lower.includes('procedural data release') ||
    lower.includes('my reasoning:') ||
    lower.includes('step 1:') ||
    lower.includes('output format:');

  return !isScratchpad;
}

/**
 * Complete a prompt using the key pool with automatic failover and model cascading
 */
export async function completeWithKeyPool(
  options: CompleteWithKeyPoolOptions
): Promise<AICompletionResult> {
  const startTime = Date.now();
  const keys = getAvailableKeys();

  if (keys.length === 0) {
    return {
      text: options.fallbackText,
      source: 'fallback_template',
      attemptsCount: 0,
      durationMs: Date.now() - startTime,
      error: 'No OpenRouter API keys configured in OPENROUTER_API_KEYS or OPENROUTER_API_KEY',
    };
  }

  const orderedCandidates = getOrderedCandidates(keys);
  const validator = options.validateOutput || defaultValidateOutput;
  const timeoutMs = options.timeoutMs || 25000;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 500;

  let totalAttempts = 0;
  let lastFailureReason = '';

  // Try across available keys
  for (let keyIdx = 0; keyIdx < orderedCandidates.length; keyIdx++) {
    const candidate = orderedCandidates[keyIdx];
    const now = Date.now();

    // If candidate is still on cooldown, note and skip unless it's the only key
    if (candidate.cooldownUntil > now && orderedCandidates.length > 1) {
      continue;
    }

    // Try model tiers for this key
    for (let tierIdx = 0; tierIdx < MODEL_TIERS.length; tierIdx++) {
      const models = MODEL_TIERS[tierIdx];
      totalAttempts++;
      candidate.lastUsedAt = Date.now();

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${candidate.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://ticknal.com',
            'X-Title': 'Ticknal Terminal',
          },
          body: JSON.stringify({
            models,
            messages: [
              { role: 'system', content: options.systemPrompt },
              { role: 'user', content: options.userPrompt },
            ],
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        // Check for Rate Limit (429) or Payment/Quota Limit (402)
        if (response.status === 429 || response.status === 402) {
          const errText = await response.text();
          // Set 10-minute cooldown for this specific key
          const cooldownMinutes = response.status === 402 ? 30 : 10;
          candidate.cooldownUntil = Date.now() + cooldownMinutes * 60 * 1000;
          candidate.failureCount++;
          candidate.lastError = `HTTP ${response.status}: ${errText.slice(0, 100)}`;
          lastFailureReason = `Key ${candidate.maskedKey} rate limited (${response.status}). Rotating to next key.`;
          console.warn(`[openrouter-client] ${lastFailureReason}`);
          // Break model tier loop immediately to switch to the NEXT key in the pool!
          break;
        }

        if (!response.ok) {
          const errText = await response.text();
          candidate.failureCount++;
          candidate.lastError = `HTTP ${response.status}: ${errText.slice(0, 100)}`;
          lastFailureReason = `HTTP ${response.status}: ${errText.slice(0, 80)}`;
          console.warn(`[openrouter-client] Key ${candidate.maskedKey} tier ${tierIdx} failed:`, lastFailureReason);
          // Try next model tier on same key if not rate limited
          continue;
        }

        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
        const modelUsed = data?.model || models[0];

        const cleanText = sanitizeInsightText(rawContent);

        if (validator(cleanText)) {
          // Success! Update metrics
          candidate.successCount++;
          candidate.cooldownUntil = 0;
          candidate.lastError = undefined;

          return {
            text: cleanText,
            source: 'ai_generated',
            modelUsed,
            keyIndexUsed: keyIdx,
            maskedKeyUsed: candidate.maskedKey,
            attemptsCount: totalAttempts,
            durationMs: Date.now() - startTime,
          };
        } else {
          lastFailureReason = `Model output failed quality validation (length: ${cleanText.length})`;
          console.warn(`[openrouter-client] Key ${candidate.maskedKey} tier ${tierIdx}: ${lastFailureReason}`);
        }
      } catch (err: any) {
        candidate.failureCount++;
        const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
        candidate.lastError = isTimeout ? 'Request timeout' : (err?.message || String(err));
        lastFailureReason = `Key ${candidate.maskedKey}: ${candidate.lastError}`;
        console.warn(`[openrouter-client] ${lastFailureReason}`);
      }
    }
  }

  // If all keys and model tiers failed, gracefully return deterministic fallback template
  console.warn(`[openrouter-client] All keys/tiers exhausted (${totalAttempts} attempts). Returning data fallback template. Reason: ${lastFailureReason}`);

  return {
    text: options.fallbackText,
    source: 'fallback_template',
    attemptsCount: totalAttempts,
    durationMs: Date.now() - startTime,
    error: lastFailureReason || 'All available OpenRouter keys and model tiers were exhausted.',
  };
}

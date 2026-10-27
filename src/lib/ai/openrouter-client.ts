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
  maxAttempts?: number;
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
  ['google/gemini-2.0-flash-lite-preview-02-05:free'],
  ['meta-llama/llama-3.3-70b-instruct:free'],
  ['mistralai/mistral-small-24b-instruct-2501:free'],
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
  let text = (rawText || '').trim();

  // 1. Remove XML/HTML thinking tags: <think>...</think> and unclosed <think>...
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/<think>[\s\S]*$/gi, '').trim();

  // 2. Remove common thinking preambles
  text = text.replace(/^Here('s| is) a thinking process:[\s\S]*?\n\n/i, '').trim();
  text = text.replace(/^(here is|briefing|summary|market update:)[\s\S]*?\n/i, '').trim();

  // 3. Extract JSON from code fence if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // 4. Strip markdown bold/heading markers
  text = text.replace(/\*\*/g, '').replace(/__/g, '').replace(/^#+\s+/gm, '').trim();

  return text;
}

/**
 * Validate that text is not a raw thinking scratchpad and has substantive content
 */
export function defaultValidateOutput(text: string): boolean {
  if (!text || text.length < 35) return false;

  // Reject mid-word / mid-sentence cutoffs that lack terminal punctuation (including JSON closing braces)
  if (!/[.!?؟%)"»\]\}]$/.test(text.trim())) return false;

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
  const timeoutMs = options.timeoutMs || 8000;
  const maxAttempts = options.maxAttempts ?? 2;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = Math.max(options.maxTokens ?? 400, 900);

  let totalAttempts = 0;
  let lastFailureReason = '';

  // Try across available keys (strictly bounded by maxAttempts to prevent serverless timeouts)
  outerLoop: for (let keyIdx = 0; keyIdx < orderedCandidates.length; keyIdx++) {
    const candidate = orderedCandidates[keyIdx];
    const now = Date.now();

    // If candidate is still on cooldown, note and skip unless it's the only key
    if (candidate.cooldownUntil > now && orderedCandidates.length > 1) {
      continue;
    }

    // Try model tiers for this key
    for (let tierIdx = 0; tierIdx < MODEL_TIERS.length; tierIdx++) {
      if (totalAttempts >= maxAttempts) {
        break outerLoop;
      }
      const models = MODEL_TIERS[tierIdx];
      totalAttempts++;
      candidate.lastUsedAt = Date.now();

      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Request timeout'));
          }, timeoutMs);
        });

        const requestPromise = (async () => {
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
          const bodyText = await response.text();
          return { status: response.status, ok: response.ok, bodyText };
        })();

        const { status, ok, bodyText } = await Promise.race([requestPromise, timeoutPromise]);

        // Check for Rate Limit (429) or Payment/Quota Limit (402)
        if (status === 429 || status === 402) {
          const isUpstreamModelLimit =
            status === 429 &&
            (bodyText.includes('Provider returned error') ||
              bodyText.includes('temporarily rate-limited upstream') ||
              bodyText.includes('Rate limit exceeded: free-models-per-day'));

          if (isUpstreamModelLimit) {
            lastFailureReason = `Upstream model tier ${tierIdx} rate-limited. Trying next model tier.`;
            console.warn(`[openrouter-client] ${lastFailureReason}`);
            continue;
          }

          // Set cooldown for this specific API key
          const cooldownMinutes = status === 402 ? 30 : orderedCandidates.length > 1 ? 5 : 0.25;
          candidate.cooldownUntil = Date.now() + cooldownMinutes * 60 * 1000;
          candidate.failureCount++;
          candidate.lastError = `HTTP ${status}: ${bodyText.slice(0, 100)}`;
          lastFailureReason = `Key ${candidate.maskedKey} rate limited (${status}).`;
          console.warn(`[openrouter-client] ${lastFailureReason}`);
          if (orderedCandidates.length > 1) {
            // Rotate to next key in pool
            break;
          } else {
            // Only 1 key: pause briefly and try next model tier
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
        }

        if (!ok) {
          candidate.failureCount++;
          candidate.lastError = `HTTP ${status}: ${bodyText.slice(0, 100)}`;
          lastFailureReason = `HTTP ${status}: ${bodyText.slice(0, 80)}`;
          console.warn(`[openrouter-client] Key ${candidate.maskedKey} tier ${tierIdx} failed:`, lastFailureReason);
          // Try next model tier on same key if not rate limited
          continue;
        }

        const data = JSON.parse(bodyText);
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
        const isTimeout =
          err?.name === 'AbortError' ||
          err?.message?.includes('aborted') ||
          err?.message === 'Request timeout';
        candidate.lastError = isTimeout ? 'Request timeout' : (err?.message || String(err));
        lastFailureReason = `Key ${candidate.maskedKey}: ${candidate.lastError}`;
        console.warn(`[openrouter-client] ${lastFailureReason}`);
      } finally {
        if (timer) clearTimeout(timer);
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

'use client';

const PIN_STORAGE_KEY = 'quantegx_pin_hash';
const PIN_SALT_KEY = 'quantegx_pin_salt';
const PIN_SETTINGS_KEY = 'quantegx_pin_settings';
const SESSION_UNLOCKED_KEY = 'quantegx_session_unlocked';

const RECOVERY_QUESTION_KEY = 'quantegx_recovery_question';
const RECOVERY_ANSWER_HASH_KEY = 'quantegx_recovery_answer_hash';
const RECOVERY_SALT_KEY = 'quantegx_recovery_salt';

export type PinSecuritySettings = {
  enabled: boolean;
  autoLockOnBlur: boolean;
  idleTimeoutMinutes: number; // 0 = immediate, 1, 2, 5, 15, -1 = never
};

export const DEFAULT_PIN_SETTINGS: PinSecuritySettings = {
  enabled: false,
  autoLockOnBlur: true,
  idleTimeoutMinutes: 2,
};

export const STANDARD_SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'In what city were you born?',
  'What was the model of your first car?',
  'What is your mother’s maiden name?',
  'What was the name of your elementary school?',
  'What is your favorite trading book or strategy?',
] as const;

/**
 * Generate a cryptographically random salt
 */
function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const saltBytes = new Uint8Array(16);
    window.crypto.getRandomValues(saltBytes);
    return Array.from(saltBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Get or create a stored salt for PIN
 */
function getOrCreateSalt(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(PIN_SALT_KEY);
    if (existing) return existing;
    const newSalt = generateSalt();
    localStorage.setItem(PIN_SALT_KEY, newSalt);
    return newSalt;
  } catch {
    return generateSalt();
  }
}

/**
 * Compute SHA-256 hash of text with salt
 */
async function computeSha256(text: string, salt: string): Promise<string> {
  const salted = `${salt}_${text}`;

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    let hash = 0;
    for (let i = 0; i < salted.length; i++) {
      hash = (hash << 5) - hash + salted.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(salted);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of the 4-digit PIN with a unique per-device salt
 */
export async function hashPin(pin: string, salt?: string): Promise<string> {
  const actualSalt = salt ?? getOrCreateSalt();
  return computeSha256(pin, actualSalt);
}

/**
 * Normalize and hash secret security question answer
 */
export async function hashSecurityAnswer(answer: string, salt: string): Promise<string> {
  const normalized = answer.trim().toLowerCase().replace(/\s+/g, ' ');
  return computeSha256(normalized, salt);
}

export function getStoredPinHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getPinSettings(): PinSecuritySettings {
  if (typeof window === 'undefined') return DEFAULT_PIN_SETTINGS;
  try {
    const raw = localStorage.getItem(PIN_SETTINGS_KEY);
    if (!raw) return DEFAULT_PIN_SETTINGS;
    return { ...DEFAULT_PIN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PIN_SETTINGS;
  }
}

export function savePinSettings(settings: PinSecuritySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIN_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('quantegx_pin_settings_changed'));
  } catch {}
}

export async function setAppPin(pin: string, question?: string, answer?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // 1. Salt & hash PIN
  const pinSalt = generateSalt();
  localStorage.setItem(PIN_SALT_KEY, pinSalt);
  const pinHash = await hashPin(pin, pinSalt);
  localStorage.setItem(PIN_STORAGE_KEY, pinHash);

  // 2. Salt & hash Recovery Question if provided
  if (question && answer && answer.trim()) {
    const recoverySalt = generateSalt();
    const answerHash = await hashSecurityAnswer(answer, recoverySalt);
    localStorage.setItem(RECOVERY_QUESTION_KEY, question.trim());
    localStorage.setItem(RECOVERY_ANSWER_HASH_KEY, answerHash);
    localStorage.setItem(RECOVERY_SALT_KEY, recoverySalt);
  }

  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: true });
  setSessionUnlocked(true);
}

export function getStoredSecurityQuestion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(RECOVERY_QUESTION_KEY);
  } catch {
    return null;
  }
}

export function hasSecurityQuestionConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(
      localStorage.getItem(RECOVERY_QUESTION_KEY) &&
      localStorage.getItem(RECOVERY_ANSWER_HASH_KEY) &&
      localStorage.getItem(RECOVERY_SALT_KEY)
    );
  } catch {
    return false;
  }
}

/**
 * Verify secret security question answer
 */
export async function verifySecurityAnswer(inputAnswer: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const storedHash = localStorage.getItem(RECOVERY_ANSWER_HASH_KEY);
    const storedSalt = localStorage.getItem(RECOVERY_SALT_KEY);
    if (!storedHash || !storedSalt) return false;

    const inputHash = await hashSecurityAnswer(inputAnswer, storedSalt);
    return inputHash === storedHash;
  } catch {
    return false;
  }
}

export function removeAppPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(RECOVERY_QUESTION_KEY);
  localStorage.removeItem(RECOVERY_ANSWER_HASH_KEY);
  localStorage.removeItem(RECOVERY_SALT_KEY);
  
  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: false });
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
}

export async function verifyAppPin(inputPin: string): Promise<boolean> {
  const storedHash = getStoredPinHash();
  if (!storedHash) return true;

  // 1. Check with stored random salt
  const storedSalt = typeof window !== 'undefined' ? localStorage.getItem(PIN_SALT_KEY) : null;
  if (storedSalt) {
    const inputHash = await hashPin(inputPin, storedSalt);
    if (inputHash === storedHash) return true;
  }

  // 2. Check legacy SHA-256 salt format: "quantegx_salt_${pin}"
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const legacyData = encoder.encode(`quantegx_salt_${inputPin}`);
      const legacyBuffer = await window.crypto.subtle.digest('SHA-256', legacyData);
      const legacyHash = Array.from(new Uint8Array(legacyBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (legacyHash === storedHash) {
        // Automatically upgrade legacy hash to modern salted format!
        await setAppPin(inputPin);
        return true;
      }
    } catch {}
  }

  // 3. Check legacy simple hash fallback
  let fallbackLegacy = 0;
  for (let i = 0; i < inputPin.length; i++) {
    fallbackLegacy = (fallbackLegacy << 5) - fallbackLegacy + inputPin.charCodeAt(i);
    fallbackLegacy |= 0;
  }
  if (String(fallbackLegacy) === storedHash) {
    await setAppPin(inputPin);
    return true;
  }

  // 4. Safety fallback
  const rawHash = await hashPin(inputPin, '');
  if (rawHash === storedHash) {
    await setAppPin(inputPin);
    return true;
  }

  return false;
}

export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    }
  } catch {}
}

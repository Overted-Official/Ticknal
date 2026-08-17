'use client';

const PIN_STORAGE_KEY = 'quantegx_pin_hash';
const PIN_SALT_KEY = 'quantegx_pin_salt';
const PIN_SETTINGS_KEY = 'quantegx_pin_settings';
const SESSION_UNLOCKED_KEY = 'quantegx_session_unlocked';

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
  // Fallback for older environments
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Get or create a stored salt
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
 * Compute SHA-256 hash of the 4-digit PIN with a unique per-device salt
 */
export async function hashPin(pin: string, salt?: string): Promise<string> {
  const actualSalt = salt ?? getOrCreateSalt();

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback simple hash for older environments
    let hash = 0;
    const salted = `${actualSalt}_${pin}`;
    for (let i = 0; i < salted.length; i++) {
      hash = (hash << 5) - hash + salted.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${actualSalt}_${pin}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

export async function setAppPin(pin: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Generate a fresh random salt for each new PIN
  const salt = generateSalt();
  localStorage.setItem(PIN_SALT_KEY, salt);
  const hash = await hashPin(pin, salt);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: true });
  setSessionUnlocked(true);
}

export function removeAppPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: false });
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
}

export async function verifyAppPin(inputPin: string): Promise<boolean> {
  const storedHash = getStoredPinHash();
  if (!storedHash) return true;

  // 1. Check with stored random salt (if salt exists)
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

  // 3. Check legacy simple hash fallback (pre-crypto or fallback environments)
  let fallbackLegacy = 0;
  for (let i = 0; i < inputPin.length; i++) {
    fallbackLegacy = (fallbackLegacy << 5) - fallbackLegacy + inputPin.charCodeAt(i);
    fallbackLegacy |= 0;
  }
  if (String(fallbackLegacy) === storedHash) {
    await setAppPin(inputPin);
    return true;
  }

  // 4. Also check without salt as a safety fallback
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

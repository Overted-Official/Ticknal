'use client';

const PIN_STORAGE_KEY = 'quantegx_pin_hash';
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
 * Compute SHA-256 hash of the 4-digit PIN
 */
export async function hashPin(pin: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback simple hash for older environments
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = (hash << 5) - hash + pin.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`quantegx_salt_${pin}`);
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
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: true });
  setSessionUnlocked(true);
}

export function removeAppPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  const currentSettings = getPinSettings();
  savePinSettings({ ...currentSettings, enabled: false });
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
}

export async function verifyAppPin(inputPin: string): Promise<boolean> {
  const storedHash = getStoredPinHash();
  if (!storedHash) return true;
  const inputHash = await hashPin(inputPin);
  return inputHash === storedHash;
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

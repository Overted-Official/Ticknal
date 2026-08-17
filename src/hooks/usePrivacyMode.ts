'use client';

import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'quantegx_privacy_mode';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('quantegx_privacy_mode_changed', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('quantegx_privacy_mode_changed', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    return true; // Default true (masked)
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return true; // Default true (masked) during SSR
}

export function usePrivacyMode() {
  const isPrivacy = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const togglePrivacy = useCallback(() => {
    try {
      const current = getSnapshot();
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      // Dispatch event outside render phase
      window.dispatchEvent(new Event('quantegx_privacy_mode_changed'));
    } catch {}
  }, []);

  const mask = useCallback(
    (realValue: string | number, fallbackSuffix = '') => {
      if (isPrivacy) {
        return fallbackSuffix ? `****** ${fallbackSuffix}` : '******';
      }
      return String(realValue);
    },
    [isPrivacy]
  );

  return {
    isPrivacy,
    togglePrivacy,
    mask,
  };
}

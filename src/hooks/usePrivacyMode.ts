'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'quantegx_privacy_mode';

export function usePrivacyMode() {
  // Default to true (values masked) as requested
  const [isPrivacy, setIsPrivacy] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsPrivacy(stored === 'true');
      } else {
        // Default to true if not set
        setIsPrivacy(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      setIsPrivacy(true);
    }
  }, []);

  const togglePrivacy = useCallback(() => {
    setIsPrivacy((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        window.dispatchEvent(new Event('quantegx_privacy_mode_changed'));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setIsPrivacy(stored === 'true');
        }
      } catch {}
    };

    window.addEventListener('quantegx_privacy_mode_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('quantegx_privacy_mode_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Helper masking function
  const mask = useCallback(
    (realValue: string | number, fallbackSuffix = '') => {
      // During SSR or when privacy is enabled, return masked stars
      if (!isMounted || isPrivacy) {
        return fallbackSuffix ? `****** ${fallbackSuffix}` : '******';
      }
      return String(realValue);
    },
    [isMounted, isPrivacy]
  );

  return {
    isPrivacy: !isMounted ? true : isPrivacy,
    togglePrivacy,
    mask,
  };
}

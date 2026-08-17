'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  getStoredPinHash,
  getPinSettings,
  savePinSettings,
  setAppPin,
  removeAppPin,
  verifyAppPin,
  isSessionUnlocked,
  setSessionUnlocked,
  getStoredSecurityQuestion,
  hasSecurityQuestionConfigured,
  verifySecurityAnswer,
  type PinSecuritySettings,
  DEFAULT_PIN_SETTINGS,
} from '@/lib/pin-security';
import PinLockScreen from '@/components/platform/PinLockScreen';

interface PinLockContextType {
  isLocked: boolean;
  isConfigured: boolean;
  hasSecurityQuestion: boolean;
  securityQuestion: string | null;
  pinSettings: PinSecuritySettings;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<boolean>;
  setPin: (pin: string, question?: string, answer?: string) => Promise<void>;
  verifyRecoveryAnswer: (answer: string) => Promise<boolean>;
  removePin: () => void;
  resetPin: () => void;
  updateSettings: (settings: PinSecuritySettings) => void;
}

const PinLockContext = createContext<PinLockContextType | null>(null);

export function usePinLock() {
  const ctx = useContext(PinLockContext);
  if (!ctx) {
    throw new Error('usePinLock must be used within a PinLockProvider');
  }
  return ctx;
}

export function PinLockProvider({ children }: { children: React.ReactNode }) {
  const [pinSettings, setPinSettings] = useState<PinSecuritySettings>(DEFAULT_PIN_SETTINGS);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState<boolean>(false);
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state on mount and on storage events
  const syncState = useCallback(() => {
    const hash = getStoredPinHash();
    const settings = getPinSettings();
    const hasPin = Boolean(hash && settings.enabled);
    const hasQuestion = hasSecurityQuestionConfigured();
    const question = getStoredSecurityQuestion();

    setIsConfigured(hasPin);
    setPinSettings(settings);
    setHasSecurityQuestion(hasQuestion);
    setSecurityQuestion(question);

    if (hasPin) {
      const unlocked = isSessionUnlocked();
      setIsLocked(!unlocked);
    } else {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    syncState();
    window.addEventListener('quantegx_pin_settings_changed', syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('quantegx_pin_settings_changed', syncState);
      window.removeEventListener('storage', syncState);
    };
  }, [syncState]);

  // Lock action
  const lockApp = useCallback(() => {
    if (isConfigured) {
      setSessionUnlocked(false);
      setIsLocked(true);
    }
  }, [isConfigured]);

  // Unlock action
  const unlockApp = useCallback(
    async (pin: string): Promise<boolean> => {
      const isValid = await verifyAppPin(pin);
      if (isValid) {
        setSessionUnlocked(true);
        setIsLocked(false);
        return true;
      }
      return false;
    },
    []
  );

  // Set new PIN with optional recovery question
  const handleSetPin = useCallback(async (pin: string, question?: string, answer?: string) => {
    await setAppPin(pin, question, answer);
    syncState();
  }, [syncState]);

  // Verify recovery question answer
  const handleVerifyRecoveryAnswer = useCallback(async (answer: string): Promise<boolean> => {
    return await verifySecurityAnswer(answer);
  }, []);

  // Remove / Reset PIN (requires verified recovery or authenticated action)
  const handleResetPin = useCallback(() => {
    removeAppPin();
    setSessionUnlocked(true);
    setIsLocked(false);
    syncState();
  }, [syncState]);

  // Update Settings
  const handleUpdateSettings = useCallback((settings: PinSecuritySettings) => {
    savePinSettings(settings);
    setPinSettings(settings);
  }, []);

  // Auto-Lock on visibility change (switching tabs or backgrounding app)
  useEffect(() => {
    if (!isConfigured || !pinSettings.autoLockOnBlur) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setSessionUnlocked(false);
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConfigured, pinSettings.autoLockOnBlur]);

  // Inactivity / Idle Timer
  useEffect(() => {
    if (!isConfigured || pinSettings.idleTimeoutMinutes <= 0 || isLocked) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const timeoutMs = pinSettings.idleTimeoutMinutes * 60 * 1000;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setSessionUnlocked(false);
        setIsLocked(true);
      }, timeoutMs);
    };

    resetIdleTimer();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [isConfigured, pinSettings.idleTimeoutMinutes, isLocked]);

  return (
    <PinLockContext.Provider
      value={{
        isLocked,
        isConfigured,
        hasSecurityQuestion,
        securityQuestion,
        pinSettings,
        lockApp,
        unlockApp,
        setPin: handleSetPin,
        verifyRecoveryAnswer: handleVerifyRecoveryAnswer,
        removePin: handleResetPin,
        resetPin: handleResetPin,
        updateSettings: handleUpdateSettings,
      }}
    >
      {children}

      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && isConfigured && (
          <PinLockScreen
            onUnlock={unlockApp}
            onResetPin={handleResetPin}
            securityQuestion={securityQuestion}
            onVerifyRecovery={handleVerifyRecoveryAnswer}
          />
        )}
      </AnimatePresence>
    </PinLockContext.Provider>
  );
}

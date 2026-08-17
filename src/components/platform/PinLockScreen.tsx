'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
}

export default function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleDigit = useCallback(
    async (digit: string) => {
      if (pin.length >= 4 || isVerifying) return;

      const newPin = pin + digit;
      setPin(newPin);
      setIsError(false);
      setErrorMessage(null);

      // Light haptic feedback if supported on mobile
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch {}

      if (newPin.length === 4) {
        setIsVerifying(true);
        const success = await onUnlock(newPin);
        if (!success) {
          setIsError(true);
          setErrorMessage('Incorrect PIN. Please try again.');
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([50, 50, 50]);
            }
          } catch {}
          setTimeout(() => {
            setPin('');
            setIsVerifying(false);
          }, 600);
        } else {
          setIsVerifying(false);
        }
      }
    },
    [pin, isVerifying, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage(null);
  }, [isVerifying]);

  // Support physical keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace]);

  const handleForgotPin = async () => {
    if (confirm('Forgot your PIN? Signing out will allow you to re-authenticate with your account credentials.')) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between py-12 px-6 text-white select-none overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col items-center text-center space-y-3 mt-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-[0_0_24px_rgba(255,100,13,0.15)] relative">
          <Lock size={24} className="text-plt-orange" />
          <div className="absolute inset-0 rounded-2xl border border-plt-orange/30 animate-pulse" />
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">QuantEGX Security</h2>
          <p className="text-xs text-white/40 mt-1">Enter your 4-digit passcode to unlock</p>
        </div>
      </div>

      {/* PIN Dots Area */}
      <div className="flex flex-col items-center my-auto">
        <motion.div
          animate={isError ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-5"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? isError
                      ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-115'
                      : 'bg-plt-orange shadow-[0_0_12px_rgba(255,100,13,0.6)] scale-110'
                    : 'bg-white/10 border border-white/20'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error Message */}
        <div className="h-6 mt-4 flex items-center justify-center">
          <AnimatePresence>
            {errorMessage && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-rose-400 font-medium tracking-tight"
              >
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Numeric Keypad (3x4) */}
      <div className="w-full max-w-[280px] space-y-4 mb-4">
        {/* Rows 1-3 */}
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-3 gap-4">
            {row.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isVerifying}
                className="h-16 rounded-full bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.18] active:scale-95 border border-white/[0.08] flex items-center justify-center text-2xl font-mono font-medium text-white transition-all focus:outline-none shadow-sm disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
          </div>
        ))}

        {/* Row 4: Blank, '0', Backspace */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16" />

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="h-16 rounded-full bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.18] active:scale-95 border border-white/[0.08] flex items-center justify-center text-2xl font-mono font-medium text-white transition-all focus:outline-none shadow-sm disabled:opacity-50"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0 || isVerifying}
            className="h-16 rounded-full bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.12] active:scale-95 border border-white/[0.05] flex items-center justify-center text-white/70 hover:text-white transition-all focus:outline-none disabled:opacity-20"
            title="Delete"
          >
            <Delete size={22} />
          </button>
        </div>
      </div>

      {/* Footer: Forgot PIN */}
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={handleForgotPin}
          className="text-xs text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5 mx-auto"
        >
          <LogOut size={12} />
          <span>Forgot PIN? Sign out</span>
        </button>
      </div>
    </motion.div>
  );
}

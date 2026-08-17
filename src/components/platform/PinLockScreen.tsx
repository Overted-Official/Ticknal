'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
  onResetPin?: () => void;
}

export default function PinLockScreen({ onUnlock, onResetPin }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
      if (showResetConfirm) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, showResetConfirm]);

  const handleSignOut = async () => {
    if (onResetPin) onResetPin();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleResetConfirm = () => {
    if (onResetPin) {
      onResetPin();
    }
    setShowResetConfirm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between py-10 px-6 text-white select-none overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col items-center text-center space-y-3 mt-2">
        <div className="w-13 h-13 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-[0_0_24px_rgba(255,100,13,0.15)] relative">
          <Lock size={22} className="text-plt-orange" />
          <div className="absolute inset-0 rounded-2xl border border-plt-orange/30 animate-pulse" />
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">QuantEGX Security</h2>
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
      <div className="w-full max-w-[280px] space-y-4 mb-3">
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

      {/* Footer: Reset PIN & Sign Out options */}
      <div className="mt-2 text-center flex items-center justify-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="text-white/40 hover:text-plt-orange transition-colors flex items-center gap-1"
        >
          <span>Reset Passcode</span>
        </button>

        <span className="text-white/20">•</span>

        <button
          type="button"
          onClick={handleSignOut}
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
        >
          <LogOut size={12} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-white/[0.12] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plt-orange/10 border border-plt-orange/20 flex items-center justify-center text-plt-orange shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Reset Device Passcode</h3>
                  <p className="text-xs text-white/40 mt-0.5">Clear PIN lock on this device</p>
                </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                Resetting will remove the PIN lock on this device so you can access your dashboard and configure a new PIN in Settings.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-plt-orange hover:bg-plt-orange/90 shadow-sm transition-colors"
                >
                  Reset PIN & Unlock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

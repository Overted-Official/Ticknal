'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, Delete } from 'lucide-react';
import { usePinLock } from '@/components/platform/PinLockProvider';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PinSetupModal({ isOpen, onClose, onSuccess }: PinSetupModalProps) {
  const { setPin } = usePinLock();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('create');
      setFirstPin('');
      setConfirmPin('');
      setIsError(false);
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const currentDigits = step === 'create' ? firstPin : confirmPin;

  const handleDigit = useCallback(
    async (digit: string) => {
      if (currentDigits.length >= 4 || isSuccess) return;

      const next = currentDigits + digit;

      if (step === 'create') {
        setFirstPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 250);
        }
      } else {
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === firstPin) {
            setIsSuccess(true);
            await setPin(next);
            setTimeout(() => {
              onSuccess?.();
              onClose();
            }, 1000);
          } else {
            setIsError(true);
            setErrorMessage('PINs do not match. Please try again.');
            setTimeout(() => {
              setConfirmPin('');
              setIsError(false);
            }, 600);
          }
        }
      }
    },
    [currentDigits, step, firstPin, isSuccess, setPin, onSuccess, onClose]
  );

  const handleBackspace = useCallback(() => {
    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setIsError(false);
    setErrorMessage(null);
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-[340px] rounded-2xl bg-[#0e0e0e] border border-white/10 p-6 flex flex-col items-center text-white relative shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>

        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center py-8 space-y-3"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white">Passcode Activated!</h3>
            <p className="text-xs text-white/50">Your app is now protected with a 4-digit PIN.</p>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center space-y-1 mb-6">
              <div className="w-10 h-10 rounded-xl bg-plt-orange/10 border border-plt-orange/20 flex items-center justify-center text-plt-orange mb-2">
                <Lock size={18} />
              </div>
              <h3 className="text-base font-semibold text-white">
                {step === 'create' ? 'Set 4-Digit PIN' : 'Confirm Your PIN'}
              </h3>
              <p className="text-xs text-white/40">
                {step === 'create'
                  ? 'Choose a 4-digit code to protect your portfolio'
                  : 'Re-enter the code to confirm'}
              </p>
            </div>

            {/* PIN Dots */}
            <motion.div
              animate={isError ? { x: [-10, 10, -6, 6, 0] } : {}}
              className="flex items-center gap-4 mb-4"
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = currentDigits.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      isFilled
                        ? isError
                          ? 'bg-rose-500 scale-110 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                          : 'bg-plt-orange scale-110 shadow-[0_0_8px_rgba(255,100,13,0.5)]'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  />
                );
              })}
            </motion.div>

            {/* Error Message */}
            <div className="h-5 mb-2 flex items-center justify-center">
              <AnimatePresence>
                {errorMessage && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-rose-400 font-medium"
                  >
                    {errorMessage}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Keypad */}
            <div className="w-full space-y-2.5">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
              ].map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-3 gap-2.5">
                  {row.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigit(digit)}
                      className="h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.16] active:scale-95 border border-white/[0.08] flex items-center justify-center text-lg font-mono font-medium text-white transition-all shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              ))}

              <div className="grid grid-cols-3 gap-2.5">
                <div className="h-12" />
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.16] active:scale-95 border border-white/[0.08] flex items-center justify-center text-lg font-mono font-medium text-white transition-all shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={currentDigits.length === 0}
                  className="h-12 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.12] active:scale-95 border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-white transition-all disabled:opacity-20"
                >
                  <Delete size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

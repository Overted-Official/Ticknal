'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, Delete, HelpCircle, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { usePinLock } from '@/components/platform/PinLockProvider';
import { STANDARD_SECURITY_QUESTIONS } from '@/lib/pin-security';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PinSetupModal({ isOpen, onClose, onSuccess }: PinSetupModalProps) {
  const { setPin } = usePinLock();
  const [step, setStep] = useState<'create' | 'confirm' | 'recovery'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [question, setQuestion] = useState<string>(STANDARD_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('create');
      setFirstPin('');
      setConfirmPin('');
      setQuestion(STANDARD_SECURITY_QUESTIONS[0]);
      setCustomQuestion('');
      setAnswer('');
      setIsError(false);
      setErrorMessage(null);
      setIsSuccess(false);
      setIsSubmitting(false);
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
      } else if (step === 'confirm') {
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === firstPin) {
            setTimeout(() => {
              setStep('recovery');
            }, 300);
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
    [currentDigits, step, firstPin, isSuccess]
  );

  const handleBackspace = useCallback(() => {
    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setIsError(false);
    setErrorMessage(null);
  }, [step]);

  // Keyboard navigation for PIN entry
  useEffect(() => {
    if (!isOpen || step === 'recovery') return;
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
  }, [isOpen, step, handleDigit, handleBackspace, onClose]);

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuestion = question === 'CUSTOM' ? customQuestion.trim() : question;
    const finalAnswer = answer.trim();

    if (!finalQuestion) {
      setErrorMessage('Please select or enter a security question.');
      return;
    }
    if (!finalAnswer || finalAnswer.length < 2) {
      setErrorMessage('Please enter an answer with at least 2 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await setPin(firstPin, finalQuestion, finalAnswer);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch {
      setErrorMessage('Failed to save security settings. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-[360px] rounded-2xl bg-[#0e0e0e] border border-white/10 p-6 flex flex-col items-center text-white relative shadow-2xl"
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
            <h3 className="text-lg font-semibold text-white">Security Activated!</h3>
            <p className="text-xs text-white/50">Your app is protected with a 4-digit PIN and recovery question.</p>
          </motion.div>
        ) : step === 'recovery' ? (
          /* Step 3: Security Question & Secret Answer */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full space-y-4"
          >
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-plt-orange/10 border border-plt-orange/20 flex items-center justify-center text-plt-orange mb-1">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-semibold text-white">Set Recovery Question</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Required if you ever forget your PIN to safely recover access on this device.
              </p>
            </div>

            <form onSubmit={handleFinishSetup} className="space-y-3.5 pt-1">
              {/* Question Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60">Security Question</label>
                <select
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-plt-orange transition-colors"
                >
                  {STANDARD_SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} className="bg-neutral-900 text-white">
                      {q}
                    </option>
                  ))}
                  <option value="CUSTOM" className="bg-neutral-900 text-white">
                    Custom Question...
                  </option>
                </select>
              </div>

              {question === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-white/60">Custom Question</label>
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Enter your custom question"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-plt-orange"
                    required
                  />
                </div>
              )}

              {/* Secret Answer */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60">Secret Answer</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Your secret answer (case-insensitive)"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-plt-orange"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-white/30">Answers are stored hashed and never shared.</p>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-plt-orange hover:bg-plt-orange/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-md shadow-plt-orange/20"
                >
                  <span>{isSubmitting ? 'Saving...' : 'Activate Passcode'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Step 1 & 2: PIN Keypad */
          <>
            <div className="flex flex-col items-center text-center space-y-1 mb-6">
              <div className="w-10 h-10 rounded-xl bg-plt-orange/10 border border-plt-orange/20 flex items-center justify-center text-plt-orange mb-2">
                <Lock size={18} />
              </div>
              <h3 className="text-base font-semibold text-white">
                {step === 'create' ? 'Step 1 of 3: Set 4-Digit PIN' : 'Step 2 of 3: Confirm PIN'}
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

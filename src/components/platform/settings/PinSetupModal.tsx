'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, Delete, HelpCircle, ShieldCheck, ArrowRight, ArrowLeft } from '@/components/ui/icon-library';
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
    <div className="fixed inset-0 z-lock-underlay flex items-center justify-center p-4 bg-plt-base/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-[360px] sm:max-w-[380px] p-6 sm:p-8 flex flex-col items-center text-plt-text relative rounded-2xl bg-plt-base border border-plt-border shadow-[0_24px_50px_rgba(0,0,0,0.85)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {isSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center py-8 space-y-4"
          >
            <div className="w-14 h-14 rounded-full bg-profit-num/10 border border-profit-num/30 flex items-center justify-center text-profit-num">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-lg font-bold text-plt-text tracking-tight">Security Activated!</h3>
            <p className="text-xs text-plt-muted">Your app is protected with a 4-digit PIN and recovery question.</p>
          </motion.div>
        ) : step === 'recovery' ? (
          /* Step 3: Security Question & Secret Answer */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full space-y-4"
          >
            <div className="flex flex-col items-center text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-text mb-1">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-plt-text tracking-tight">Set Recovery Question</h3>
              <p className="text-xs text-plt-muted leading-relaxed">
                Required if you ever forget your PIN to safely recover access on this device.
              </p>
            </div>

            <form onSubmit={handleFinishSetup} className="space-y-3.5 pt-2">
              {/* Question Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-plt-muted">Security Question</label>
                <select
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-plt-base border border-plt-border focus:border-brand-blue text-xs text-plt-text rounded-xl p-3 outline-none font-sans cursor-pointer transition-colors"
                >
                  {STANDARD_SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                  <option value="CUSTOM">
                    Custom Question...
                  </option>
                </select>
              </div>

              {question === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-plt-muted">Custom Question</label>
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Enter your custom question"
                    className="w-full bg-plt-base border border-plt-border focus:border-brand-blue text-xs text-plt-text placeholder:text-plt-muted rounded-xl p-3 outline-none font-sans transition-colors"
                    required
                  />
                </div>
              )}

              {/* Secret Answer */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-plt-muted">Secret Answer</label>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Your secret answer (case-insensitive)"
                  className="w-full bg-plt-base border border-plt-border focus:border-brand-blue text-xs text-plt-text placeholder:text-plt-muted rounded-xl p-3 outline-none font-sans transition-colors"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-plt-muted">Answers are stored hashed and never shared.</p>
              </div>

              {errorMessage && (
                <p className="text-xs text-loss-num font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !answer.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-blue hover:opacity-90 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>{isSubmitting ? 'Saving...' : 'Activate Passcode'}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Step 1 & 2: PIN Keypad */
          <>
            <div className="flex flex-col items-center text-center space-y-1 mb-3">
              <div className="w-12 h-12 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-text mb-1">
                <Lock size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-plt-text tracking-tight">
                {step === 'create' ? 'Step 1 of 3: Set 4-Digit PIN' : 'Step 2 of 3: Confirm PIN'}
              </h3>
              <p className="text-xs text-plt-muted">
                {step === 'create'
                  ? 'Choose a 4-digit code to protect your portfolio'
                  : 'Re-enter the code to confirm'}
              </p>
            </div>

            {/* PIN Dots */}
            <motion.div
              animate={isError ? { x: [-10, 10, -6, 6, 0] } : {}}
              className="flex items-center gap-4 sm:gap-5 my-3"
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = currentDigits.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? isError
                          ? 'bg-loss-num shadow-[0_0_14px_rgba(242,54,69,0.7)] scale-110'
                          : 'bg-plt-text shadow-[0_0_14px_rgba(255,255,255,0.7)] scale-110'
                        : 'bg-plt-active/50 border border-plt-border'
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
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-loss-num font-medium tracking-tight"
                  >
                    {errorMessage}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Keypad (3x4) with circular buttons and bigger numbers */}
            <div className="w-full max-w-[270px] sm:max-w-[290px] mx-auto space-y-3 sm:space-y-3.5">
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
              ].map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-3 gap-3.5 sm:gap-4 justify-items-center">
                  {row.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigit(digit)}
                      className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px] rounded-full aspect-square bg-plt-hover hover:bg-plt-active active:scale-95 border border-plt-border hover:border-plt-border-strong flex items-center justify-center text-[20px] sm:text-[32px] font-sans font-normal leading-none text-plt-text transition-all shadow-xs focus:outline-none cursor-pointer select-none"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              ))}

              <div className="grid grid-cols-3 gap-3.5 sm:gap-4 justify-items-center items-center">
                <div className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px]" />
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px] rounded-full aspect-square bg-plt-hover hover:bg-plt-active active:scale-95 border border-plt-border hover:border-plt-border-strong flex items-center justify-center text-[20px] sm:text-[32px] font-sans font-normal leading-none text-plt-text transition-all shadow-xs focus:outline-none cursor-pointer select-none"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={currentDigits.length === 0}
                  className="w-[70px] h-[70px] sm:w-[76px] sm:h-[76px] rounded-full aspect-square bg-transparent hover:bg-plt-hover active:bg-plt-active active:scale-95 flex items-center justify-center text-plt-muted hover:text-plt-text transition-all focus:outline-none disabled:opacity-20 cursor-pointer"
                  title="Delete"
                >
                  <Delete size={24} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

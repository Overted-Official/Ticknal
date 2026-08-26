'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, LogOut, ShieldCheck, KeyRound, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PinLockScreenProps {
  onUnlock: (pin: string) => Promise<boolean>;
  onResetPin?: () => void;
  securityQuestion?: string | null;
  onVerifyRecovery?: (answer: string) => Promise<boolean>;
}

export default function PinLockScreen({
  onUnlock,
  onResetPin,
  securityQuestion,
  onVerifyRecovery,
}: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'question' | 'password'>('question');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const router = useRouter();

  // Pre-fill user email if session exists
  useEffect(() => {
    async function loadUserEmail() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setAuthEmail(user.email);
        }
      } catch {}
    }
    loadUserEmail();
  }, []);

  // Default to password if no security question exists
  useEffect(() => {
    if (!securityQuestion) {
      setRecoveryMethod('password');
    } else {
      setRecoveryMethod('question');
    }
  }, [securityQuestion]);

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
      if (showRecoveryModal) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, showRecoveryModal]);

  const handleSignOut = async () => {
    if (onResetPin) onResetPin();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Secure Recovery Handlers
  const handleVerifyQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryAnswer.trim()) {
      setRecoveryError('Please enter your secret answer.');
      return;
    }

    try {
      setIsRecovering(true);
      setRecoveryError(null);

      const isValid = onVerifyRecovery
        ? await onVerifyRecovery(recoveryAnswer)
        : false;

      if (isValid) {
        setRecoverySuccess(true);
        setTimeout(() => {
          if (onResetPin) onResetPin();
          setShowRecoveryModal(false);
          setRecoverySuccess(false);
          setRecoveryAnswer('');
        }, 1200);
      } else {
        setRecoveryError('Incorrect secret answer. Please try again.');
        setIsRecovering(false);
      }
    } catch {
      setRecoveryError('Verification error. Please try again or use password.');
      setIsRecovering(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      setRecoveryError('Please enter your account email and password.');
      return;
    }

    try {
      setIsRecovering(true);
      setRecoveryError(null);

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (signInError) {
        setRecoveryError(signInError.message || 'Invalid email or password.');
        setIsRecovering(false);
        return;
      }

      setRecoverySuccess(true);
      setTimeout(() => {
        if (onResetPin) onResetPin();
        setShowRecoveryModal(false);
        setRecoverySuccess(false);
        setAuthPassword('');
      }, 1200);
    } catch {
      setRecoveryError('Authentication failed. Please verify your connection.');
      setIsRecovering(false);
    }
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
      <div className="flex flex-col items-center text-center space-y-3 mt-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.12] flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.08)] relative">
          <Lock size={22} className="text-white" />
          <div className="absolute inset-0 rounded-2xl border border-white/20 animate-pulse" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">QuantEGX Security</h2>
          <p className="text-xs text-white/50 mt-1">Enter your 4-digit passcode to unlock</p>
        </div>
      </div>

      {/* PIN Dots Area */}
      <div className="flex flex-col items-center my-auto">
        <motion.div
          animate={isError ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-5 my-2"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? isError
                      ? 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.6)] scale-115'
                      : 'bg-white shadow-[0_0_14px_rgba(255,255,255,0.5)] scale-110'
                    : 'bg-white/10 border border-white/20'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error Message */}
        <div className="h-6 mt-3 flex items-center justify-center">
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
      <div className="w-full max-w-[270px] sm:max-w-[290px] mx-auto space-y-3.5 sm:space-y-4 mb-4">
        {/* Rows 1-3 */}
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
                disabled={isVerifying}
                className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full aspect-square bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.22] active:scale-95 border border-white/[0.10] hover:border-white/[0.24] flex items-center justify-center text-2xl sm:text-[28px] font-sans font-medium text-white transition-all shadow-sm focus:outline-none cursor-pointer select-none disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
          </div>
        ))}

        {/* Row 4: Blank, '0', Backspace */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4 justify-items-center items-center">
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full aspect-square bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.22] active:scale-95 border border-white/[0.10] hover:border-white/[0.24] flex items-center justify-center text-2xl sm:text-[28px] font-sans font-medium text-white transition-all shadow-sm focus:outline-none cursor-pointer select-none disabled:opacity-50"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={pin.length === 0 || isVerifying}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full aspect-square bg-white/[0.02] hover:bg-white/[0.08] active:bg-white/[0.16] active:scale-95 border border-white/[0.06] hover:border-white/[0.15] flex items-center justify-center text-white/60 hover:text-white transition-all focus:outline-none disabled:opacity-20 cursor-pointer"
            title="Delete"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>

      {/* Footer: Forgot PIN & Sign Out options */}
      <div className="mt-2 text-center flex items-center justify-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => {
            setRecoveryError(null);
            setShowRecoveryModal(true);
          }}
          className="text-white/40 hover:text-white transition-colors flex items-center gap-1"
        >
          <span>Forgot PIN?</span>
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

      {/* Secure Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-white/[0.12] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
            >
              {recoverySuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-6 flex flex-col items-center text-center space-y-2.5"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-base font-semibold text-white">Identity Verified!</h3>
                  <p className="text-xs text-white/50">PIN lock reset. Unlocking your session...</p>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Passcode Recovery</h3>
                      <p className="text-xs text-white/40 mt-0.5">Verify your identity to reset PIN</p>
                    </div>
                  </div>

                  {/* Recovery Method Switcher (if security question exists) */}
                  {securityQuestion && (
                    <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryMethod('question');
                          setRecoveryError(null);
                        }}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          recoveryMethod === 'question'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Security Question
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryMethod('password');
                          setRecoveryError(null);
                        }}
                        className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          recoveryMethod === 'password'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        Account Password
                      </button>
                    </div>
                  )}

                  {recoveryMethod === 'question' && securityQuestion ? (
                    /* Method 1: Answer Security Question */
                    <form onSubmit={handleVerifyQuestion} className="space-y-3.5 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-white/50">Your Security Question</label>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs font-medium text-white/90">
                          {securityQuestion}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-white/50">Secret Answer</label>
                        <input
                          type="text"
                          value={recoveryAnswer}
                          onChange={(e) => {
                            setRecoveryAnswer(e.target.value);
                            setRecoveryError(null);
                          }}
                          placeholder="Enter your secret answer"
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                          required
                          autoFocus
                        />
                      </div>

                      {recoveryError && (
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{recoveryError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRecoveryModal(false)}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isRecovering || !recoveryAnswer.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-40 shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <span>{isRecovering ? 'Verifying...' : 'Verify & Unlock'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Method 2: Account Password Re-Auth */
                    <form onSubmit={handleVerifyPassword} className="space-y-3.5 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-white/50">Account Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                            required
                          />
                          <Mail size={14} className="absolute left-3 top-3 text-white/30" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-white/50">Account Password</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => {
                              setAuthPassword(e.target.value);
                              setRecoveryError(null);
                            }}
                            placeholder="••••••••••••"
                            className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                            required
                            autoFocus
                          />
                          <KeyRound size={14} className="absolute left-3 top-3 text-white/30" />
                        </div>
                      </div>

                      {recoveryError && (
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{recoveryError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowRecoveryModal(false)}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isRecovering || !authPassword}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-40 shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <span>{isRecovering ? 'Verifying...' : 'Verify Password'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

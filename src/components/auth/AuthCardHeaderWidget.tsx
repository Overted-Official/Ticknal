import React from 'react';
import Image from 'next/image';

interface AuthCardHeaderWidgetProps {
  isSignUp: boolean;
  error?: string | null;
  message?: string | null;
}

export default function AuthCardHeaderWidget({ isSignUp, error, message }: AuthCardHeaderWidgetProps) {
  return (
    <div className="w-full min-w-0 relative flex flex-col items-center text-center">
      {/* Logo Mark */}
      <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-6 shadow-inner">
        <Image
          src="/logo-mark.svg"
          alt="Ticknal"
          width={26}
          height={26}
          className="w-6 h-6 object-contain"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight mb-2">
        {isSignUp ? 'Create your account' : 'Welcome to Ticknal'}
      </h1>
      <p className="text-xs sm:text-sm text-white/60 font-sans max-w-xs mb-8 leading-relaxed">
        {isSignUp
          ? 'Start trading with proprietary EGX models, live signals, and institutional risk analytics.'
          : 'Sign in to access your quantitative trading terminal and live portfolio.'}
      </p>

      {/* Feedback messages */}
      {error && (
        <div className="w-full mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left leading-relaxed">
          {error}
        </div>
      )}

      {message && (
        <div className="w-full mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-left leading-relaxed">
          {message}
        </div>
      )}
    </div>
  );
}

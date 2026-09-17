import React from 'react';

interface EmailAuthFormWidgetProps {
  isSignUp: boolean;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export default function EmailAuthFormWidget({
  isSignUp,
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  onToggleMode,
}: EmailAuthFormWidgetProps) {
  return (
    <div className="w-full min-w-0 relative">
      <form onSubmit={onSubmit} className="w-full flex flex-col gap-3.5">
        <div className="flex flex-col items-start gap-1.5 text-left w-full">
          <label className="text-xs font-sans text-white/70 font-medium">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trader@quantegx.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 hover:border-white/25 focus:border-white focus:bg-white/[0.07] text-white text-sm placeholder:text-white/30 focus:outline-none transition-colors font-sans"
          />
        </div>

        <div className="flex flex-col items-start gap-1.5 text-left w-full">
          <div className="w-full flex items-center justify-between">
            <label className="text-xs font-sans text-white/70 font-medium">Password</label>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 hover:border-white/25 focus:border-white focus:bg-white/[0.07] text-white text-sm placeholder:text-white/30 focus:outline-none transition-colors font-sans"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-plt-muted-surface hover:bg-plt-hover active:scale-[0.99] border border-white/15 text-plt-text font-medium text-sm font-sans transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
          )}
        </button>
      </form>

      {/* Toggle between Login and Signup */}
      <div className="mt-6 text-xs text-white/60 font-sans text-center">
        {isSignUp ? (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-white hover:underline font-medium cursor-pointer"
            >
              Sign In
            </button>
          </span>
        ) : (
          <span>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="text-white hover:underline font-medium cursor-pointer"
            >
              Create one
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

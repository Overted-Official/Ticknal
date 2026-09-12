'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/dashboard';
  const initialMode = searchParams.get('mode') === 'signup';

  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push(nextPath);
      }
    });
  }, [supabase, router, nextPath]);

  const handleGoogleLogin = async () => {
    setError(null);
    setOauthLoading(true);
    try {
      if (isNativePlatform()) {
        const { data, error: err } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.ticknal.app://auth/callback',
            skipBrowserRedirect: true,
          },
        });

        if (err) throw err;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google login');
      setOauthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (signUpErr) throw signUpErr;

        if (data?.session) {
          router.push(nextPath);
        } else {
          setMessage('Check your email inbox for the verification link.');
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data?.user) {
          router.push(nextPath);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between items-center px-4 py-8 sm:py-12 overflow-hidden selection:bg-white selection:text-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Header / Back link */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans text-white/60 hover:text-white transition-colors group"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Back to Ticknal</span>
        </Link>

        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-mark.svg"
            alt="Ticknal"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
          />
          <span className="text-white font-medium text-sm tracking-tight">Ticknal</span>
        </Link>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md my-auto py-8">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-2xl p-6 sm:p-10 shadow-[0_16px_64px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
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

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={oauthLoading}
            className="w-full py-3 px-4 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.99] font-medium text-sm font-sans flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {oauthLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="w-full flex items-center gap-3 my-6">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[11px] uppercase tracking-widest text-white/40 font-mono">or email</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3.5">
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-white/15 text-white font-medium text-sm font-sans transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-6 text-xs text-white/60 font-sans">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                    setMessage(null);
                  }}
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
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-white hover:underline font-medium cursor-pointer"
                >
                  Create one
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="relative z-10 text-center text-xs text-white/40 font-sans py-2">
        <p>By signing in, you agree to Ticknal Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';
import AuthHeaderWidget from './AuthHeaderWidget';
import AuthCardHeaderWidget from './AuthCardHeaderWidget';
import OAuthButtonsWidget from './OAuthButtonsWidget';
import EmailAuthFormWidget from './EmailAuthFormWidget';

export default function LoginPageView() {
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

      {/* Top Header Navigation Widget */}
      <AuthHeaderWidget />

      {/* Central Auth Container */}
      <div className="relative z-10 w-full max-w-md my-auto py-8">
        <div className="rounded-2xl border border-white/10 bg-plt-base/80 backdrop-blur-2xl p-6 sm:p-10 shadow-[0_16px_64px_rgba(0,0,0,0.8)] flex flex-col items-center">
          <AuthCardHeaderWidget isSignUp={isSignUp} error={error} message={message} />
          <OAuthButtonsWidget onGoogleLogin={handleGoogleLogin} loading={oauthLoading} />
          <EmailAuthFormWidget
            isSignUp={isSignUp}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSubmit={handleEmailAuth}
            onToggleMode={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
          />
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="relative z-10 text-center text-xs text-white/40 font-sans py-2">
        <p>By signing in, you agree to Ticknal Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}

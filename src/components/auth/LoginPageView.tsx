'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';
import LoginLeftArtPanel from './LoginLeftArtPanel';
import LoginRightAuthPanel from './LoginRightAuthPanel';

export default function LoginPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/home';

  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col lg:flex-row overflow-x-hidden selection:bg-white selection:text-black font-sans">
      {/* 1. Left Side: Brand Identity, Geometric Wave Art & Testimonial Quote */}
      <LoginLeftArtPanel />

      {/* 2. Right Side: Back to Home, Sign In / Join Title, and Google Auth */}
      <LoginRightAuthPanel
        onGoogleLogin={handleGoogleLogin}
        oauthLoading={oauthLoading}
        error={error}
      />
    </div>
  );
}

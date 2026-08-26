'use client';

import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';

export default function AuthButton({
  className,
  children,
  variant = 'primary',
  nextPath = '/dashboard'
}: {
  className?: string,
  children: React.ReactNode,
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  nextPath?: string
}) {
  const supabase = createClient();

  const handleLogin = async () => {
    if (isNativePlatform()) {
      const liveOrigin = 'https://quantegx.vercel.app';
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${liveOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}&source=app`,
          skipBrowserRedirect: true,
        },
      });

      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_self' });
      }
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
  };

  const baseClass = "btn-token";

  const variants = {
    primary: "btn-primary",
    secondary: "bg-plt-text text-plt-inverse hover:bg-plt-subtle",
    outline: "btn-secondary bg-transparent",
    ghost: "btn-ghost"
  };

  return (
    <button
      onClick={handleLogin}
      className={`${baseClass} ${variants[variant]} ${className || ''}`}
    >
      {children}
    </button>
  );
}

'use client';

import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

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

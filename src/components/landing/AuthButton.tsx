'use client';

import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function AuthButton({ 
  className, 
  children,
  variant = 'primary'
}: { 
  className?: string, 
  children: React.ReactNode,
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}) {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const baseClass = "transition-all font-semibold rounded-full flex items-center justify-center";
  
  const variants = {
    primary: "bg-tv-accent hover:bg-tv-accent-hover text-white shadow-[0_0_20px_rgba(255,100,13,0.3)] hover:shadow-[0_0_30px_rgba(255,100,13,0.5)]",
    secondary: "bg-white text-black hover:bg-gray-100",
    outline: "bg-transparent border border-white/20 hover:border-white/40 hover:bg-white/5 text-white",
    ghost: "text-tv-muted hover:text-white bg-transparent"
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

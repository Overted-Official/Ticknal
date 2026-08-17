'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export default function PrivacyToggleButton({ className = '' }: { className?: string }) {
  const { isPrivacy, togglePrivacy } = usePrivacyMode();

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={`h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.09] hover:bg-white/[0.08] hover:border-white/[0.18] text-white/70 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all select-none ${className}`}
      title={isPrivacy ? 'Privacy Mode Active (Values Masked) - Click to Reveal' : 'Values Visible - Click to Mask'}
    >
      {isPrivacy ? (
        <>
          <EyeOff size={14} className="text-plt-orange" />
          <span className="font-mono text-[11px] text-white/80 tracking-wider">******</span>
        </>
      ) : (
        <>
          <Eye size={14} className="text-white/60" />
          <span className="text-[11px] text-white/60">Hide</span>
        </>
      )}
    </button>
  );
}

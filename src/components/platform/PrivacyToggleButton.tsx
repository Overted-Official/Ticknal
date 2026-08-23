'use client';

import React from 'react';
import { Eye, EyeOff } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export default function PrivacyToggleButton({ className = '' }: { className?: string }) {
  const { isPrivacy, togglePrivacy } = usePrivacyMode();

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={`btn-token btn-secondary btn-compact select-none ${className}`}
      title={isPrivacy ? 'Privacy Mode Active (Values Masked) - Click to Reveal' : 'Values Visible - Click to Mask'}
    >
      {isPrivacy ? (
        <>
          <EyeOff size={14} className="text-plt-muted" />
          <span className="tabular-nums text-caption text-plt-subtle tracking-wider">******</span>
        </>
      ) : (
        <>
          <Eye size={16} className="text-plt-subtle" />
          <span className="text-caption text-plt-subtle">Hide</span>
        </>
      )}
    </button>
  );
}

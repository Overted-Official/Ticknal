'use client';

import React from 'react';
import { Eye, EyeOff } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface PrivacyToggleButtonProps {
  className?: string;
  iconOnly?: boolean;
}

export default function PrivacyToggleButton({ className = '', iconOnly = false }: PrivacyToggleButtonProps) {
  const { isPrivacy, togglePrivacy } = usePrivacyMode();
  const title = isPrivacy ? 'Privacy Mode Active (Values Masked) - Click to Reveal' : 'Values Visible - Click to Mask';
  const icon = isPrivacy ? <EyeOff size={iconOnly ? 18 : 14} className="text-plt-muted" /> : <Eye size={iconOnly ? 18 : 16} className="text-plt-subtle" />;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={togglePrivacy}
        className={`flex items-center justify-center select-none ${className}`}
        title={title}
        aria-label={title}
        aria-pressed={isPrivacy}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={`btn-token btn-secondary btn-compact select-none ${className}`}
      title={title}
      aria-label={title}
      aria-pressed={isPrivacy}
    >
      {isPrivacy ? (
        <>
          {icon}
          <span className="tabular-nums text-caption text-plt-subtle tracking-wider">******</span>
        </>
      ) : (
        <>
          {icon}
          <span className="text-caption text-plt-subtle">Hide</span>
        </>
      )}
    </button>
  );
}

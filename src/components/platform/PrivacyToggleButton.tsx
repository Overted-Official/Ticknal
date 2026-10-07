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
  const iconRef = React.useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | any>(null);

  const icon = isPrivacy ? (
    <EyeOff ref={iconRef} size={iconOnly ? 18 : 14} className="text-current" />
  ) : (
    <Eye ref={iconRef} size={iconOnly ? 18 : 16} className="text-current" />
  );

  const handleMouseEnter = () => {
    if (typeof iconRef.current?.startAnimation === 'function') {
      iconRef.current.startAnimation();
    }
  };
  const handleMouseLeave = () => {
    if (typeof iconRef.current?.stopAnimation === 'function') {
      iconRef.current.stopAnimation();
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={togglePrivacy}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

'use client';

import React, { useRef } from 'react';
import { Compass, Info, HelpCircle } from '@/components/ui/animated-icons';
import type { AnimatedIconHandle } from '@/components/ui/animated-icons/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface TourTriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  className?: string;
  variant?: 'pill' | 'icon';
  icon?: 'compass' | 'info' | 'help';
  label?: string;
}

export function TourTriggerButton({
  onClick,
  className,
  variant = 'pill',
  icon = 'compass',
  label,
  onMouseEnter,
  onMouseLeave,
  ...props
}: TourTriggerButtonProps) {
  const { isRTL } = useTranslation();
  const iconRef = useRef<AnimatedIconHandle>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    iconRef.current?.startAnimation();
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    iconRef.current?.stopAnimation();
    onMouseLeave?.(e);
  };

  const defaultLabel = isRTL ? 'جولة سريعة' : 'Quick Tour';
  const displayLabel = label ?? defaultLabel;

  const renderIcon = (size: number) => {
    const iconProps = {
      ref: iconRef,
      size,
      strokeWidth: 1.8,
      className: 'text-zinc-400 group-hover:text-white transition-colors duration-200 shrink-0 pointer-events-none',
    };

    if (icon === 'info') {
      return <Info {...iconProps} />;
    }
    if (icon === 'help') {
      return <HelpCircle {...iconProps} />;
    }
    return <Compass {...iconProps} />;
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'group inline-flex items-center justify-center p-2 rounded-lg',
          'text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12]',
          'border border-white/10 hover:border-white/20 active:border-white/30',
          'transition-all duration-200 active:scale-95 shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.06)]',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer select-none',
          className
        )}
        title={displayLabel}
        aria-label={displayLabel}
        {...props}
      >
        {renderIcon(15)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
        'text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12]',
        'border border-white/10 hover:border-white/20 active:border-white/30',
        'transition-all duration-200 active:scale-95 shadow-xs hover:shadow-[0_0_12px_rgba(255,255,255,0.06)]',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer select-none font-sans',
        className
      )}
      title={displayLabel}
      aria-label={displayLabel}
      {...props}
    >
      {renderIcon(14)}
      <span className="font-sans font-medium text-xs tracking-tight text-zinc-300 group-hover:text-white transition-colors duration-200 leading-none">
        {displayLabel}
      </span>
    </button>
  );
}

export default TourTriggerButton;

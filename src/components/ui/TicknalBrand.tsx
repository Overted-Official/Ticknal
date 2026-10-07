'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface TicknalBrandProps {
  /** Optional link target. If undefined, defaults to "/". If null, renders non-clickable element. */
  href?: string | null;
  /** Predefined size variants */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Explicit logo icon size in px (overrides size preset) */
  iconSize?: number;
  /** Explicit text size classes (e.g. "text-xl", overrides size preset) */
  textSizeClass?: string;
  /** Whether to show the logo mark icon */
  showIcon?: boolean;
  /** Whether to show the text wordmark */
  showText?: boolean;
  /** Additional wrapper classes */
  className?: string;
  /** Additional classes for text */
  textClassName?: string;
  /** Additional classes for icon */
  iconClassName?: string;
  /** Icon image source */
  iconSrc?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Accessible label */
  'aria-label'?: string;
}

const SIZE_PRESETS = {
  sm: { icon: 18, text: 'text-[15px] sm:text-[16px]' },
  md: { icon: 20, text: 'text-[17px] sm:text-[18px]' },
  lg: { icon: 24, text: 'text-[20px] sm:text-[22px]' },
  xl: { icon: 28, text: 'text-[26px] sm:text-[28px]' },
};

/**
 * Standard Ticknal Brand Wordmark Component
 *
 * Enforces the global typography and design rules:
 * - Font: EuclidCircularSemibold (fallback: Inter, sans-serif)
 * - Weight: 600 (font-semibold)
 * - Casing: lowercase ("ticknal")
 * - Tracking: -0.04em (tracking-[-0.04em])
 * - Leading: 1 (leading-none)
 */
export default function TicknalBrand({
  href = '/',
  size = 'md',
  iconSize,
  textSizeClass,
  showIcon = true,
  showText = true,
  className = '',
  textClassName = '',
  iconClassName = '',
  iconSrc = '/logo-white.svg',
  onClick,
  'aria-label': ariaLabel = 'Ticknal Home',
}: TicknalBrandProps) {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;
  const resolvedIconSize = iconSize ?? preset.icon;
  const resolvedTextClass = textSizeClass ?? preset.text;

  const content = (
    <>
      {showIcon && (
        <div
          className={`relative flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconClassName}`}
          style={{ width: resolvedIconSize, height: resolvedIconSize }}
        >
          <Image
            src={iconSrc}
            alt="Ticknal"
            width={resolvedIconSize}
            height={resolvedIconSize}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      )}

      {showText && (
        <span
          className={`font-semibold tracking-[-0.04em] text-white shrink-0 font-euclid select-none lowercase leading-none ${resolvedTextClass} ${textClassName}`}
          style={{
            fontFamily: 'EuclidCircularSemibold, Inter, -apple-system, sans-serif',
          }}
        >
          ticknal
        </span>
      )}
    </>
  );

  const containerClasses = `inline-flex items-center gap-2 group cursor-pointer ${className}`;

  if (href === null) {
    return (
      <div className={containerClasses} onClick={onClick}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={containerClasses}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  );
}

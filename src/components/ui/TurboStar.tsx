'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { getTurboSignalStatus, type TurboSignalStatus } from '@/lib/finance/turbo-client';

export interface TurboStarProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  symbol?: string | null;
  signalDate?: string | null;
  status?: TurboSignalStatus;
}

/**
 * Minimalist Star Indicator for Ticknal Turbo / Portfolio Manager:
 * - Solid ★ (Amber Gold): Actively entered / allocated in the Turbo portfolio.
 * - Hollow ☆ (Muted Amber Outline): Qualified constituent in the Turbo basket (unallocated / at capacity).
 * - none: Not in the Turbo qualified basket.
 */
export default function TurboStar({
  className = '',
  size = 'xs',
  symbol,
  signalDate,
  status: explicitStatus,
}: TurboStarProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  const status: TurboSignalStatus = explicitStatus ?? (symbol ? getTurboSignalStatus(symbol, signalDate) : 'candidate');

  if (status === 'none') return null;

  const sizeClasses = {
    xs: 'text-[11px] leading-none',
    sm: 'text-xs leading-none',
    md: 'text-sm leading-none',
  }[size];

  if (status === 'entered') {
    return (
      <span
        className={`text-amber-400 font-bold shrink-0 select-none inline-flex items-center justify-center font-sans ${sizeClasses} ${className}`}
        title={
          isAr
            ? 'محفظة تيربو: تم الدخول وتخصيص رأس مال في هذه الإشارة'
            : 'Turbo Portfolio: Entered on this signal (Allocated)'
        }
        aria-label={
          isAr
            ? 'محفظة تيربو: تم الدخول وتخصيص رأس مال في هذه الإشارة'
            : 'Turbo Portfolio: Entered on this signal (Allocated)'
        }
      >
        ★
      </span>
    );
  }

  return (
    <span
      className={`text-amber-400/60 hover:text-amber-400 transition-colors font-medium shrink-0 select-none inline-flex items-center justify-center font-sans ${sizeClasses} ${className}`}
      title={
        isAr
          ? 'سلة تيربو: سهم مؤهل في السلة (غير مخصص • المحفظة مكتملة)'
          : 'Turbo Basket: Qualified constituent (Not allocated · At capacity)'
      }
      aria-label={
        isAr
          ? 'سلة تيربو: سهم مؤهل في السلة (غير مخصص • المحفظة مكتملة)'
          : 'Turbo Basket: Qualified constituent (Not allocated · At capacity)'
      }
    >
      ☆
    </span>
  );
}

'use client';

import React from 'react';
import { useSafeLocale } from '../useSafeLocale';

export type RatioBenchmarkStatus = 'healthy' | 'neutral' | 'strained';

export interface RatioBenchmarkBadgeProps {
  status: RatioBenchmarkStatus;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  RatioBenchmarkStatus,
  {
    classes: string;
    defaultEn: string;
    defaultAr: string;
  }
> = {
  healthy: {
    classes: 'text-plt-profit bg-plt-profit-soft border-plt-profit-border',
    defaultEn: 'Healthy',
    defaultAr: 'صحي',
  },
  neutral: {
    classes: 'text-plt-warning bg-plt-warning-soft border-plt-warning-border',
    defaultEn: 'Neutral',
    defaultAr: 'معتدل',
  },
  strained: {
    classes: 'text-plt-risk bg-plt-risk-soft border-plt-risk-border',
    defaultEn: 'Strained',
    defaultAr: 'حرج',
  },
};

/**
 * Computes the institutional health status for standard financial ratios.
 * Returns null if the value is missing or NaN.
 */
export function getRatioBenchmarkStatus(
  ratioKey: string,
  value: number | null | undefined
): RatioBenchmarkStatus | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  switch (ratioKey) {
    // Profitability & Margins (values expressed as percentages, e.g. 25 = 25%)
    case 'grossMargin':
      if (value >= 25) return 'healthy';
      if (value >= 10) return 'neutral';
      return 'strained';

    case 'operatingMargin':
      if (value >= 15) return 'healthy';
      if (value >= 5) return 'neutral';
      return 'strained';

    case 'netMargin':
      if (value >= 10) return 'healthy';
      if (value >= 3) return 'neutral';
      return 'strained';

    case 'roe':
      if (value >= 15) return 'healthy';
      if (value >= 5) return 'neutral';
      return 'strained';

    case 'roa':
      if (value >= 5) return 'healthy';
      if (value >= 2) return 'neutral';
      return 'strained';

    // Liquidity & Solvency (multiples, e.g. 1.2 = 1.2x)
    case 'currentRatio':
      if (value >= 1.2) return 'healthy';
      if (value >= 0.9) return 'neutral';
      return 'strained';

    case 'debtToEquity':
      // Lower is safer, negative equity indicates distress
      if (value < 0) return 'strained';
      if (value <= 1.0) return 'healthy';
      if (value <= 2.0) return 'neutral';
      return 'strained';

    case 'debtToAssets':
      if (value <= 0.4) return 'healthy';
      if (value <= 0.6) return 'neutral';
      return 'strained';

    case 'financialLeverage':
      if (value <= 2.5 && value >= 1.0) return 'healthy';
      if (value <= 4.0 && value >= 1.0) return 'neutral';
      return 'strained';

    // Cash & Efficiency
    case 'fcfMargin':
      if (value >= 10) return 'healthy';
      if (value >= 0) return 'neutral';
      return 'strained';

    case 'cashConversion':
      if (value >= 1.0) return 'healthy';
      if (value >= 0.6) return 'neutral';
      return 'strained';

    case 'assetTurnover':
      if (value >= 0.7) return 'healthy';
      if (value >= 0.3) return 'neutral';
      return 'strained';

    default:
      return null;
  }
}

export default function RatioBenchmarkBadge({
  status,
  label,
  className = '',
}: RatioBenchmarkBadgeProps) {
  const locale = useSafeLocale();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;
  const displayLabel =
    label ?? (locale === 'ar' ? config.defaultAr : config.defaultEn);

  return (
    <span
      data-testid={`benchmark-badge-${status}`}
      className={`inline-flex items-center justify-center font-sans font-medium rounded-none text-[10px] px-1.5 py-0.5 border leading-tight shrink-0 select-none ${config.classes} ${className}`}
    >
      {displayLabel}
    </span>
  );
}

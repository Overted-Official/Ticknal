'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type MonthlyDataItem } from '../homeInvestmentsTypes';

interface PerformanceChartTooltipProps {
  active?: boolean;
  payload?: any[];
}

export default function PerformanceChartTooltip({ active, payload }: PerformanceChartTooltipProps) {
  const { isPrivacy } = usePrivacyMode();

  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload as MonthlyDataItem;

  const formatVal = (val: number): string => {
    if (isPrivacy) return '••••';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${(val / 1_000).toFixed(1)}k`;
    return abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  return (
    <div className="w-[144px] h-[144px] p-3 rounded-xl bg-surface-raised/95 border border-border-subtle text-text-primary text-[11px] tabular-nums select-none font-sans flex flex-col justify-between shadow-2xl backdrop-blur-md">
      {/* Date & ROI Header */}
      <div className="font-semibold text-text-primary pb-1.5 border-b border-border-subtle flex justify-between items-center text-xs leading-none">
        <span>{d.month}</span>
        {d.roi !== undefined && (
          <span className="font-bold text-white">
            {d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Metrics List - All text white */}
      <div className="flex flex-col justify-between flex-1 pt-1.5 space-y-1.5">
        {d.marketValue !== undefined && d.marketValue > 0 && (
          <div className="flex justify-between items-center text-white leading-none">
            <span>Market:</span>
            <span className="font-semibold text-white">
              {isPrivacy ? '••••' : `${formatVal(d.marketValue)} £`}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-white leading-none">
          <span>Realized:</span>
          <span className="font-semibold text-white">
            {isPrivacy ? '••••' : `${d.pl >= 0 ? '+' : '-'}${formatVal(d.pl)} £`}
          </span>
        </div>

        {d.unrealizedPl !== undefined && d.unrealizedPl !== 0 && (
          <div className="flex justify-between items-center text-white leading-none">
            <span>Unrealized:</span>
            <span className="font-semibold text-white">
              {isPrivacy ? '••••' : `${d.unrealizedPl >= 0 ? '+' : '-'}${formatVal(d.unrealizedPl)} £`}
            </span>
          </div>
        )}

        {d.invested > 0 && (
          <div className="flex justify-between items-center text-white leading-none">
            <span>Invested:</span>
            <span className="font-semibold text-white">
              {isPrivacy ? '••••' : `${formatVal(d.invested)} £`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

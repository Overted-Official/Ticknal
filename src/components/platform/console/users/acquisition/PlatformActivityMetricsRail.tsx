'use client';

import React from 'react';
import type { PlatformActivityDataPoint } from './PlatformActivitySvgChart';

interface PlatformActivityMetricsRailProps {
  granularity: 'daily' | 'monthly' | 'hourly';
  totalSessions: number;
  avgVal: number;
  peakItem: PlatformActivityDataPoint | null;
  activeCount: number;
  totalPointsCount: number;
}

export default function PlatformActivityMetricsRail({
  granularity,
  totalSessions,
  avgVal,
  peakItem,
  activeCount,
  totalPointsCount,
}: PlatformActivityMetricsRailProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-default/60 mt-2">
      {granularity === 'daily' && (
        <>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Total Sessions
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {totalSessions} Sessions
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Avg Daily Volume
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {avgVal} sess / day
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle truncate">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Peak Day
            </div>
            <div className="text-sm font-semibold text-profit-num tabular-nums mt-0.5 truncate">
              {peakItem ? `${peakItem.label} (${peakItem.sessions}s)` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Active Traffic Days
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {activeCount} Days
            </div>
          </div>
        </>
      )}

      {granularity === 'monthly' && (
        <>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Total Tracked
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {totalSessions} Sessions
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Monthly Run Rate
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {avgVal} sess / mo
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle truncate">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Peak Month
            </div>
            <div className="text-sm font-semibold text-profit-num tabular-nums mt-0.5 truncate">
              {peakItem ? `${peakItem.label} (${peakItem.sessions}s)` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Monitored Months
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {totalPointsCount} Months
            </div>
          </div>
        </>
      )}

      {granularity === 'hourly' && (
        <>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Peak Hour (Cairo)
            </div>
            <div className="text-sm font-semibold text-profit-num tabular-nums mt-0.5">
              {peakItem ? `${peakItem.label} (${peakItem.sessions} sess)` : '—'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Core Trading
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              10 AM – 4 PM EGX
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              24h Intraday
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
              {totalSessions} Sessions
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-input/30 border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">
              Timezone Standard
            </div>
            <div className="text-sm font-semibold text-text-secondary tabular-nums mt-0.5">
              UTC+3 (Cairo)
            </div>
          </div>
        </>
      )}
    </div>
  );
}

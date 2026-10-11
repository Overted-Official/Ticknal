'use client';

import React from 'react';
import type { ConsoleOperationsPageData } from '@/lib/server/console-queries';

interface FeedsWatchdogKpiRailProps {
  feeds: ConsoleOperationsPageData['feeds'];
}

export default function FeedsWatchdogKpiRail({ feeds }: FeedsWatchdogKpiRailProps) {
  return (
    <div className="operations-kpi-rail" aria-label="Data feed health overview">
      {/* KPI 1: Tracked Securities */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Tracked Securities
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-info">
            EGX Market
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {feeds.totalTickers}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Equities
          </span>
        </div>
      </div>

      {/* KPI 2: Sync Freshness Rate */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Market Feed Sync Rate
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-profit">
            {feeds.syncedTickersCount} Synced
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {feeds.syncRatePct}%
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium leading-none">
            Fresh Daily Bars
          </span>
        </div>
      </div>

      {/* KPI 3: Stale / Missing Equities */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Stale / Missing Feeds
          </span>
          <span
            className={`operations-kpi-chip ${
              feeds.staleTickersCount === 0
                ? 'operations-kpi-chip-profit'
                : 'operations-kpi-chip-warning'
            }`}
          >
            {feeds.staleTickersCount === 0 ? 'Optimal' : 'Needs Ingestion'}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {feeds.staleTickersCount}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Tickers Pending
          </span>
        </div>
      </div>

      {/* KPI 4: Active Strategy Models */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Quant Pipeline Models
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-accent">
            Algorithmic
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            3 Models
          </span>
          <span className="text-[10px] sm:text-[11px] text-purple-400 font-medium leading-none">
            Champion / PSI / Mom
          </span>
        </div>
      </div>
    </div>
  );
}

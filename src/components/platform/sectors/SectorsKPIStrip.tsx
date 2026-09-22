'use client';

import React, { useMemo } from 'react';
import type { SectorsPerformanceResponse, SectorStrategySignalsResponse, SectorPerformanceItem } from '@/lib/sectors-math';

interface SectorsKPIStripProps {
  analysisMode: 'macro' | 'strategy';
  granularity: 'sector' | 'industryGroup' | 'industry' | 'ticker';
  sectors?: SectorPerformanceItem[];
  marketSummary?: SectorsPerformanceResponse['marketSummary'];
  signalsData?: SectorStrategySignalsResponse;
  activeStrategyFilter?:
    | 'ALL'
    | 'BUY_FRESH'
    | 'LONG_ACTIVE'
    | 'LONG_WINNERS'
    | 'LONG_LOSERS'
    | 'EXIT_RECENT'
    | 'ALPHA_POSITIVE'
    | 'ALPHA_NEGATIVE';
  onSetStrategyFilter?: (
    filter:
      | 'ALL'
      | 'BUY_FRESH'
      | 'LONG_ACTIVE'
      | 'LONG_WINNERS'
      | 'LONG_LOSERS'
      | 'EXIT_RECENT'
      | 'ALPHA_POSITIVE'
      | 'ALPHA_NEGATIVE'
  ) => void;
  onSelectSector?: (sector: string) => void;
}

export default function SectorsKPIStrip({
  analysisMode,
  granularity,
  sectors,
  marketSummary,
  signalsData,
  activeStrategyFilter = 'ALL',
  onSetStrategyFilter,
  onSelectSector,
}: SectorsKPIStripProps) {
  const groupLabel =
    granularity === 'ticker'
      ? 'Stock'
      : granularity === 'industryGroup'
      ? 'Group'
      : granularity === 'industry'
      ? 'Industry'
      : 'Sector';

  // Compute Alpha Breadth (Positive vs Negative Alpha counts)
  const alphaStats = useMemo(() => {
    if (!sectors || !signalsData?.signalsByTicker) {
      return { positiveCount: 0, negativeCount: 0, total: 0 };
    }
    let positiveCount = 0;
    let negativeCount = 0;
    for (const sec of sectors) {
      for (const st of sec.stocks) {
        const sig = signalsData.signalsByTicker[st.symbol];
        if (sig) {
          const stratRoi = sig.sysRoi ?? 0;
          const alpha = stratRoi - st.returnPct;
          if (alpha > 0) {
            positiveCount++;
          } else {
            negativeCount++;
          }
        }
      }
    }
    return { positiveCount, negativeCount, total: positiveCount + negativeCount };
  }, [sectors, signalsData]);

  // ══════════════════════════════════════════════════════════════════════════
  // STRATEGY MODE (Canonical tv-kpi-card 4-grid)
  // ══════════════════════════════════════════════════════════════════════════
  if (analysisMode === 'strategy' && signalsData?.summary) {
    const handleToggle = (
      filter:
        | 'ALL'
        | 'BUY_FRESH'
        | 'LONG_ACTIVE'
        | 'LONG_WINNERS'
        | 'LONG_LOSERS'
        | 'EXIT_RECENT'
        | 'ALPHA_POSITIVE'
        | 'ALPHA_NEGATIVE'
    ) => {
      if (onSetStrategyFilter) {
        onSetStrategyFilter(activeStrategyFilter === filter ? 'ALL' : filter);
      }
    };

    const isRoiActive = activeStrategyFilter === 'ALL';
    const isLongActive = activeStrategyFilter === 'LONG_ACTIVE';
    const isBuysActive = activeStrategyFilter === 'BUY_FRESH';
    const isExitsActive = activeStrategyFilter === 'EXIT_RECENT';

    return (
      <div className="w-full select-none font-sans shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Card 1: Cumulative ROI */}
          <div
            onClick={() => handleToggle('ALL')}
            className={`tv-kpi-card w-full cursor-pointer transition-all ${
              isRoiActive ? 'ring-1 ring-[#089981]/50 border-[#089981]/60 bg-[#27272a]' : ''
            }`}
            title="Click to view all strategy constituents"
          >
            {/* Row 1: Title (left) + Badge pill (right) */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
                Cumulative ROI
              </span>
              <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {signalsData.summary.winRate !== undefined && signalsData.summary.winRate > 0
                  ? `${signalsData.summary.winRate.toFixed(0)}% Win`
                  : 'Active'}
              </span>
            </div>

            {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className={`text-[15px] sm:text-[20px] font-bold tabular-nums tracking-tight shrink-0 ${
                (signalsData.summary.cumulativeRoi ?? 0) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
              }`}>
                {(signalsData.summary.cumulativeRoi ?? 0) > 0 ? '+' : ''}
                {signalsData.summary.cumulativeRoi?.toFixed(1) ?? '0.0'}%
              </span>
              <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
                Avg Strategy Return
              </span>
            </div>
          </div>

          {/* Card 2: Active Longs */}
          <div
            onClick={() => handleToggle('LONG_ACTIVE')}
            className={`tv-kpi-card w-full cursor-pointer transition-all ${
              isLongActive ? 'ring-1 ring-[#2962ff]/50 border-[#2962ff]/60 bg-[#27272a]' : ''
            }`}
            title="Click to filter to active long positions"
          >
            {/* Row 1: Title (left) + Badge pill (right) */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
                Active Longs
              </span>
              <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {signalsData.summary.activeLongsWinning ?? 0}W · {signalsData.summary.activeLongsLosing ?? 0}L
              </span>
            </div>

            {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
                {signalsData.summary.totalActiveLongs} <span className="text-[11px] sm:text-xs font-normal text-[#787b86]">Stocks</span>
              </span>
              <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
                Filter Positions
              </span>
            </div>
          </div>

          {/* Card 3: Fresh Buys */}
          <div
            onClick={() => handleToggle('BUY_FRESH')}
            className={`tv-kpi-card w-full cursor-pointer transition-all ${
              isBuysActive ? 'ring-1 ring-[#089981]/50 border-[#089981]/60 bg-[#27272a]' : ''
            }`}
            title="Click to filter to fresh buy signals"
          >
            {/* Row 1: Title (left) + Badge pill (right) */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
                Fresh Buys
              </span>
              <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Actionable
              </span>
            </div>

            {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-[#089981] tabular-nums tracking-tight shrink-0">
                {signalsData.summary.totalFreshBuys} <span className="text-[11px] sm:text-xs font-normal text-[#787b86]">New</span>
              </span>
              <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
                New Inceptions
              </span>
            </div>
          </div>

          {/* Card 4: Recent Exits */}
          <div
            onClick={() => handleToggle('EXIT_RECENT')}
            className={`tv-kpi-card w-full cursor-pointer transition-all ${
              isExitsActive ? 'ring-1 ring-[#f23645]/50 border-[#f23645]/60 bg-[#27272a]' : ''
            }`}
            title="Click to filter to recent technical exits"
          >
            {/* Row 1: Title (left) + Badge pill (right) */}
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
                Recent Exits
              </span>
              <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Closed
              </span>
            </div>

            {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
            <div className="flex items-baseline justify-between gap-1 leading-none">
              <span className="text-[15px] sm:text-[20px] font-bold text-[#f23645] tabular-nums tracking-tight shrink-0">
                {signalsData.summary.totalRecentExits} <span className="text-[11px] sm:text-xs font-normal text-[#787b86]">Exits</span>
              </span>
              <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
                Technical Exits
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MACRO MODE (Canonical tv-kpi-card 4-grid)
  // ══════════════════════════════════════════════════════════════════════════
  if (!marketSummary) return null;

  const totalStocks = marketSummary.totalGainers + marketSummary.totalLosers || 1;
  const gainersPct = (marketSummary.totalGainers / totalStocks) * 100;

  const turnoverDisplay =
    marketSummary.totalTurnover >= 1_000_000_000_000
      ? `${(marketSummary.totalTurnover / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tn`
      : `${(marketSummary.totalTurnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn`;

  return (
    <div className="w-full select-none font-sans shrink-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Total Turnover */}
        <div className="tv-kpi-card w-full">
          {/* Row 1: Title (left) + Badge pill (right) */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
              Total Turnover
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700">
              EGX Market
            </span>
          </div>

          {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
              {turnoverDisplay} <span className="text-[11px] sm:text-xs font-normal text-[#787b86]">EGP</span>
            </span>
            <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
              Traded Volume
            </span>
          </div>
        </div>

        {/* Card 2: Top Performer */}
        <div
          onClick={() => onSelectSector?.(marketSummary.topSector)}
          className="tv-kpi-card w-full cursor-pointer hover:border-[#089981]/50 transition-colors"
          title={`Inspect ${marketSummary.topSector}`}
        >
          {/* Row 1: Title (left) + Badge pill (right) */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
              Top {groupLabel}
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +{marketSummary.topSectorReturn.toFixed(1)}%
            </span>
          </div>

          {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[14px] sm:text-[18px] font-bold text-white truncate tracking-tight shrink-0 max-w-[150px] sm:max-w-[180px]">
              {marketSummary.topSector}
            </span>
            <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-[#089981]">
              Leading
            </span>
          </div>
        </div>

        {/* Card 3: Laggard Sector */}
        <div
          onClick={() => onSelectSector?.(marketSummary.laggardSector)}
          className="tv-kpi-card w-full cursor-pointer hover:border-[#f23645]/50 transition-colors"
          title={`Inspect ${marketSummary.laggardSector}`}
        >
          {/* Row 1: Title (left) + Badge pill (right) */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
              Laggard {groupLabel}
            </span>
            <span className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
              marketSummary.laggardSectorReturn >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {marketSummary.laggardSectorReturn > 0 ? '+' : ''}{marketSummary.laggardSectorReturn.toFixed(1)}%
            </span>
          </div>

          {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[14px] sm:text-[18px] font-bold text-white truncate tracking-tight shrink-0 max-w-[150px] sm:max-w-[180px]">
              {marketSummary.laggardSector}
            </span>
            <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-[#f23645]">
              Lagging
            </span>
          </div>
        </div>

        {/* Card 4: Market Breadth */}
        <div className="tv-kpi-card w-full">
          {/* Row 1: Title (left) + Badge pill (right) */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight">
              Market Breadth
            </span>
            <span className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
              gainersPct >= 50
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {gainersPct.toFixed(0)}% Bullish
            </span>
          </div>

          {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
              <span className="text-[#089981]">{marketSummary.totalGainers}</span>
              <span className="text-[#787b86] text-xs font-normal mx-1">/</span>
              <span className="text-[#f23645]">{marketSummary.totalLosers}</span>
            </span>
            <span className="text-[10px] sm:text-[11px] truncate max-w-[80px] sm:max-w-[130px] text-right font-medium leading-none text-cold-gray-450">
              Adv · Dec Split
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import type { SectorsPerformanceResponse, SectorStrategySignalsResponse, SectorPerformanceItem } from '@/lib/sectors-math';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  LogOut,
  Layers,
  Compass,
} from '@/components/ui/icon-library';

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

    return (
      <div className="w-full bg-white/[0.02] border border-plt-border-soft/60 rounded-xl p-2.5 px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 text-xs select-none font-sans shrink-0">
        {/* 1. Strategy Cumulative ROI & Avg Hold */}
        <div className="flex items-center gap-2.5 min-w-[165px]">
          <div className="w-7 h-7 rounded-lg bg-plt-profit/10 border border-plt-profit/20 flex items-center justify-center text-plt-profit shrink-0">
            <TrendingUp size={14} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Cumulative ROI</span>
              {signalsData.summary.winRate !== undefined && signalsData.summary.winRate > 0 && (
                <span className="text-[9px] font-semibold text-plt-profit bg-plt-profit/10 px-1 py-0.2 rounded border border-plt-profit/20">
                  {signalsData.summary.winRate.toFixed(0)}% Win
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`font-bold text-sm tabular-nums ${signalsData.summary.cumulativeRoi !== undefined && signalsData.summary.cumulativeRoi >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                {signalsData.summary.cumulativeRoi !== undefined && signalsData.summary.cumulativeRoi > 0 ? '+' : ''}
                {signalsData.summary.cumulativeRoi !== undefined ? signalsData.summary.cumulativeRoi.toFixed(1) : '0.0'}%
              </span>
              {signalsData.summary.avgBarsPerTrade !== undefined && signalsData.summary.avgBarsPerTrade > 0 && (
                <span className="text-[10px] text-plt-muted tabular-nums font-medium bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]" title="Average holding period per trade">
                  Avg. {signalsData.summary.avgBarsPerTrade.toFixed(1)} b
                </span>
              )}
              {signalsData.summary.avgMae !== undefined && signalsData.summary.avgMae !== 0 && (
                <span className="text-[10px] text-rose-400/90 tabular-nums font-medium bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20" title="Average Max Adverse Excursion (Intra-trade drawdown risk)">
                  MAE {signalsData.summary.avgMae.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:block h-6 w-px bg-plt-border-soft/60" />

        {/* 2. Alpha Breadth (Positive vs Negative Alpha) Button */}
        <div
          className={`flex items-center gap-2.5 min-w-[195px] p-1.5 px-2.5 rounded-xl border transition-all ${
            activeStrategyFilter === 'ALPHA_POSITIVE'
              ? 'bg-plt-profit/15 border-plt-profit/80 ring-2 ring-plt-profit/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : activeStrategyFilter === 'ALPHA_NEGATIVE'
              ? 'bg-plt-risk/15 border-plt-risk/80 ring-2 ring-plt-risk/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : 'bg-transparent border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <button
            type="button"
            onClick={() => handleToggle(activeStrategyFilter === 'ALPHA_POSITIVE' ? 'ALL' : 'ALPHA_POSITIVE')}
            className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 cursor-pointer hover:scale-105 transition-transform"
            title="Filter to all Positive Alpha tickers"
          >
            <Compass size={14} />
          </button>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => handleToggle(activeStrategyFilter === 'ALPHA_POSITIVE' ? 'ALL' : 'ALPHA_POSITIVE')}
                className="text-[10px] uppercase tracking-wider text-plt-muted hover:text-plt-text font-semibold cursor-pointer text-left truncate"
                title="Strategy Alpha Breadth (Alpha = Strategy ROI - Buy & Hold)"
              >
                Alpha Breadth
              </button>

              <div className="flex items-center gap-1 shrink-0">
                {/* Positive Alpha Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle('ALPHA_POSITIVE');
                  }}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums transition-all cursor-pointer border ${
                    activeStrategyFilter === 'ALPHA_POSITIVE'
                      ? 'bg-plt-profit text-black border-plt-profit shadow-xs scale-105'
                      : 'text-plt-profit bg-plt-profit/10 border-plt-profit/25 hover:bg-plt-profit/25'
                  }`}
                  title={`Filter to only ${alphaStats.positiveCount} Positive Alpha tickers`}
                >
                  +{alphaStats.positiveCount} α
                </button>

                {/* Negative Alpha Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle('ALPHA_NEGATIVE');
                  }}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums transition-all cursor-pointer border ${
                    activeStrategyFilter === 'ALPHA_NEGATIVE'
                      ? 'bg-plt-risk text-white border-plt-risk shadow-xs scale-105'
                      : 'text-plt-risk bg-plt-risk/10 border-plt-risk/25 hover:bg-plt-risk/25'
                  }`}
                  title={`Filter to only ${alphaStats.negativeCount} Negative Alpha tickers`}
                >
                  -{alphaStats.negativeCount} α
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => handleToggle(activeStrategyFilter === 'ALPHA_POSITIVE' ? 'ALL' : 'ALPHA_POSITIVE')}
                className="font-bold text-sm text-emerald-400 hover:text-white tabular-nums cursor-pointer text-left"
                title="Click to toggle Positive Alpha filter"
              >
                {alphaStats.positiveCount} <span className="text-[10px] font-normal text-plt-muted">Outperforming</span>
              </button>

              {alphaStats.total > 0 && (
                <div
                  className="w-14 h-1.5 rounded-full bg-plt-risk/40 overflow-hidden flex shrink-0 cursor-pointer border border-white/10"
                  onClick={() => handleToggle(activeStrategyFilter === 'ALPHA_POSITIVE' ? 'ALPHA_NEGATIVE' : 'ALPHA_POSITIVE')}
                  title="Click to toggle Positive/Negative Alpha filter"
                >
                  <div
                    className="h-full bg-plt-profit transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (alphaStats.positiveCount / alphaStats.total) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:block h-6 w-px bg-plt-border-soft/60" />

        {/* 2. Active Longs Button with Clickable W / L Breadth Filter */}
        <div
          className={`flex items-center gap-2.5 min-w-[195px] p-1.5 px-2.5 rounded-xl border transition-all ${
            activeStrategyFilter === 'LONG_ACTIVE'
              ? 'bg-plt-info/20 border-plt-info ring-2 ring-plt-info/60 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
              : activeStrategyFilter === 'LONG_WINNERS'
              ? 'bg-plt-profit/15 border-plt-profit/80 ring-2 ring-plt-profit/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : activeStrategyFilter === 'LONG_LOSERS'
              ? 'bg-plt-risk/15 border-plt-risk/80 ring-2 ring-plt-risk/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : 'bg-transparent border-transparent hover:bg-white/[0.04]'
          }`}
        >
          <button
            type="button"
            onClick={() => handleToggle('LONG_ACTIVE')}
            className="w-7 h-7 rounded-lg bg-plt-info/10 border border-plt-info/20 flex items-center justify-center text-plt-info shrink-0 cursor-pointer hover:scale-105 transition-transform"
            title="Filter to all Active Longs"
          >
            <Zap size={14} />
          </button>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => handleToggle('LONG_ACTIVE')}
                className="text-[10px] uppercase tracking-wider text-plt-muted hover:text-plt-text font-semibold cursor-pointer text-left truncate"
                title="Filter to all Active Long positions"
              >
                Active Longs
              </button>

              {signalsData.summary.activeLongsWinning !== undefined && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* Winning Longs Filter Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle('LONG_WINNERS');
                    }}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums transition-all cursor-pointer border ${
                      activeStrategyFilter === 'LONG_WINNERS'
                        ? 'bg-plt-profit text-black border-plt-profit shadow-xs scale-105'
                        : 'text-plt-profit bg-plt-profit/10 border-plt-profit/25 hover:bg-plt-profit/25'
                    }`}
                    title={`Filter to only ${signalsData.summary.activeLongsWinning} Winning positions`}
                  >
                    {signalsData.summary.activeLongsWinning}W
                  </button>

                  {/* Losing Longs Filter Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle('LONG_LOSERS');
                    }}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums transition-all cursor-pointer border ${
                      activeStrategyFilter === 'LONG_LOSERS'
                        ? 'bg-plt-risk text-white border-plt-risk shadow-xs scale-105'
                        : 'text-plt-risk bg-plt-risk/10 border-plt-risk/25 hover:bg-plt-risk/25'
                    }`}
                    title={`Filter to only ${signalsData.summary.activeLongsLosing || 0} Losing positions`}
                  >
                    {signalsData.summary.activeLongsLosing || 0}L
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => handleToggle('LONG_ACTIVE')}
                className="font-bold text-sm text-plt-info hover:text-white tabular-nums cursor-pointer text-left"
                title="Filter to all Active Longs"
              >
                {signalsData.summary.totalActiveLongs} <span className="text-[10px] font-normal text-plt-muted">Stocks</span>
              </button>

              {signalsData.summary.totalActiveLongs > 0 && signalsData.summary.activeLongsWinning !== undefined && (
                <div
                  className="w-14 h-1.5 rounded-full bg-plt-risk/40 overflow-hidden flex shrink-0 cursor-pointer border border-white/10"
                  onClick={() => handleToggle(activeStrategyFilter === 'LONG_WINNERS' ? 'LONG_LOSERS' : 'LONG_WINNERS')}
                  title="Click to toggle Winner/Loser filter"
                >
                  <div
                    className="h-full bg-plt-profit transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (signalsData.summary.activeLongsWinning / signalsData.summary.totalActiveLongs) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:block h-6 w-px bg-plt-border-soft/60" />

        {/* 3. Fresh Buys Button */}
        <button
          type="button"
          onClick={() => handleToggle('BUY_FRESH')}
          className={`flex items-center gap-2.5 min-w-[130px] p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer text-left ${
            activeStrategyFilter === 'BUY_FRESH'
              ? 'bg-plt-profit/20 border-plt-profit ring-2 ring-plt-profit/60 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]'
              : 'bg-transparent border-transparent hover:bg-white/[0.04]'
          }`}
          title="Filter chart to only Fresh Buy signals"
        >
          <div className="w-7 h-7 rounded-lg bg-plt-profit/10 border border-plt-profit/20 flex items-center justify-center text-plt-profit shrink-0">
            <Target size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Fresh Buys</span>
            <span className="font-bold text-sm text-plt-profit tabular-nums mt-0.5">
              {signalsData.summary.totalFreshBuys} <span className="text-[10px] font-normal text-plt-muted">New</span>
            </span>
          </div>
        </button>

        <div className="hidden md:block h-6 w-px bg-plt-border-soft/60" />

        {/* Recent Exits Button */}
        <button
          type="button"
          onClick={() => handleToggle('EXIT_RECENT')}
          className={`flex items-center gap-2.5 min-w-[140px] p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer text-left ${
            activeStrategyFilter === 'EXIT_RECENT'
              ? 'bg-plt-risk/20 border-plt-risk ring-2 ring-plt-risk/60 shadow-[0_0_15px_rgba(239,68,68,0.25)] scale-[1.02]'
              : 'bg-transparent border-transparent hover:bg-white/[0.04]'
          }`}
          title="Filter chart to only Recent Exits"
        >
          <div className="w-7 h-7 rounded-lg bg-plt-risk/10 border border-plt-risk/20 flex items-center justify-center text-plt-risk shrink-0">
            <LogOut size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Recent Exits</span>
            <span className="font-bold text-sm text-plt-risk tabular-nums">
              {signalsData.summary.totalRecentExits} <span className="text-[10px] font-normal text-plt-muted">Closed</span>
            </span>
          </div>
        </button>

        <div className="hidden md:block h-6 w-px bg-plt-border-soft/60" />

        {/* Strategy Universe (Show All) Button */}
        <button
          type="button"
          onClick={() => onSetStrategyFilter?.('ALL')}
          className={`flex items-center gap-2.5 min-w-[140px] p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer text-left ${
            activeStrategyFilter === 'ALL'
              ? 'bg-white/[0.08] border-white/40 ring-2 ring-white/30 scale-[1.02]'
              : 'bg-transparent border-transparent hover:bg-white/[0.04]'
          }`}
          title="Show all scanned stocks"
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-plt-text shrink-0">
            <Layers size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Universe Scanned</span>
            <span className="font-bold text-sm text-white tabular-nums">
              {signalsData.summary.totalScanned} <span className="text-[10px] font-normal text-plt-muted">Tickers</span>
            </span>
          </div>
        </button>
      </div>
    );
  }

  if (!marketSummary) return null;

  const totalStocks = marketSummary.totalGainers + marketSummary.totalLosers || 1;
  const gainersPct = (marketSummary.totalGainers / totalStocks) * 100;
  const losersPct = (marketSummary.totalLosers / totalStocks) * 100;

  return (
    <div className="w-full bg-white/[0.02] border border-plt-border-soft/60 rounded-xl p-2.5 px-4 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 text-xs select-none font-sans shrink-0">
      {/* 1. Market Turnover */}
      <div className="flex items-center gap-2.5 min-w-[150px]">
        <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-plt-text shrink-0">
          <Activity size={14} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Total Turnover</span>
          <span className="font-bold text-sm text-white tabular-nums">
            {marketSummary.totalTurnover >= 1_000_000_000_000
              ? `${(marketSummary.totalTurnover / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tn EGP`
              : `${(marketSummary.totalTurnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`}
          </span>
        </div>
      </div>

      <div className="hidden lg:block h-6 w-px bg-plt-border-soft/60" />

      {/* 2. Top Performer */}
      <div
        onClick={() => onSelectSector?.(marketSummary.topSector)}
        className="flex items-center gap-2.5 min-w-[170px] max-w-[240px] cursor-pointer hover:opacity-80 transition group"
        title={`Inspect ${marketSummary.topSector}`}
      >
        <div className="w-7 h-7 rounded-lg bg-plt-profit/10 border border-plt-profit/20 flex items-center justify-center text-plt-profit shrink-0">
          <TrendingUp size={14} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Top {groupLabel}</span>
            <span className="text-xs font-bold text-plt-profit tabular-nums">
              +{marketSummary.topSectorReturn.toFixed(1)}%
            </span>
          </div>
          <span className="font-semibold text-xs text-plt-text truncate group-hover:text-white transition-colors">
            {marketSummary.topSector}
          </span>
        </div>
      </div>

      <div className="hidden lg:block h-6 w-px bg-plt-border-soft/60" />

      {/* 3. Laggard Performer */}
      <div
        onClick={() => onSelectSector?.(marketSummary.laggardSector)}
        className="flex items-center gap-2.5 min-w-[170px] max-w-[240px] cursor-pointer hover:opacity-80 transition group"
        title={`Inspect ${marketSummary.laggardSector}`}
      >
        <div className="w-7 h-7 rounded-lg bg-plt-risk/10 border border-plt-risk/20 flex items-center justify-center text-plt-risk shrink-0">
          <TrendingDown size={14} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-plt-muted font-semibold">Laggard {groupLabel}</span>
            <span className={`text-xs font-bold tabular-nums ${marketSummary.laggardSectorReturn >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
              {marketSummary.laggardSectorReturn > 0 ? '+' : ''}{marketSummary.laggardSectorReturn.toFixed(1)}%
            </span>
          </div>
          <span className="font-semibold text-xs text-plt-text truncate group-hover:text-white transition-colors">
            {marketSummary.laggardSector}
          </span>
        </div>
      </div>

      <div className="hidden lg:block h-6 w-px bg-plt-border-soft/60" />

      {/* 4. Market Breadth with Thicker Visual Progress Bar (Far Right) */}
      <div className="flex items-center gap-3 min-w-[200px] lg:min-w-[220px]">
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-1">
            <span className="text-plt-profit font-bold">{marketSummary.totalGainers} Adv</span>
            <span className="text-plt-muted text-[9px] font-normal">{gainersPct.toFixed(0)}% Bullish</span>
            <span className="text-plt-risk font-bold">{marketSummary.totalLosers} Dec</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white/[0.08] p-0.5 overflow-hidden flex gap-0.5">
            <div
              style={{ width: `${gainersPct}%` }}
              className="h-full bg-plt-profit transition-all duration-300 rounded-l-full"
            />
            <div
              style={{ width: `${losersPct}%` }}
              className="h-full bg-plt-risk transition-all duration-300 rounded-r-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

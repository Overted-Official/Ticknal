"use client";

import React, { useState, useMemo } from 'react';
import type { SectorPerformanceItem, TickerStrategySignalState, StockPerformanceItem } from '@/lib/sectors-math';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Flame,
  Scale,
  LineChart,
  Search,
  ArrowUpDown,
  X,
  Info,
} from '@/components/ui/icon-library';

interface SectorInspectorProps {
  sector: SectorPerformanceItem | null;
  selectedTicker?: string | null;
  granularity?: 'sector' | 'industryGroup' | 'industry' | 'ticker';
  analysisMode?: 'macro' | 'strategy';
  signalsMap?: Record<string, TickerStrategySignalState>;
  sectorSummary?: Record<string, any>;
  onSelectTicker: (symbol: string) => void;
  onOpenTickerChart?: (symbol: string) => void;
}

function formatTurnover(val: number): string {
  if (!val || isNaN(val)) return '0.00 EGP';
  const absVal = Math.abs(val);
  if (absVal >= 1_000_000_000_000) {
    return `${(val / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tn EGP`;
  }
  if (absVal >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`;
  }
  if (absVal >= 1_000_000) {
    return `${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EGP`;
  }
  return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

function StockLogo({
  logoUrl,
  symbol,
}: {
  logoUrl?: string | null;
  symbol: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div className="w-7 h-7 rounded-lg bg-plt-card border border-plt-border-soft flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-xs">
        <img
          src={logoUrl}
          alt={symbol}
          className="ticker-logo-image"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-[10px] font-bold text-plt-text shrink-0 shadow-xs select-none">
      {symbol.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function SectorInspector({
  sector,
  selectedTicker,
  granularity = 'sector',
  analysisMode = 'macro',
  signalsMap,
  sectorSummary,
  onSelectTicker,
  onOpenTickerChart,
}: SectorInspectorProps) {
  const [inSectorSearch, setInSectorSearch] = useState('');
  // Default sort is 'return' (highest gainers / highest strategy ROI first)
  const [sortBy, setSortBy] = useState<'return' | 'turnover' | 'symbol'>('return');

  const groupLabel =
    granularity === 'ticker'
      ? 'stock'
      : granularity === 'industryGroup'
      ? 'industry group'
      : granularity === 'industry'
      ? 'industry'
      : 'sector';

  // Compute Sector Strategy Signal Statistics
  const sectorStrategyStats = useMemo(() => {
    if (!sector?.stocks || !signalsMap) return { avgRoi: 0, activeWins: 0, activeLosses: 0, buys: 0, longs: 0, exits: 0, total: 0 };
    let sumRoi = 0;
    let buys = 0;
    let longs = 0;
    let exits = 0;
    let activeWins = 0;
    let activeLosses = 0;

    for (const s of sector.stocks) {
      const sig = signalsMap[s.symbol];
      if (sig) {
        if (sig.sysRoi !== undefined) {
          sumRoi += sig.sysRoi;
        }
        if (sig.status === 'BUY_FRESH') {
          buys++;
          if ((sig.tradeReturnPct ?? 0) > 0) activeWins++;
          else if ((sig.tradeReturnPct ?? 0) < 0) activeLosses++;
        } else if (sig.status === 'LONG_ACTIVE') {
          longs++;
          if ((sig.tradeReturnPct ?? 0) > 0) activeWins++;
          else if ((sig.tradeReturnPct ?? 0) < 0) activeLosses++;
        } else if (sig.status === 'EXIT_RECENT') {
          exits++;
        }
      }
    }
    const avgRoi = sector.stocks.length > 0 ? sumRoi / sector.stocks.length : 0;
    return { avgRoi, activeWins, activeLosses, buys, longs, exits, total: sector.stocks.length };
  }, [sector?.stocks, signalsMap]);

  // Find Primary Strategy Alpha Driver stock (highest Strategy Alpha = sysRoi - returnPct in this sector)
  const topStrategyDriver = useMemo(() => {
    if (!sector?.stocks || !signalsMap) return null;
    let bestStock: StockPerformanceItem | null = null;
    let bestAlpha = -Infinity;
    let bestRoi = -Infinity;
    for (const s of sector.stocks) {
      const roi = signalsMap[s.symbol]?.sysRoi ?? -Infinity;
      const alpha = roi - s.returnPct;
      if (alpha > bestAlpha) {
        bestAlpha = alpha;
        bestRoi = roi;
        bestStock = s;
      }
    }
    return bestStock && bestAlpha > -Infinity
      ? { stock: bestStock, alpha: bestAlpha, roi: bestRoi, signalState: signalsMap[bestStock.symbol] }
      : null;
  }, [sector?.stocks, signalsMap]);

  // Filter & Sort Constituent Stocks
  const filteredStocks = useMemo(() => {
    if (!sector?.stocks) return [];
    let list = [...sector.stocks];

    if (inSectorSearch.trim()) {
      const q = inSectorSearch.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.companyName.toLowerCase().includes(q)
      );
    }

    if (analysisMode === 'strategy' && signalsMap) {
      if (sortBy === 'return') {
        // Sort descending by Strategy Alpha (Strategy ROI - B&H ROI)
        list.sort((a, b) => {
          const roiA = signalsMap[a.symbol]?.sysRoi ?? -Infinity;
          const roiB = signalsMap[b.symbol]?.sysRoi ?? -Infinity;
          const alphaA = roiA - a.returnPct;
          const alphaB = roiB - b.returnPct;
          return alphaB - alphaA;
        });
      } else if (sortBy === 'symbol') {
        list.sort((a, b) => a.companyName.localeCompare(b.companyName));
      } else {
        // Sort by trades count
        list.sort((a, b) => (signalsMap[b.symbol]?.tradesCount ?? 0) - (signalsMap[a.symbol]?.tradesCount ?? 0));
      }
    } else {
      if (sortBy === 'return') {
        list.sort((a, b) => b.returnPct - a.returnPct);
      } else if (sortBy === 'symbol') {
        list.sort((a, b) => a.companyName.localeCompare(b.companyName));
      } else {
        list.sort((a, b) => b.turnover - a.turnover);
      }
    }

    return list;
  }, [sector?.stocks, inSectorSearch, sortBy, analysisMode, signalsMap]);

  // Find top driver stock details for macro mode
  const topDriverStock = useMemo(() => {
    if (!sector?.stocks || !sector.topDriver) return null;
    return sector.stocks.find((s) => s.symbol === sector.topDriver?.symbol) || null;
  }, [sector?.stocks, sector?.topDriver]);

  if (!sector) {
    return (
      <div className="empty-state h-full flex flex-col items-center justify-center text-plt-faint p-6 text-center">
        <Scale className="w-8 h-8 mb-2 opacity-40 text-plt-muted" />
        <p className="text-xs">Select any {groupLabel} or stock from the heatmap to view its performance attribution</p>
      </div>
    );
  }

  const regimeColors = {
    Leading: 'bg-plt-profit/10 text-plt-profit border-plt-profit/20',
    Improving: 'bg-plt-info/10 text-plt-info border-plt-info/20',
    Weakening: 'bg-plt-warning/10 text-plt-warning border-plt-warning/20',
    Lagging: 'bg-plt-risk/10 text-plt-risk border-plt-risk/20',
  };

  const renderRegimeIcon = (regime: string) => {
    switch (regime) {
      case 'Leading':
        return <TrendingUp className="w-3.5 h-3.5 text-plt-profit" />;
      case 'Improving':
        return <Zap className="w-3.5 h-3.5 text-plt-info" />;
      case 'Weakening':
        return <AlertTriangle className="w-3.5 h-3.5 text-plt-warning" />;
      case 'Lagging':
      default:
        return <TrendingDown className="w-3.5 h-3.5 text-plt-risk" />;
    }
  };

  const sectorCumulativeRoi = sectorStrategyStats.avgRoi;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden select-none font-sans">
      {/* 1. Sector Header & Rotation Regime / Strategy Posture */}
      <div className="flex items-start justify-between gap-2 shrink-0 relative z-30">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="section-title truncate">{sector.sector}</h2>
            <span className="badge badge-muted shrink-0">
              {sector.stockCount} {sector.stockCount === 1 ? 'stock' : 'stocks'}
            </span>
          </div>
          {analysisMode === 'strategy' ? (
            <p className="text-xs text-plt-muted mt-0.5 tabular-nums">
              Strategy Universe: {sector.stockCount} scanned · Sector ROI:{' '}
              <span className={`font-bold ${sectorCumulativeRoi >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                {sectorCumulativeRoi > 0 ? '+' : ''}{sectorCumulativeRoi.toFixed(1)}%
              </span>
            </p>
          ) : (
            <p className="text-xs text-plt-muted mt-0.5 tabular-nums">
              Turnover: {formatTurnover(sector.totalTurnover)} ({sector.turnoverShare.toFixed(1)}% of market)
            </p>
          )}
        </div>

        {analysisMode === 'strategy' ? (
          <div className="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 bg-plt-info/10 text-plt-info border-plt-info/30 shrink-0">
            <Zap className="w-3.5 h-3.5 text-plt-info" />
            <span>
              {sectorStrategyStats.activeWins}W /{' '}
              {sectorStrategyStats.activeLosses}L Active
            </span>
          </div>
        ) : (
          <div className="relative group/tooltip flex items-center shrink-0">
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 cursor-help ${regimeColors[sector.rotationRegime]}`}>
              {renderRegimeIcon(sector.rotationRegime)}
              <span>{sector.rotationRegime}</span>
            </div>
            <div className="absolute right-0 top-full mt-2 hidden group-hover/tooltip:block w-56 p-2.5 rounded-xl bg-plt-raised/95 backdrop-blur-xl border border-plt-border text-xs text-plt-text leading-relaxed shadow-2xl z-50 pointer-events-none">
              <div className="font-semibold text-plt-text mb-1 tracking-wider text-[10px] uppercase">Sector Rotation Regime</div>
              <div className="text-plt-profit flex items-center gap-1.5 py-0.5"><TrendingUp size={13} /> Leading: Beating EGX30 & accelerating</div>
              <div className="text-plt-warning flex items-center gap-1.5 py-0.5"><AlertTriangle size={13} /> Weakening: Momentum decelerating</div>
              <div className="text-plt-info flex items-center gap-1.5 py-0.5"><Zap size={13} /> Improving: Early accumulation turnaround</div>
              <div className="text-plt-risk flex items-center gap-1.5 py-0.5"><TrendingDown size={13} /> Lagging: Underperforming market</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Performance KPI Matrix (Switches between Macro & Strategy Mode) */}
      {analysisMode === 'strategy' ? (
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {/* Active Longs */}
          <div className="py-2 px-2.5 rounded-lg bg-plt-info/10 border border-plt-info/30 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-plt-info font-semibold flex items-center gap-1">
              Active Longs
            </span>
            <span className="text-base font-bold tabular-nums text-plt-info mt-0.5">
              {sectorStrategyStats.longs} <span className="text-[10px] font-normal opacity-80">Held</span>
            </span>
          </div>

          {/* Fresh Buys */}
          <div className="py-2 px-2.5 rounded-lg bg-plt-profit/10 border border-plt-profit/30 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-plt-profit font-semibold flex items-center gap-1">
              Fresh Buys
            </span>
            <span className="text-base font-bold tabular-nums text-plt-profit mt-0.5">
              {sectorStrategyStats.buys} <span className="text-[10px] font-normal opacity-80">New</span>
            </span>
          </div>

          {/* Recent Exits */}
          <div className="py-2 px-2.5 rounded-lg bg-plt-risk/10 border border-plt-risk/30 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-plt-risk font-semibold flex items-center gap-1">
              Recent Exits
            </span>
            <span className="text-base font-bold tabular-nums text-plt-risk mt-0.5">
              {sectorStrategyStats.exits} <span className="text-[10px] font-normal opacity-80">Closed</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {/* Weighted ROI */}
          <div className="py-2 px-2.5 rounded-lg bg-white/[0.02] flex flex-col justify-between relative group/kpi">
            <div className="flex items-center justify-between">
              <span className="kpi-title flex items-center gap-1">
                Weighted ROI
                <Info size={11} className="text-plt-muted hover:text-plt-text cursor-help" />
              </span>
            </div>
            <span className={`text-base font-bold tabular-nums mt-0.5 ${sector.turnoverWeightedReturn >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
              {sector.turnoverWeightedReturn > 0 ? '+' : ''}{sector.turnoverWeightedReturn.toFixed(2)}%
            </span>
            <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/kpi:block w-52 p-2 rounded-lg bg-plt-raised/98 border border-plt-border-strong text-[10px] text-plt-text leading-tight shadow-xl z-50 pointer-events-none">
              Total net return weighted by each constituent stock&apos;s traded capital volume (turnover).
            </div>
          </div>

          {/* Alpha vs EGX30 */}
          <div className="py-2 px-2.5 rounded-lg bg-white/[0.02] flex flex-col justify-between relative group/kpi">
            <div className="flex items-center justify-between">
              <span className="kpi-title flex items-center gap-1">
                Alpha (α)
                <Info size={11} className="text-plt-muted hover:text-plt-text cursor-help" />
              </span>
            </div>
            <span className={`text-base font-bold tabular-nums mt-0.5 ${sector.relativeStrengthVsBenchmark >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
              {sector.relativeStrengthVsBenchmark > 0 ? '+' : ''}{sector.relativeStrengthVsBenchmark.toFixed(2)}%
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/kpi:block w-52 p-2 rounded-lg bg-plt-raised/98 border border-plt-border-strong text-[10px] text-plt-text leading-tight shadow-xl z-50 pointer-events-none">
              Excess outperformance of this group relative to the benchmark EGX 30 index.
            </div>
          </div>

          {/* Breadth */}
          <div className="py-2 px-2.5 rounded-lg bg-white/[0.02] flex flex-col justify-between relative group/kpi">
            <div className="flex items-center justify-between">
              <span className="kpi-title flex items-center gap-1">
                Breadth
                <Info size={11} className="text-plt-muted hover:text-plt-text cursor-help" />
              </span>
            </div>
            <span className="text-base font-bold tabular-nums mt-0.5 text-plt-text flex items-center gap-1">
              <span className="text-plt-profit">{sector.gainersCount}W</span>
              <span className="text-plt-faint font-normal">/</span>
              <span className="text-plt-risk">{sector.losersCount}L</span>
            </span>
            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/kpi:block w-52 p-2 rounded-lg bg-plt-raised/98 border border-plt-border-strong text-[10px] text-plt-text leading-tight shadow-xl z-50 pointer-events-none">
              Internal rally participation: Count of advancing Winning stocks (W) vs declining Losing stocks (L).
            </div>
          </div>
        </div>
      )}

      {/* 3. Primary Alpha Driver Card with Logo & Clean Title/Symbol */}
      {analysisMode === 'strategy' ? (
        topStrategyDriver && (
          <div className="p-2.5 rounded-xl bg-plt-profit/5 border border-plt-profit/20 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-plt-profit flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Flame className="w-3.5 h-3.5 text-plt-profit" />
                Primary Strategy Alpha Driver
              </span>
              <span className={`tabular-nums font-bold text-xs ${topStrategyDriver.alpha >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                {topStrategyDriver.alpha > 0 ? '+' : ''}{topStrategyDriver.alpha.toFixed(1)}% Alpha (α)
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <StockLogo logoUrl={topStrategyDriver.stock.logoUrl} symbol={topStrategyDriver.stock.symbol} />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-xs text-white truncate" title={topStrategyDriver.stock.companyName}>
                    {topStrategyDriver.stock.companyName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-plt-muted font-mono font-bold">{topStrategyDriver.stock.symbol}</span>
                    {topStrategyDriver.signalState?.status === 'BUY_FRESH' && (
                      <span className="text-emerald-400 font-bold">· Fresh Buy</span>
                    )}
                    {topStrategyDriver.signalState?.status === 'LONG_ACTIVE' && (
                      <span className="text-cyan-400 font-medium">
                        · Active Long ({topStrategyDriver.signalState.tradeReturnPct ? (topStrategyDriver.signalState.tradeReturnPct > 0 ? '+' : '') + topStrategyDriver.signalState.tradeReturnPct.toFixed(0) + '%' : 'Hold'})
                      </span>
                    )}
                    {topStrategyDriver.signalState?.status === 'EXIT_RECENT' && (
                      <span className="text-rose-400 font-medium">· Recent Exit</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right tabular-nums shrink-0 text-[10px] text-plt-muted">
                <div>Win Rate: <span className="font-bold text-white">{topStrategyDriver.signalState?.winRate !== undefined ? `${topStrategyDriver.signalState.winRate.toFixed(0)}%` : 'N/A'}</span></div>
                <div>
                  {topStrategyDriver.signalState?.tradesCount || 0} Trades
                  {topStrategyDriver.signalState?.maxAdverseExcursion !== undefined && topStrategyDriver.signalState.maxAdverseExcursion !== 0 ? (
                    <span className="text-rose-400/90 font-medium"> · MAE {topStrategyDriver.signalState.maxAdverseExcursion.toFixed(1)}%</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        sector.topDriver && sector.stockCount > 1 && (
          <div className="p-2.5 rounded-xl bg-plt-profit/5 border border-plt-profit/20 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-plt-profit flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Flame className="w-3.5 h-3.5 text-plt-profit" />
                Primary Alpha Driver
              </span>
              <span className="tabular-nums text-plt-profit font-bold text-xs">
                +{sector.topDriver.returnPct.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <StockLogo logoUrl={topDriverStock?.logoUrl} symbol={sector.topDriver.symbol} />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-xs text-white truncate" title={sector.topDriver.companyName}>
                    {sector.topDriver.companyName}
                  </span>
                  <span className="text-[10px] text-plt-muted font-mono font-bold">
                    {sector.topDriver.symbol}
                  </span>
                </div>
              </div>

              {topDriverStock && (
                <div className="text-right tabular-nums shrink-0">
                  <span className="text-[11px] font-semibold text-plt-text">
                    {topDriverStock.turnover >= 1_000_000_000
                      ? `${(topDriverStock.turnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn`
                      : `${(topDriverStock.turnover / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* 4. Ranked Constituent Stocks Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-1">
        {/* In-Sector Search & Sort Bar */}
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-plt-muted">
              <Search size={12} />
            </div>
            <input
              type="text"
              placeholder={`Filter ${sector.stocks.length} constituents...`}
              value={inSectorSearch}
              onChange={(e) => setInSectorSearch(e.target.value)}
              className="h-7 w-full rounded-md bg-plt-raised border border-plt-border pl-7 pr-6 text-[11px] text-plt-text placeholder:text-plt-muted placeholder:text-[11px] placeholder:font-normal focus:border-plt-border-strong focus:outline-none transition-colors leading-none"
            />
            {inSectorSearch && (
              <button
                type="button"
                onClick={() => setInSectorSearch('')}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-plt-muted hover:text-plt-text transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'return' ? 'turnover' : sortBy === 'turnover' ? 'symbol' : 'return')}
              className="h-7 px-2.5 rounded-md bg-plt-raised border border-plt-border text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover hover:border-plt-border-strong flex items-center gap-1.5 transition cursor-pointer"
              title="Change sort order"
            >
              <ArrowUpDown size={11} />
              <span className="capitalize">{analysisMode === 'strategy' && sortBy === 'return' ? 'Alpha (α)' : analysisMode === 'strategy' && sortBy === 'turnover' ? 'Trades' : sortBy}</span>
            </button>
          </div>
        </div>

        {/* Column Headers */}
        <div className="py-1 px-2 flex items-center justify-between border-b border-plt-border/40 text-[10px] font-semibold uppercase tracking-wider text-plt-muted shrink-0">
          <span>Constituent Stock</span>
          <div className="flex items-center gap-4 pr-7">
            <span className="w-14 text-right">{analysisMode === 'strategy' ? 'B&H ROI' : 'Turnover'}</span>
            <span className="w-16 text-right">{analysisMode === 'strategy' ? 'Strat α' : 'Return'}</span>
          </div>
        </div>

        {/* Scrollable Stocks List */}
        <div className="flex-1 overflow-y-auto divide-y divide-plt-border/15 custom-scrollbar pt-1">
          {filteredStocks.length === 0 ? (
            <div className="p-4 text-center text-xs text-plt-muted">
              No matching stocks in this sector
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const isSelected = selectedTicker === stock.symbol;
              const sig = signalsMap?.[stock.symbol];
              const stratRoi = sig?.sysRoi ?? 0;
              const alpha = stratRoi - stock.returnPct;

              return (
                <div
                  key={stock.symbol}
                  onClick={() => onSelectTicker(stock.symbol)}
                  className={`py-2 px-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs group ${
                    isSelected ? 'bg-white/[0.08] ring-1 ring-white/20' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Left: Logo + Company Name as Title + Ticker Symbol Smaller Below */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StockLogo logoUrl={stock.logoUrl} symbol={stock.symbol} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-plt-text group-hover:text-white transition-colors truncate max-w-40" title={stock.companyName}>
                        {stock.companyName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-plt-muted">{stock.symbol}</span>
                        {analysisMode === 'strategy' && sig && (
                          sig.status === 'BUY_FRESH' ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-400 text-black animate-pulse shadow-xs">
                              Buy
                            </span>
                          ) : sig.status === 'LONG_ACTIVE' ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-500/20 border border-cyan-400/50 text-cyan-300">
                              Long {sig.tradeReturnPct !== undefined ? `(${sig.tradeReturnPct > 0 ? '+' : ''}${sig.tradeReturnPct.toFixed(1)}%)` : ''}
                            </span>
                          ) : sig.status === 'EXIT_RECENT' ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/20 border border-rose-400/50 text-rose-300">
                              Exit {sig.tradeReturnPct !== undefined ? `(${sig.tradeReturnPct > 0 ? '+' : ''}${sig.tradeReturnPct.toFixed(1)}%)` : ''}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-normal bg-white/[0.04] text-zinc-500">
                              Flat
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: B&H ROI + Strategy Alpha + Chart Button */}
                  <div className="flex items-center gap-2.5 tabular-nums shrink-0">
                    {analysisMode === 'strategy' ? (
                      <div className="flex items-center gap-3">
                        {/* Buy & Hold ROI */}
                        <span
                          className={`w-14 text-right font-medium text-xs ${
                            stock.returnPct >= 0 ? 'text-plt-profit/75' : 'text-plt-risk/75'
                          }`}
                          title={`Buy & Hold Return: ${stock.returnPct > 0 ? '+' : ''}${stock.returnPct.toFixed(2)}%`}
                        >
                          {stock.returnPct > 0 ? '+' : ''}
                          {stock.returnPct.toFixed(1)}%
                        </span>

                        {/* Strategy Alpha (Strategy ROI - B&H ROI) */}
                        <span
                          className={`w-16 text-right font-bold text-xs ${
                            alpha >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                          }`}
                          title={`Strategy Alpha (α): ${alpha > 0 ? '+' : ''}${alpha.toFixed(2)}%\nStrategy ROI: ${stratRoi > 0 ? '+' : ''}${stratRoi.toFixed(1)}%\nBuy & Hold ROI: ${stock.returnPct > 0 ? '+' : ''}${stock.returnPct.toFixed(1)}%`}
                        >
                          {alpha > 0 ? '+' : ''}
                          {alpha.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="text-right min-w-[70px]">
                          <div className="text-xs font-semibold text-plt-text">
                            {stock.turnover >= 1_000_000_000
                              ? `${(stock.turnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn`
                              : `${(stock.turnover / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`}
                          </div>
                        </div>

                        <span
                          className={`w-14 text-right font-semibold text-xs ${
                            stock.returnPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                          }`}
                        >
                          {stock.returnPct > 0 ? '+' : ''}
                          {stock.returnPct.toFixed(2)}%
                        </span>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTickerChart?.(stock.symbol);
                      }}
                      className="p-1.5 rounded-lg text-plt-muted hover:text-plt-text hover:bg-white/[0.08] active:bg-white/[0.12] transition cursor-pointer"
                      title={`Open ${stock.symbol} Candlestick Chart`}
                    >
                      <LineChart size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

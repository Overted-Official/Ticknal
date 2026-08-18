"use client";

import React from 'react';
import type { SectorPerformanceItem } from '@/app/api/sectors/performance/route';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  Flame,
  Scale,
  LineChart,
  Info,
} from 'lucide-react';

import type { TickerStrategySignalState } from '@/app/api/sectors/signals/route';

interface SectorInspectorProps {
  sector: SectorPerformanceItem | null;
  selectedTicker?: string | null;
  analysisMode?: 'macro' | 'strategy';
  signalsMap?: Record<string, TickerStrategySignalState>;
  onSelectTicker: (symbol: string) => void;
  onOpenTickerChart?: (symbol: string) => void;
}

export default function SectorInspector({
  sector,
  selectedTicker,
  analysisMode = 'macro',
  signalsMap,
  onSelectTicker,
  onOpenTickerChart,
}: SectorInspectorProps) {
  if (!sector) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-white/30 border border-white/[0.08] rounded-xl bg-zinc-950/40">
        <Scale className="w-8 h-8 mb-2 opacity-40 text-plt-orange" />
        <p className="text-xs">Select any sector or stock from the heatmap to view its performance attribution</p>
      </div>
    );
  }

  const regimeColors = {
    Leading: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Improving: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Weakening: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Lagging: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  const renderRegimeIcon = (regime: string) => {
    switch (regime) {
      case 'Leading':
        return <TrendingUp className="w-3 h-3 text-emerald-400" />;
      case 'Improving':
        return <Zap className="w-3 h-3 text-cyan-400" />;
      case 'Weakening':
        return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'Lagging':
      default:
        return <TrendingDown className="w-3 h-3 text-rose-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3.5 bg-zinc-950/60 border border-white/[0.08] rounded-xl overflow-hidden">
      {/* 1. Sector Header & Rotation Regime */}
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3 shrink-0 relative z-30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{sector.sector}</h2>
            <span className="text-[10px] text-white/40 font-mono">({sector.stockCount} stocks)</span>
          </div>
          <p className="text-[11px] text-white/50 mt-0.5 font-mono">
            Turnover: {(sector.totalTurnover / 1_000_000).toFixed(1)}M EGP ({sector.turnoverShare.toFixed(1)}% of market)
          </p>
        </div>

        <div className="relative group/tooltip flex items-center">
          <div className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1.5 shrink-0 cursor-help ${regimeColors[sector.rotationRegime]}`}>
            {renderRegimeIcon(sector.rotationRegime)}
            <span>{sector.rotationRegime}</span>
            <Info className="w-2.5 h-2.5 opacity-60" />
          </div>
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/90 leading-relaxed shadow-2xl z-50 pointer-events-none">
            <div className="font-bold text-white mb-1 uppercase tracking-wider text-[9px]">Sector Rotation Regime</div>
            <div className="text-emerald-400 flex items-center gap-1"><TrendingUp size={10} /> Leading: Beating EGX30 & accelerating</div>
            <div className="text-amber-400 flex items-center gap-1"><AlertTriangle size={10} /> Weakening: Momentum decelerating</div>
            <div className="text-cyan-400 flex items-center gap-1"><Zap size={10} /> Improving: Early accumulation turnaround</div>
            <div className="text-rose-400 flex items-center gap-1"><TrendingDown size={10} /> Lagging: Underperforming market</div>
          </div>
        </div>
      </div>

      {/* 2. Key Sector Performance KPI Matrix (3-card grid) */}
      <div className="grid grid-cols-3 gap-1.5 shrink-0 relative z-20">
        {/* Weighted ROI */}
        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between group relative">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Weighted ROI</span>
            <div className="relative group/tooltip">
              <Info className="w-2.5 h-2.5 text-white/30 hover:text-white/80 cursor-help transition" />
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-48 p-2 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                Capital-weighted average return of all stocks in this sector based on traded EGP liquidity.
              </div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-bold mt-1 ${sector.turnoverWeightedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sector.turnoverWeightedReturn > 0 ? '+' : ''}{sector.turnoverWeightedReturn.toFixed(2)}%
          </span>
        </div>

        {/* Alpha vs EGX30 */}
        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between group relative">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Alpha (α)</span>
            <div className="relative group/tooltip">
              <Info className="w-2.5 h-2.5 text-white/30 hover:text-white/80 cursor-help transition" />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                Net outperformance spread above the EGX30 benchmark. A positive score means the sector beat the market.
              </div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-bold mt-1 ${sector.relativeStrengthVsBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sector.relativeStrengthVsBenchmark > 0 ? '+' : ''}{sector.relativeStrengthVsBenchmark.toFixed(2)}%
          </span>
        </div>

        {/* Breadth */}
        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between group relative">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Breadth</span>
            <div className="relative group/tooltip">
              <Info className="w-2.5 h-2.5 text-white/30 hover:text-white/80 cursor-help transition" />
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-48 p-2 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                Number of winning stocks (W) that gained vs losing stocks (L) that declined in this sector.
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-white mt-1">
            <span className="text-emerald-400">{sector.gainersCount}W</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-rose-400">{sector.losersCount}L</span>
          </span>
        </div>
      </div>

      {/* 3. Alpha Driver Attribution Waterfall */}
      {sector.topDriver && (
        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25 flex flex-col gap-1 shrink-0 group relative z-10">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-400" />
              Primary Alpha Driver
              <div className="relative group/tooltip inline-block ml-0.5">
                <Info className="w-2.5 h-2.5 text-emerald-400/60 hover:text-emerald-300 cursor-help transition" />
                <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                  The individual company that generated the highest positive capital contribution to this sector's rally.
                </div>
              </div>
            </span>
            <span className="font-mono text-emerald-300 font-bold">
              +{sector.topDriver.returnPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-white/70">
            <strong className="text-white font-mono">{sector.topDriver.symbol}</strong> ({sector.topDriver.companyName}) created the largest positive momentum in this sector.
          </p>
        </div>
      )}

      {/* 4. Ranked Constituent Stocks Table */}
      <div className="flex-1 flex flex-col min-h-0 border border-white/[0.08] rounded-lg overflow-hidden bg-black/40">
        <div className="h-7 px-2.5 flex items-center justify-between bg-white/[0.03] border-b border-white/[0.06] text-[9px] uppercase tracking-wider text-white/40 font-semibold shrink-0">
          <span>Constituent Stock</span>
          <div className="flex items-center gap-4">
            <span>Turnover</span>
            <span className="w-14 text-right">Return</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {sector.stocks.map((stock) => {
            const isSelected = selectedTicker === stock.symbol;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectTicker(stock.symbol)}
                className={`px-2.5 py-2 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                  isSelected ? 'bg-plt-orange/10 border-l-2 border-plt-orange' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-white text-[11px]">{stock.symbol}</span>
                      {analysisMode === 'strategy' && signalsMap?.[stock.symbol] && (
                        signalsMap[stock.symbol].status === 'BUY_FRESH' ? (
                          <span className="px-1 py-0.2 rounded bg-emerald-400 text-black font-extrabold text-[8px] animate-pulse">
                            BUY
                          </span>
                        ) : signalsMap[stock.symbol].status === 'LONG_ACTIVE' ? (
                          <span className="px-1 py-0.2 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[8px]">
                            LONG
                          </span>
                        ) : signalsMap[stock.symbol].status === 'EXIT_RECENT' ? (
                          <span className="px-1 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[8px]">
                            EXIT
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded bg-white/[0.04] text-white/30 text-[8px]">
                            FLAT
                          </span>
                        )
                      )}
                    </div>
                    <span className="text-[10px] text-white/40 truncate max-w-[120px]">{stock.companyName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] text-white/40">
                    {(stock.turnover / 1_000_000).toFixed(1)}M
                  </span>
                  <span
                    className={`w-14 text-right font-bold text-[11px] ${
                      stock.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {stock.returnPct > 0 ? '+' : ''}
                    {stock.returnPct.toFixed(1)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTickerChart?.(stock.symbol);
                    }}
                    className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.08] transition"
                    title={`Open ${stock.symbol} Candlestick Chart`}
                  >
                    <LineChart size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

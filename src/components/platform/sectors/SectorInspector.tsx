"use client";

import React from 'react';
import type { SectorPerformanceItem } from '@/app/api/sectors/performance/route';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Flame,
  Scale,
  LineChart,
  BarChart2,
} from 'lucide-react';

interface SectorInspectorProps {
  sector: SectorPerformanceItem | null;
  selectedTicker: string | null;
  onSelectTicker: (symbol: string) => void;
  onOpenTickerChart: (symbol: string) => void;
}

export default function SectorInspector({
  sector,
  selectedTicker,
  onSelectTicker,
  onOpenTickerChart,
}: SectorInspectorProps) {
  if (!sector) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-white/30 border border-white/[0.08] rounded-xl bg-zinc-950/40">
        <Scale className="w-8 h-8 mb-2 opacity-40 text-plt-orange" />
        <p className="text-xs">Select any sector or stock from the heatmap to view its macro-to-micro performance attribution</p>
      </div>
    );
  }

  const regimeColors = {
    Leading: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Improving: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Weakening: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Lagging: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  const regimeIcons = {
    Leading: '🚀',
    Improving: '⚡',
    Weakening: '⚠️',
    Lagging: '❄️',
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3.5 bg-zinc-950/60 border border-white/[0.08] rounded-xl overflow-hidden">
      {/* 1. Sector Header & Rotation Regime */}
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{sector.sector}</h2>
            <span className="text-[10px] text-white/40 font-mono">({sector.stockCount} stocks)</span>
          </div>
          <p className="text-[11px] text-white/50 mt-0.5 font-mono">
            Turnover: {(sector.totalTurnover / 1_000_000).toFixed(1)}M EGP ({sector.turnoverShare.toFixed(1)}% of market)
          </p>
        </div>

        <div className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 shrink-0 ${regimeColors[sector.rotationRegime]}`}>
          <span>{regimeIcons[sector.rotationRegime]}</span>
          <span>{sector.rotationRegime}</span>
        </div>
      </div>

      {/* 2. Key Sector Performance KPI Matrix (3-card grid) */}
      <div className="grid grid-cols-3 gap-1.5 shrink-0">
        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Weighted ROI</span>
          <span className={`text-[11px] font-mono font-bold mt-1 ${sector.turnoverWeightedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sector.turnoverWeightedReturn > 0 ? '+' : ''}{sector.turnoverWeightedReturn.toFixed(2)}%
          </span>
        </div>

        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Alpha vs EGX30</span>
          <span className={`text-[11px] font-mono font-bold mt-1 ${sector.relativeStrengthVsBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sector.relativeStrengthVsBenchmark > 0 ? '+' : ''}{sector.relativeStrengthVsBenchmark.toFixed(2)}%
          </span>
        </div>

        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Breadth</span>
          <span className="text-[11px] font-mono font-bold text-white mt-1">
            <span className="text-emerald-400">{sector.gainersCount}W</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-rose-400">{sector.losersCount}L</span>
          </span>
        </div>
      </div>

      {/* 3. Alpha Driver Attribution Waterfall */}
      {sector.topDriver && (
        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25 flex flex-col gap-1 shrink-0">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-400" />
              Primary Alpha Driver
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
                    <span className="font-bold font-mono text-white text-[11px]">{stock.symbol}</span>
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
                      onOpenTickerChart(stock.symbol);
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

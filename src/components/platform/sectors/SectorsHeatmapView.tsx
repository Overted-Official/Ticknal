"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Layers,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Droplets,
  Scale,
  X,
  Target,
  Sliders,
  Info,
  LayoutGrid,
  Compass,
  Zap,
  Activity,
} from 'lucide-react';
import SectorTreemap from './SectorTreemap';
import SectorInspector from './SectorInspector';
import SectorRotationMatrix from './SectorRotationMatrix';
import type { SectorsPerformanceResponse, SectorPerformanceItem } from '@/app/api/sectors/performance/route';
import type { SectorStrategySignalsResponse } from '@/app/api/sectors/signals/route';
import { getAvailableStrategies } from '@/strategies/registry';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SectorsHeatmapViewProps {
  onOpenTickerChart?: (symbol: string) => void;
}

export default function SectorsHeatmapView({ onOpenTickerChart }: SectorsHeatmapViewProps) {
  const router = useRouter();

  // Timeframe & Mode State
  const [timeframePreset, setTimeframePreset] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom'>('YTD');
  const [customStartDate, setCustomStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [sizingMetric, setSizingMetric] = useState<'turnover' | 'volume' | 'equal'>('turnover');
  const [viewLayout, setViewLayout] = useState<'treemap' | 'matrix'>('treemap');
  
  // Dual-Mode State: 'macro' (Market Macro) vs 'strategy' (Strategy Signals)
  const [analysisMode, setAnalysisMode] = useState<'macro' | 'strategy'>('macro');
  const [filterActiveSignalsOnly, setFilterActiveSignalsOnly] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('psi');

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const availableStrategies = getAvailableStrategies();

  // Calculate start date based on preset
  const getDates = () => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (timeframePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    const d = new Date(today);
    if (timeframePreset === '1D') d.setDate(d.getDate() - 1);
    else if (timeframePreset === '1W') d.setDate(d.getDate() - 7);
    else if (timeframePreset === '1M') d.setMonth(d.getMonth() - 1);
    else if (timeframePreset === '3M') d.setMonth(d.getMonth() - 3);
    else if (timeframePreset === '6M') d.setMonth(d.getMonth() - 6);
    else if (timeframePreset === 'YTD') d.setFullYear(d.getFullYear(), 0, 1);
    else if (timeframePreset === '1Y') d.setFullYear(d.getFullYear() - 1);

    return { start: d.toISOString().split('T')[0], end: endStr };
  };

  const { start, end } = getDates();

  // SWR Query for Market Macro Data
  const { data, error, isLoading, mutate } = useSWR<SectorsPerformanceResponse>(
    `/api/sectors/performance?start=${start}&end=${end}&strategy=${selectedStrategy}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // SWR Query for Live Strategy Signals (Loaded on-demand when strategy mode is active)
  const { data: signalsData } = useSWR<SectorStrategySignalsResponse>(
    analysisMode === 'strategy' ? '/api/sectors/signals' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const sectors = data?.sectors || [];
  const marketSummary = data?.marketSummary;

  // Active chosen sector object
  const activeSectorData: SectorPerformanceItem | null =
    sectors.find((s) => s.sector === selectedSector) || sectors[0] || null;

  const handleSelectSector = (sectorName: string) => {
    setSelectedSector(sectorName);
    setIsMobileDrawerOpen(true);
  };

  const handleSelectTicker = (symbol: string) => {
    setSelectedTicker(symbol);
    setIsMobileDrawerOpen(true);
  };

  const handleOpenChart = (symbol: string) => {
    if (onOpenTickerChart) {
      onOpenTickerChart(symbol);
    } else {
      router.push(`/charts?ticker=${symbol}&view=chart`);
    }
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 bg-plt-base text-white select-none overflow-hidden p-3 md:p-4 gap-3">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP CONTROL HUB                                   */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-950/80 border border-white/[0.08] rounded-xl shrink-0">
        {/* Timeframe Presets */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTimeframePreset(preset)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                timeframePreset === preset
                  ? 'bg-plt-orange text-white font-bold shadow-md shadow-orange-950/30'
                  : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {preset}
            </button>
          ))}

          {/* Custom Date Pickers Modal Inline Trigger */}
          {timeframePreset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-black/60 border border-white/15 rounded px-2 py-0.5 text-[10px] text-white font-mono focus:border-plt-orange focus:outline-none"
              />
              <span className="text-white/40 text-[10px]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-black/60 border border-white/15 rounded px-2 py-0.5 text-[10px] text-white font-mono focus:border-plt-orange focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Right Controls: Mode Toggle, Sizing, View & Strategy */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dual-Mode Toggle: Market Macro vs Strategy Signals */}
          <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
            <button
              type="button"
              onClick={() => setAnalysisMode('macro')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                analysisMode === 'macro'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Show Macro Economic Sector Performance"
            >
              <Layers size={11} />
              <span>Macro</span>
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMode('strategy')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                analysisMode === 'strategy'
                  ? 'bg-plt-orange text-white font-bold shadow-md shadow-orange-950/40'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Overlay Live Quantitative Strategy Signals"
            >
              <Zap size={11} />
              <span>Strategy Signals</span>
            </button>
          </div>

          {/* Sizing Metric Toggle */}
          <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
            <button
              type="button"
              onClick={() => setSizingMetric('turnover')}
              className={`px-2 py-0.5 rounded transition ${sizingMetric === 'turnover' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
              title="Size tiles by EGP Traded Value (Turnover)"
            >
              Turnover
            </button>
            <button
              type="button"
              onClick={() => setSizingMetric('volume')}
              className={`px-2 py-0.5 rounded transition ${sizingMetric === 'volume' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
              title="Size tiles by Share Volume"
            >
              Volume
            </button>
            <button
              type="button"
              onClick={() => setSizingMetric('equal')}
              className={`px-2 py-0.5 rounded transition ${sizingMetric === 'equal' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
              title="Equal Size Tiles"
            >
              Equal
            </button>
          </div>

          {/* View Mode Toggle (Treemap vs Matrix) */}
          <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
            <button
              type="button"
              onClick={() => setViewLayout('treemap')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${viewLayout === 'treemap' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
            >
              <LayoutGrid size={11} />
              <span>Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('matrix')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${viewLayout === 'matrix' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
            >
              <Compass size={11} />
              <span>Rotation</span>
            </button>
          </div>

          {/* Active Setups Filter Toggle (Visible in Strategy Mode) */}
          {analysisMode === 'strategy' && (
            <button
              type="button"
              onClick={() => setFilterActiveSignalsOnly(!filterActiveSignalsOnly)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium border transition ${
                filterActiveSignalsOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white'
              }`}
              title="Filter treemap to only show stocks with active BUY or LONG signals"
            >
              {filterActiveSignalsOnly ? 'Active Signals ✓' : 'All Stocks'}
            </button>
          )}

          {/* Dynamic Strategy Selector (Visible in Strategy Mode) */}
          {analysisMode === 'strategy' && availableStrategies.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] px-2 py-1 rounded-lg text-[10px]">
              <Target className="w-3 h-3 text-plt-orange" />
              <span className="text-white/60">Strategy:</span>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {availableStrategies.map((strat) => (
                  <option key={strat.id} value={strat.id} className="bg-zinc-900 text-white">
                    {strat.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. DUAL-MODE KPI STRIP (MACRO vs STRATEGY SIGNALS)    */}
      {/* ---------------------------------------------------- */}
      {analysisMode === 'strategy' && signalsData?.summary ? (
        /* Strategy Signals KPI Strip */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 relative z-30">
          {/* Fresh Buy Signals */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-emerald-500/30 flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">Fresh BUY Signals</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Stocks that triggered a new BUY entry condition in the most recent trading session.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">
                {signalsData.summary.totalFreshBuys} Tickers
              </div>
            </div>
            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              NEW ENTRY
            </span>
          </div>

          {/* Active Long Positions */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-cyan-500/30 flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-cyan-400/80 font-bold">Active LONG Trades</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Stocks currently held in active open trades by the strategy algorithm.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-cyan-400 mt-0.5">
                {signalsData.summary.totalActiveLongs} Stocks
              </div>
            </div>
            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
              RIDING TREND
            </span>
          </div>

          {/* Recent Exits */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-rose-500/30 flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-rose-400/80 font-bold">Recent Exits (TP/SL)</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 sm:right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Stocks that reached profit targets or trailing stops in the last 5 days.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-rose-400 mt-0.5">
                {signalsData.summary.totalRecentExits} Closed
              </div>
            </div>
            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
              CLOSED
            </span>
          </div>

          {/* Scanned Universe */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Strategy Universe</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Total actively scanned EGX equities with mature history in this strategy model.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                {signalsData.summary.totalScanned} Scanned
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-plt-orange shrink-0">
              100% COVERED
            </span>
          </div>
        </div>
      ) : marketSummary ? (
        /* Market Macro KPI Strip */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 relative z-30">
          {/* Top Sector */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Top Sector</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    The highest performing economic sector in this timeframe, weighted by total traded liquidity (EGP volume).
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-white mt-0.5 truncate max-w-[140px]">{marketSummary.topSector}</div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
              +{marketSummary.topSectorReturn.toFixed(1)}%
            </span>
          </div>

          {/* Laggard Sector */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Laggard Sector</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    The lowest performing sector in this timeframe, indicating capital outflows or rotation out of this industry.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-white mt-0.5 truncate max-w-[140px]">{marketSummary.laggardSector}</div>
            </div>
            <span
              className={`text-xs font-mono font-bold shrink-0 ${
                marketSummary.laggardSectorReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {marketSummary.laggardSectorReturn > 0 ? '+' : ''}
              {marketSummary.laggardSectorReturn.toFixed(1)}%
            </span>
          </div>

          {/* Market Turnover */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Market Turnover</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute left-0 sm:right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Total Egyptian Pounds (EGP) traded across all EGX equities in this timeframe. High turnover confirms strong institutional participation.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                {(marketSummary.totalTurnover / 1_000_000_000).toFixed(2)}B EGP
              </div>
            </div>
            <div className="relative group/tooltip">
              <Info className="w-4 h-4 text-white/30 hover:text-cyan-400 cursor-help transition" />
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                Sum of (Price × Traded Volume) for every stock over the selected period.
              </div>
            </div>
          </div>

          {/* Market Breadth */}
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between group relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Market Breadth</span>
                <div className="relative group/tooltip">
                  <Info className="w-3 h-3 text-white/30 hover:text-white/80 cursor-help transition" />
                  <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                    Ratio of Advancing stocks (Gainers) vs Declining stocks (Losers). High green breadth confirms a healthy, broad-based market bull rally.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                <span className="text-emerald-400">{marketSummary.totalGainers} Adv</span>
                <span className="text-white/30 mx-1">/</span>
                <span className="text-rose-400">{marketSummary.totalLosers} Dec</span>
              </div>
            </div>
            <div className="relative group/tooltip">
              <Info className="w-4 h-4 text-white/30 hover:text-plt-orange cursor-help transition" />
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-56 p-2.5 rounded-lg bg-zinc-900/95 backdrop-blur-md border border-white/15 text-[10px] text-white/80 leading-tight shadow-2xl z-50 pointer-events-none">
                Breadth proves whether the index rally is authentic across all sectors or just propped up by 1 or 2 mega-caps.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------- */}
      {/* 3. MAIN WORKSPACE: HEATMAP & INSPECTOR               */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 relative overflow-hidden">
        {/* Left Pane: Treemap or Rotation Matrix */}
        <div className="flex-1 h-full min-h-[380px] overflow-hidden relative">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-950/40 rounded-xl border border-white/[0.08]">
              <RefreshCw className="w-6 h-6 animate-spin text-plt-orange" />
              <span className="text-xs font-mono text-white/40">Aggregating EGX Market Performance...</span>
            </div>
          ) : viewLayout === 'treemap' ? (
            <SectorTreemap
              sectors={sectors}
              sizingMetric={sizingMetric}
              analysisMode={analysisMode}
              signalsMap={signalsData?.signalsByTicker}
              filterActiveSignalsOnly={filterActiveSignalsOnly}
              selectedSector={selectedSector || activeSectorData?.sector || null}
              onSelectSector={handleSelectSector}
              onSelectTicker={handleSelectTicker}
            />
          ) : (
            <SectorRotationMatrix
              sectors={sectors}
              selectedSector={selectedSector || activeSectorData?.sector || null}
              onSelectSector={handleSelectSector}
            />
          )}
        </div>

        {/* Right Pane: Desktop Sector Drill-Down Inspector */}
        <div className="hidden md:block w-80 lg:w-96 xl:w-[420px] h-full shrink-0">
          <SectorInspector
            sector={activeSectorData}
            selectedTicker={selectedTicker}
            analysisMode={analysisMode}
            signalsMap={signalsData?.signalsByTicker}
            onSelectTicker={handleSelectTicker}
            onOpenTickerChart={handleOpenChart}
          />
        </div>
      </div>

      {/* Mobile Slide-Up Inspector Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-zinc-950 border-t border-white/20 rounded-t-2xl p-4 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-bold text-sm text-white">Sector Inspector</span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg bg-white/10 text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-3">
              <SectorInspector
                sector={activeSectorData}
                selectedTicker={selectedTicker}
                analysisMode={analysisMode}
                signalsMap={signalsData?.signalsByTicker}
                onSelectTicker={handleSelectTicker}
                onOpenTickerChart={handleOpenChart}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

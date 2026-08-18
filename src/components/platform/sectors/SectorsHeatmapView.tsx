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
} from 'lucide-react';
import SectorTreemap from './SectorTreemap';
import SectorInspector from './SectorInspector';
import SectorRotationMatrix from './SectorRotationMatrix';
import type { SectorsPerformanceResponse, SectorPerformanceItem } from '@/app/api/sectors/performance/route';
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

  // SWR Query with built-in deduplication
  const { data, error, isLoading, mutate } = useSWR<SectorsPerformanceResponse>(
    `/api/sectors/performance?start=${start}&end=${end}&strategy=${selectedStrategy}`,
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                timeframePreset === preset
                  ? 'bg-plt-orange text-white font-bold shadow-md shadow-orange-950/40'
                  : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {preset === 'custom' ? '📅 Custom' : preset}
            </button>
          ))}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Custom Date Pickers */}
          {timeframePreset === 'custom' && (
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-white"
              />
              <span className="text-white/40">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-white"
              />
            </div>
          )}

          {/* Sizing Metric Switch */}
          <div className="hidden sm:flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
            <button
              type="button"
              onClick={() => setSizingMetric('turnover')}
              className={`px-2 py-0.5 rounded transition ${sizingMetric === 'turnover' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
              title="Size tiles by EGP Liquidity Turnover"
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
              className={`px-2 py-0.5 rounded transition ${viewLayout === 'treemap' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
            >
              🗺️ Treemap
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('matrix')}
              className={`px-2 py-0.5 rounded transition ${viewLayout === 'matrix' ? 'bg-zinc-800 text-white font-bold' : 'text-white/40'}`}
            >
              ⚡ Rotation
            </button>
          </div>

          {/* Dynamic Strategy Selector */}
          {availableStrategies.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] px-2 py-1 rounded-lg text-[10px]">
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
      {/* 2. MACRO MARKET PULSE KPI STRIP                      */}
      {/* ---------------------------------------------------- */}
      {marketSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Top Sector</span>
              <div className="text-xs font-bold text-white mt-0.5 truncate max-w-[140px]">{marketSummary.topSector}</div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              +{marketSummary.topSectorReturn.toFixed(1)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Laggard Sector</span>
              <div className="text-xs font-bold text-white mt-0.5 truncate max-w-[140px]">{marketSummary.laggardSector}</div>
            </div>
            <span className={`text-xs font-mono font-bold ${marketSummary.laggardSectorReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {marketSummary.laggardSectorReturn > 0 ? '+' : ''}{marketSummary.laggardSectorReturn.toFixed(1)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Market Turnover</span>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                {(marketSummary.totalTurnover / 1_000_000_000).toFixed(2)}B EGP
              </div>
            </div>
            <Droplets className="w-4 h-4 text-cyan-400 opacity-60" />
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Market Breadth</span>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                <span className="text-emerald-400">{marketSummary.totalGainers} Adv</span>
                <span className="text-white/30 mx-1">/</span>
                <span className="text-rose-400">{marketSummary.totalLosers} Dec</span>
              </div>
            </div>
            <Scale className="w-4 h-4 text-plt-orange opacity-60" />
          </div>
        </div>
      )}

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
            onSelectTicker={handleSelectTicker}
            onOpenTickerChart={handleOpenChart}
          />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. MOBILE BOTTOM SHEET DRAWER                        */}
      {/* ---------------------------------------------------- */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative w-full max-h-[80vh] bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-xs font-bold text-white uppercase tracking-wider mt-2">
                {activeSectorData?.sector || 'Sector Details'}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SectorInspector
                sector={activeSectorData}
                selectedTicker={selectedTicker}
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

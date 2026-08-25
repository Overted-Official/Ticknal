"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { RefreshCw, X } from '@/components/ui/icon-library';
import SectorsHeader from './SectorsHeader';
import SectorsKPIStrip from './SectorsKPIStrip';
import SectorTreemap from './SectorTreemap';
import SectorInspector from './SectorInspector';
import SectorRotationMatrix from './SectorRotationMatrix';
import {
  type SectorsPerformanceResponse,
  type SectorPerformanceItem,
  type SectorStrategySignalsResponse,
  aggregateSectorsFromStocks,
} from '@/lib/sectors-math';
import { getAvailableStrategies } from '@/strategies/registry';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SectorsHeatmapViewProps {
  onOpenTickerChart?: (symbol: string) => void;
}

export default function SectorsHeatmapView({ onOpenTickerChart }: SectorsHeatmapViewProps) {
  const router = useRouter();

  // Timeframe & Sizing State
  const [timeframePreset, setTimeframePreset] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'custom'>('YTD');
  const [customStartDate, setCustomStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [sizingMetric, setSizingMetric] = useState<'turnover' | 'volume' | 'equal'>('turnover');
  const [viewLayout, setViewLayout] = useState<'treemap' | 'matrix'>('treemap');

  // GICS Granularity Level: 'sector' (11 Sectors) | 'industryGroup' (25 Groups) | 'industry' | 'ticker'
  const [granularity, setGranularity] = useState<'sector' | 'industryGroup' | 'industry' | 'ticker'>('sector');

  // Dual-Mode State: 'macro' (Market Macro) vs 'strategy' (Strategy Signals)
  const [analysisMode, setAnalysisMode] = useState<'macro' | 'strategy'>('macro');
  const [filterActiveSignalsOnly, setFilterActiveSignalsOnly] = useState(false);
  const [activeStrategyFilter, setActiveStrategyFilter] = useState<
    'ALL' | 'BUY_FRESH' | 'LONG_ACTIVE' | 'LONG_WINNERS' | 'LONG_LOSERS' | 'EXIT_RECENT'
  >('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('psi');

  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // SWR Query for Market Macro Data (cached by date range + strategy)
  const { data, error, isLoading, mutate } = useSWR<SectorsPerformanceResponse>(
    `/api/sectors/performance?start=${start}&end=${end}&strategy=${selectedStrategy}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // SWR Query for Live Strategy Signals (Loaded on-demand when strategy mode is active)
  const { data: signalsData } = useSWR<SectorStrategySignalsResponse>(
    analysisMode === 'strategy'
      ? `/api/sectors/signals?strategy=${selectedStrategy}&start=${start}&end=${end}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // Instant in-memory hierarchy aggregation (0ms UI latency when changing granularity!)
  const { sectors, marketSummary } = useMemo(() => {
    if (!data?.rawStockItems || data.rawStockItems.length === 0) {
      return {
        sectors: data?.sectors || [],
        marketSummary: data?.marketSummary,
      };
    }
    return aggregateSectorsFromStocks(
      data.rawStockItems,
      granularity,
      data.egx30Return ?? null
    );
  }, [data, granularity]);

  // Active chosen sector object
  const activeSectorData: SectorPerformanceItem | null =
    sectors.find((s: SectorPerformanceItem) => s.sector === selectedSector) || sectors[0] || null;

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
      router.push(`/invest?ticker=${symbol}&view=chart${analysisMode === 'strategy' ? `&strategy=${selectedStrategy}` : ''}`);
    }
  };

  const handleResetSelection = () => {
    setSelectedSector(null);
    setSelectedTicker(null);
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden select-none bg-plt-base text-plt-text font-sans flex flex-col p-3 md:p-5 gap-3">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP CONTROLS & KPI STRIP (SHRINK-0)               */}
      {/* ---------------------------------------------------- */}
      <div className="shrink-0 flex flex-col gap-2.5">
        <SectorsHeader
          timeframePreset={timeframePreset}
          setTimeframePreset={setTimeframePreset}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          analysisMode={analysisMode}
          setAnalysisMode={setAnalysisMode}
          granularity={granularity}
          setGranularity={setGranularity}
          sizingMetric={sizingMetric}
          setSizingMetric={setSizingMetric}
          viewLayout={viewLayout}
          setViewLayout={setViewLayout}
          filterActiveSignalsOnly={filterActiveSignalsOnly}
          setFilterActiveSignalsOnly={setFilterActiveSignalsOnly}
          selectedStrategy={selectedStrategy}
          setSelectedStrategy={setSelectedStrategy}
          availableStrategies={availableStrategies}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onResetSelection={handleResetSelection}
        />

        <SectorsKPIStrip
          analysisMode={analysisMode}
          granularity={granularity}
          marketSummary={marketSummary}
          signalsData={signalsData}
          activeStrategyFilter={activeStrategyFilter}
          onSetStrategyFilter={setActiveStrategyFilter}
          onSelectSector={handleSelectSector}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. DEDICATED MAIN WORKSPACE CANVAS (FLEX-1 VIEWPORT) */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-5 overflow-hidden">
        {/* Left Pane: Treemap or Rotation Matrix */}
        <div className="flex-1 h-full min-h-0 overflow-hidden relative border border-plt-border-soft bg-plt-base">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-plt-base/40">
              <RefreshCw className="w-6 h-6 animate-spin text-plt-muted" />
              <span className="text-xs tabular-nums text-plt-muted">Aggregating EGX Market Performance...</span>
            </div>
          ) : viewLayout === 'treemap' ? (
            <SectorTreemap
              sectors={sectors}
              sizingMetric={sizingMetric}
              analysisMode={analysisMode}
              signalsMap={signalsData?.signalsByTicker}
              sectorSummary={signalsData?.sectorSummary}
              filterActiveSignalsOnly={filterActiveSignalsOnly}
              activeStrategyFilter={activeStrategyFilter}
              searchQuery={searchQuery}
              selectedSector={selectedSector}
              onSelectSector={handleSelectSector}
              onSelectTicker={handleSelectTicker}
            />
          ) : (
            <SectorRotationMatrix
              sectors={sectors}
              selectedSector={selectedSector}
              onSelectSector={handleSelectSector}
            />
          )}
        </div>

        {/* Right Pane: Sector Inspector & Attribution Panel */}
        <div className="hidden md:flex w-full md:w-80 lg:w-96 xl:w-[420px] shrink-0 h-full min-h-0 flex-col overflow-hidden">
          <SectorInspector
            sector={activeSectorData}
            selectedTicker={selectedTicker}
            granularity={granularity}
            analysisMode={analysisMode}
            signalsMap={signalsData?.signalsByTicker}
            sectorSummary={signalsData?.sectorSummary}
            onSelectTicker={handleSelectTicker}
            onOpenTickerChart={handleOpenChart}
          />
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MOBILE BOTTOM SHEET DRAWER                           */}
      {/* ---------------------------------------------------- */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-plt-card border-t border-plt-border-strong rounded-t-2xl max-h-[85vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-plt-border/40">
              <span className="font-bold text-sm text-plt-text">Sector Performance Attribution</span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-full text-plt-muted hover:text-plt-text hover:bg-white/[0.08]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pt-3">
              <SectorInspector
                sector={activeSectorData}
                selectedTicker={selectedTicker}
                granularity={granularity}
                analysisMode={analysisMode}
                signalsMap={signalsData?.signalsByTicker}
                sectorSummary={signalsData?.sectorSummary}
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

'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles, ExternalLink } from '@/components/ui/icon-library';
import MarketsFloatingNav from './MarketsFloatingNav';
import MarketOverviewSection, { type MarketTimeframe } from './sections/MarketOverviewSection';
import SectorRotationSection from './sections/SectorRotationSection';
import MarketHeatmapSection from './sections/MarketHeatmapSection';
import {
  type SectorsPerformanceResponse,
  type SectorStrategySignalsResponse,
  aggregateSectorsFromStocks,
} from '@/lib/sectors-math';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MarketsPageView() {
  const router = useRouter();

  // Timeframe & Sizing State (default to 1M for responsive overview)
  const [timeframePreset, setTimeframePreset] = useState<MarketTimeframe | 'custom'>('1M');
  const [customStartDate, setCustomStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Sizing & Hierarchy Granularity
  const [sizingMetric, setSizingMetric] = useState<'turnover' | 'volume' | 'equal'>('turnover');
  const [granularity, setGranularity] = useState<'sector' | 'industryGroup' | 'industry' | 'ticker'>('sector');

  // Strategy Model Selection
  const [selectedStrategy, setSelectedStrategy] = useState<string>('psi');

  // Selection state
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Compute start/end dates
  const { start, end } = useMemo(() => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (timeframePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    const d = new Date(today);
    if (timeframePreset === '1D') {
      // For 1D, step back across weekend if today is Fri/Sat/Sun
      const day = today.getDay();
      const backDays = day === 5 ? 2 : day === 6 ? 3 : day === 0 ? 3 : 1;
      d.setDate(d.getDate() - backDays);
    } else if (timeframePreset === '5D') {
      d.setDate(d.getDate() - 7);
    } else if (timeframePreset === '1M') {
      d.setMonth(d.getMonth() - 1);
    } else if (timeframePreset === '3M') {
      d.setMonth(d.getMonth() - 3);
    } else if (timeframePreset === '6M') {
      d.setMonth(d.getMonth() - 6);
    } else if (timeframePreset === 'YTD') {
      d.setFullYear(d.getFullYear(), 0, 1);
    } else if (timeframePreset === '1Y') {
      d.setFullYear(d.getFullYear() - 1);
    }

    return { start: d.toISOString().split('T')[0], end: endStr };
  }, [timeframePreset, customStartDate, customEndDate]);

  // 1. SWR Query for Market Macro Data (cached by date range)
  const { data: macroData, error: macroError, isLoading: isMacroLoading, mutate: mutateMacro } = useSWR<SectorsPerformanceResponse>(
    `/api/sectors/performance?start=${start}&end=${end}&strategy=${selectedStrategy}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // 2. SWR Query for Algorithmic Strategy Signals across EGX
  const { data: signalsData, isLoading: isSignalsLoading } = useSWR<SectorStrategySignalsResponse>(
    `/api/sectors/signals?strategy=${selectedStrategy}&start=${start}&end=${end}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // Instant in-memory hierarchy aggregation (0ms UI latency when changing granularity!)
  const { sectors, marketSummary } = useMemo(() => {
    if (!macroData?.rawStockItems || macroData.rawStockItems.length === 0) {
      return {
        sectors: macroData?.sectors || [],
        marketSummary: macroData?.marketSummary,
      };
    }
    return aggregateSectorsFromStocks(
      macroData.rawStockItems,
      granularity,
      macroData.egx30Return ?? null
    );
  }, [macroData, granularity]);

  const handleSelectSector = (sectorName: string) => {
    setSelectedSector(sectorName);
  };

  const handleSelectTicker = (tickerSymbol: string) => {
    setSelectedTicker(tickerSymbol);
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar bg-plt-base text-plt-text select-none font-sans">
      {/* 1. Markets Page Header (Breadcrumbs + Live Indicator) */}
      <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-plt-base">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Link
            href="/home"
            className="text-text-muted font-normal hover:text-text-primary transition-colors cursor-pointer"
          >
            Home
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="font-semibold text-text-primary">
            Markets
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => mutateMacro()}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title="Refresh market data"
          >
            <RefreshCw size={14} className={isMacroLoading ? 'animate-spin text-profit-num' : ''} />
          </button>
        </div>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <MarketsFloatingNav />

      {/* 3. Main 4-Section Executive Scroll */}
      <main className="app-page page-sections-stack pb-28 md:pb-24 pt-3 space-y-8 sm:space-y-10">
        {/* Section 1: Executive Market Overview (includes KPIs & Major Indices Area Chart) */}
        <MarketOverviewSection
          macroData={macroData}
          sectors={sectors}
          timeframe={timeframePreset === 'custom' ? '1M' : timeframePreset}
          onTimeframeChange={(tf) => setTimeframePreset(tf)}
          onSelectSector={handleSelectSector}
          isLoading={isMacroLoading}
        />

        {/* Section 2: Sector Rotation & Cycle Map */}
        <SectorRotationSection
          macroData={macroData}
          sectors={sectors}
          selectedSector={selectedSector}
          onSelectSector={handleSelectSector}
          timeframe={timeframePreset === 'custom' ? '1M' : timeframePreset}
          onTimeframeChange={(tf) => setTimeframePreset(tf)}
        />

        {/* Section 3: Market Performance Heatmap */}
        <MarketHeatmapSection
          sectors={sectors}
          marketSummary={marketSummary}
          signalsData={signalsData}
          benchmarkReturn={macroData?.egx30Return ?? 0}
          timeframePreset={timeframePreset}
          setTimeframePreset={(preset) => setTimeframePreset(preset === '1W' ? '5D' : preset)}
          granularity={granularity}
          setGranularity={setGranularity}
          sizingMetric={sizingMetric}
          setSizingMetric={setSizingMetric}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
          selectedTicker={selectedTicker}
          onSelectTicker={handleSelectTicker}
          isLoading={isMacroLoading}
        />
      </main>
    </div>
  );
}

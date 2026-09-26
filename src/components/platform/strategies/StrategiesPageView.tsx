'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { RefreshCw } from '@/components/ui/icon-library';
import StrategiesFloatingNav from './StrategiesFloatingNav';
import StrategySimulationSection, { type StrategyTimeframe } from './sections/StrategySimulationSection';
import StrategyModelComparisonSection from './sections/StrategyModelComparisonSection';
import {
  type SectorsPerformanceResponse,
  type SectorStrategySignalsResponse,
  aggregateSectorsFromStocks,
} from '@/lib/finance/sectors-math';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StrategiesPageView() {
  const [timeframePreset, setTimeframePreset] = useState<StrategyTimeframe>('custom');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('psi');

  // Default dates: from 1/1/2025 till today
  const defaultDates = useMemo(() => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    return { start: '2025-01-01', end: endStr };
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>('2025-01-01');
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Compute start/end dates based on timeframePreset and custom dates
  const { start, end } = useMemo(() => {
    if (timeframePreset === 'custom') {
      return {
        start: customStartDate || defaultDates.start,
        end: customEndDate || defaultDates.end,
      };
    }

    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    const d = new Date(today);

    if (timeframePreset === '1D') {
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
  }, [timeframePreset, customStartDate, customEndDate, defaultDates]);

  const handleTimeframeChange = (newTf: StrategyTimeframe) => {
    setTimeframePreset(newTf);
  };

  const handleCustomStartDateChange = (val: string) => {
    setCustomStartDate(val);
    setTimeframePreset('custom');
  };

  const handleCustomEndDateChange = (val: string) => {
    setCustomEndDate(val);
    setTimeframePreset('custom');
  };

  // 1. SWR Query for Market Macro Data (provides sector hierarchy & benchmark return)
  const { data: macroData, mutate: mutateMacro } = useSWR<SectorsPerformanceResponse>(
    `/api/sectors/performance?start=${start}&end=${end}&strategy=${selectedStrategy}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // 2. SWR Query for Algorithmic Strategy Signals & Backtest ROI across EGX
  const { data: signalsData, isLoading: isSignalsLoading, mutate: mutateSignals } = useSWR<SectorStrategySignalsResponse>(
    `/api/sectors/signals?strategy=${selectedStrategy}&start=${start}&end=${end}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // Real ROI and B&H metrics for each algorithm pill in the selected timeframe
  const strategyMetrics = useMemo(() => {
    if (!signalsData?.modelsComparison) return undefined;
    const comp = signalsData.modelsComparison;
    return {
      psi: {
        roi: comp.psi?.simulatedRoi ?? 0,
        bhRoi: comp.psi?.buyHoldRoi ?? 0,
        alpha: comp.psi?.alphaVsBh ?? 0,
      },
      psi_v2: {
        roi: comp.psi_v2?.simulatedRoi ?? 0,
        bhRoi: comp.psi_v2?.buyHoldRoi ?? 0,
        alpha: comp.psi_v2?.alphaVsBh ?? 0,
      },
      hydra: {
        roi: comp.hydra?.simulatedRoi ?? 0,
        bhRoi: comp.hydra?.buyHoldRoi ?? 0,
        alpha: comp.hydra?.alphaVsBh ?? 0,
      },
    };
  }, [signalsData?.modelsComparison]);

  // Instant in-memory sector aggregation
  const sectors = useMemo(() => {
    if (!macroData?.rawStockItems || macroData.rawStockItems.length === 0) {
      return macroData?.sectors || [];
    }
    return aggregateSectorsFromStocks(
      macroData.rawStockItems,
      'sector',
      macroData.egx30Return ?? null
    ).sectors;
  }, [macroData]);

  const handleRefresh = () => {
    mutateMacro();
    mutateSignals();
  };

  return (
    <div className="flex-1 w-full bg-black text-white flex flex-col font-sans select-none overflow-y-auto command-surface-page">
      {/* 1. Page Header */}
      <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-black flex-wrap">
        {/* Left: Breadcrumbs aligned with Home */}
        <div className="flex items-center gap-1.5 text-xs md:text-sm">
          <Link
            href="/home"
            className="text-text-muted font-normal hover:text-text-primary transition-colors cursor-pointer"
          >
            Home
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="font-semibold text-text-primary">
            Strategies
          </h1>
        </div>

        {/* Right: Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] text-neutral-400 hover:text-white transition cursor-pointer"
          title="Refresh Strategy Data"
        >
          <RefreshCw size={14} className={isSignalsLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <StrategiesFloatingNav />

      {/* 3. Main Sections Stack */}
      <main className="app-page page-sections-stack pb-28 md:pb-24 pt-3 space-y-8 sm:space-y-10">
        {/* Section 1: Strategy Performance & Market Simulation */}
        <StrategySimulationSection
          sectors={sectors}
          signalsData={signalsData}
          selectedStrategy={selectedStrategy}
          onSelectStrategy={setSelectedStrategy}
          benchmarkReturn={macroData?.egx30Return ?? 0}
          timeframePreset={timeframePreset}
          onTimeframeChange={handleTimeframeChange}
          customStartDate={customStartDate}
          onCustomStartDateChange={handleCustomStartDateChange}
          customEndDate={customEndDate}
          onCustomEndDateChange={handleCustomEndDateChange}
          strategyMetrics={strategyMetrics}
        />

        {/* Section 2: Algorithmic Models */}
        <StrategyModelComparisonSection
          selectedStrategy={selectedStrategy}
          onSelectStrategy={setSelectedStrategy}
          benchmarkReturn={macroData?.egx30Return ?? 0}
          timeframePreset={timeframePreset}
          tradingDaysCount={macroData?.timeframe?.tradingDaysCount}
          strategyMetrics={strategyMetrics}
          modelsComparison={signalsData?.modelsComparison}
          winningUniverseComparison={signalsData?.winningUniverseComparison}
        />
      </main>
    </div>
  );
}

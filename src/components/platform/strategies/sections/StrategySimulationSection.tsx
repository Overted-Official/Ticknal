'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/icon-library';

import type { StrategySimulationSectionProps, GroupBy, QuickFilter, StrategyTimeframe } from './simulation/types';
import { useStrategySimulation } from './simulation/useStrategySimulation';
import AlgorithmPills from './simulation/AlgorithmPills';
import ScreenerToolbar from './simulation/ScreenerToolbar';
import StrategyKPIRail from './simulation/StrategyKPIRail';
import SectorPillRail from './simulation/SectorPillRail';
import AlphaBreakdownSection from './simulation/AlphaBreakdownSection';

// Re-export for consumers (e.g. StrategiesPageView)
export type { StrategyTimeframe };
export type { StrategySimulationSectionProps };

const TIMEFRAME_PRESETS: StrategyTimeframe[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'];

export default function StrategySimulationSection({
  sectors = [],
  signalsData,
  strategyMetrics,
  selectedStrategy,
  onSelectStrategy,
  benchmarkReturn = 0,
  timeframePreset = 'custom',
  onTimeframeChange = () => {},
  customStartDate = '2025-01-01',
  onCustomStartDateChange = () => {},
  customEndDate = '',
  onCustomEndDateChange = () => {},
}: StrategySimulationSectionProps) {
  const router = useRouter();
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('sector');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    simulationKPIs,
    tickerBreadth,
    sectorDifferentialList,
    outperformingSectorsCount,
    allTickerAlpha,
  } = useStrategySimulation({ sectors, signalsData, benchmarkReturn, groupBy });

  const handleOpenChart = (symbol: string) =>
    router.push(`/charts?ticker=${symbol}&strategy=${selectedStrategy}`);

  const handleGroupByChange = (g: GroupBy) => {
    setGroupBy(g);
    setSelectedSectorFilter(null);
  };

  return (
    <section
      id="simulation-overview"
      className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16"
    >
      {/* 1. Section Header + Timeframe Controls Next to Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">Algorithms Performance</h2>
          <p className="section-subtitle">
            Simulate algorithmic strategy returns across all sectors and tickers against Buy &amp; Hold and the EGX30 benchmark
          </p>
        </div>

        {/* Timeframe Presets & Custom Date Range */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="seg-control">
            {TIMEFRAME_PRESETS.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`seg-control-btn ${timeframePreset === tf ? 'seg-control-btn-active' : ''}`}
              >
                {tf}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onTimeframeChange('custom')}
              className={`seg-control-btn flex items-center gap-1 ${
                timeframePreset === 'custom' ? 'seg-control-btn-active' : ''
              }`}
              title="Custom Date Range"
            >
              <Calendar size={11} />
              <span className="hidden sm:inline">Custom</span>
            </button>
          </div>

          {/* Quick Date Inputs if custom is active */}
          {timeframePreset === 'custom' && (
            <div className="input-control-compact animate-in fade-in duration-150">
              <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-transparent text-text-primary focus:outline-hidden text-xs cursor-pointer [color-scheme:dark] leading-none"
              />
              <span className="text-text-muted select-none text-[11px] leading-none">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-transparent text-text-primary focus:outline-hidden text-xs cursor-pointer [color-scheme:dark] leading-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Algorithm Strategy Pills (Matches MajorIndices pill design 1-to-1, real dynamic metrics, no redundant tags) */}
      <AlgorithmPills
        selectedStrategy={selectedStrategy}
        onSelectStrategy={onSelectStrategy}
        strategyMetrics={strategyMetrics}
      />

      {/* 3. 5 Macro KPI cards */}
      <StrategyKPIRail
        kpis={simulationKPIs}
        benchmarkReturn={benchmarkReturn}
        tickerBreadth={tickerBreadth}
      />

      {/* 4. Screener Section (Header + Screener Toolbar + Sector Pill Rail + Screener Table) */}
      <div className="space-y-3 pt-2">
        {/* Screener Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">Screener</span>
          {selectedSectorFilter && (
            <button
              type="button"
              onClick={() => setSelectedSectorFilter(null)}
              className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/[0.15] border border-white/15 text-[11px] font-medium text-white transition cursor-pointer"
            >
              <span>{selectedSectorFilter}</span>
              <span className="text-white/60">✕</span>
            </button>
          )}
        </div>

        {/* Screener Toolbar (Search bar, sectors/groups/industries switch, all tickers/beating/etc switch below 'screener' text) */}
        <ScreenerToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          groupBy={groupBy}
          onGroupByChange={handleGroupByChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Sector Pill Rail */}
        <SectorPillRail
          groupBy={groupBy}
          sectorDifferentialList={sectorDifferentialList}
          selectedSectorFilter={selectedSectorFilter}
          onSelectSector={setSelectedSectorFilter}
          outperformingSectorsCount={outperformingSectorsCount}
        />

        {/* Screener Table */}
        <AlphaBreakdownSection
          allTickerAlpha={allTickerAlpha}
          selectedSectorFilter={selectedSectorFilter}
          quickFilter={quickFilter}
          searchQuery={searchQuery}
          onOpenChart={handleOpenChart}
          tickerChampions={signalsData?.tickerChampions}
        />
      </div>
    </section>
  );
}

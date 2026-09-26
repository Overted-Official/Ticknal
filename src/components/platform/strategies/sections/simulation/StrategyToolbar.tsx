'use client';

import React from 'react';
import AlgorithmPills from './AlgorithmPills';
import ScreenerToolbar from './ScreenerToolbar';
import type { StrategyTimeframe, GroupBy, QuickFilter } from './types';

export interface StrategyToolbarProps {
  // 1. Algorithm Selection
  selectedStrategy: string;
  onSelectStrategy: (id: string) => void;
  strategyMetrics?: Record<string, { roi: number; bhRoi: number; alpha: number }>;
  // 2. Timeframe & Custom Dates
  timeframePreset: StrategyTimeframe;
  onTimeframeChange: (tf: StrategyTimeframe) => void;
  customStartDate: string;
  onCustomStartDateChange: (val: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (val: string) => void;
  // 3. Universe & Screener Filters
  quickFilter: QuickFilter;
  onQuickFilterChange: (qf: QuickFilter) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export { AlgorithmPills, ScreenerToolbar };

export default function StrategyToolbar({
  selectedStrategy,
  onSelectStrategy,
  strategyMetrics,
  quickFilter,
  onQuickFilterChange,
  groupBy,
  onGroupByChange,
  searchQuery,
  onSearchQueryChange,
}: StrategyToolbarProps) {
  return (
    <div className="w-full flex flex-col space-y-3 pt-1 select-none font-sans">
      <AlgorithmPills
        selectedStrategy={selectedStrategy}
        onSelectStrategy={onSelectStrategy}
        strategyMetrics={strategyMetrics}
      />
      <ScreenerToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={onQuickFilterChange}
        groupBy={groupBy}
        onGroupByChange={onGroupByChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
      />
    </div>
  );
}

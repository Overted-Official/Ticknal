'use client';

import React from 'react';
import { Search } from '@/components/ui/icon-library';
import type { GroupBy, QuickFilter } from './types';

interface ScreenerToolbarProps {
  quickFilter: QuickFilter;
  onQuickFilterChange: (qf: QuickFilter) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'All Tickers' },
  { id: 'beating', label: 'Beating B&H' },
  { id: 'trailing', label: 'Trailing B&H' },
  { id: 'active', label: 'Active Setups' },
];

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: 'sector', label: 'Sectors' },
  { id: 'industryGroup', label: 'Groups' },
  { id: 'industry', label: 'Industries' },
];

export default function ScreenerToolbar({
  quickFilter,
  onQuickFilterChange,
  groupBy,
  onGroupByChange,
  searchQuery,
  onSearchQueryChange,
}: ScreenerToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-0.5 text-xs select-none font-sans">
      {/* Left: Quick filters (All Tickers, Beating B&H, Trailing B&H, Active Setups) + Granularity (Sectors, Groups, Industries) */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="seg-control">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.id}
              type="button"
              onClick={() => onQuickFilterChange(qf.id)}
              className={`seg-control-btn ${quickFilter === qf.id ? 'seg-control-btn-active' : ''}`}
            >
              {qf.label}
            </button>
          ))}
        </div>

        <div className="seg-control">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onGroupByChange(g.id)}
              className={`seg-control-btn ${groupBy === g.id ? 'seg-control-btn-active' : ''}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Search Box */}
      <div className="input-control-compact w-48 sm:w-56">
        <Search size={13} className="text-text-muted shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search symbol, company..."
          className="bg-transparent text-text-primary placeholder:text-text-muted focus:outline-hidden text-xs w-full"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchQueryChange('')}
            className="text-text-muted hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

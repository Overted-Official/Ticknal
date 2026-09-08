'use client';

import React from 'react';
import { Search } from '@/components/ui/icon-library';
import { formatUiLabel } from '@/lib/format-ui-label';
import PageHeader from '@/components/platform/ui/PageHeader';

interface PositionsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'ALL' | 'OPEN' | 'CLOSED';
  onFilterChange: (filter: 'ALL' | 'OPEN' | 'CLOSED') => void;
  onAddPosition: () => void;
}

export default function PositionsHeader({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onAddPosition,
}: PositionsHeaderProps) {
  return (
    <PageHeader
      title="Portfolio Positions"
      description="Open positions, closed trades, and execution history."
      actions={(
        <>
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-plt-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-44 sm:w-56 rounded-xl bg-plt-card border border-plt-border-soft pl-8 pr-3 text-xs font-sans text-plt-text placeholder:text-plt-muted focus:border-plt-border-active focus:outline-none transition-all"
            />
          </div>

          <div className="pill-switch">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onFilterChange(value)}
                className={`pill-switch-btn ${
                  filter === value ? 'pill-switch-btn-active font-semibold' : ''
                }`}
              >
                {formatUiLabel(value)}
              </button>
            ))}
          </div>

          <button type="button" onClick={onAddPosition} className="btn-token btn-primary btn-compact" title="Add Tracked Position">
            <span className="text-base leading-none font-bold">+</span>
            <span>Add Position</span>
          </button>
        </>
      )}
    />
  );
}

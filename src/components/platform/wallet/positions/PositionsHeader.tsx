'use client';

import React from 'react';
import { Search, X, Plus } from '@/components/ui/icon-library';
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
    <div className="flex flex-col gap-2.5 shrink-0 select-none font-sans">
      <PageHeader
        title="Portfolio Positions"
        description="Open positions, closed trades, and execution history."
        actions={(
          <div className="hidden md:flex items-center gap-2.5">
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
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-plt-muted hover:text-plt-text"
                >
                  <X size={13} />
                </button>
              )}
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
          </div>
        )}
      />

      {/* Mobile Layout (below md) */}
      <div className="flex md:hidden flex-col gap-2">
        {/* Row 1: Search + Add split pill */}
        <div className="flex items-stretch h-9 rounded-xl overflow-hidden border border-plt-border bg-plt-raised">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-0 pl-3 flex items-center pointer-events-none text-plt-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search ticker or name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-full w-full bg-transparent pl-9 pr-3 text-[12px] text-plt-text placeholder:text-plt-muted focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-0 pr-3 flex items-center text-plt-muted hover:text-plt-text"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="w-px bg-plt-border shrink-0" />

          <button
            type="button"
            onClick={onAddPosition}
            className="flex items-center gap-1.5 px-3.5 text-[12px] font-semibold text-plt-profit hover:bg-plt-profit/10 transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </div>

        {/* Row 2: Full-width status switch */}
        <div className="pill-switch w-full">
          {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`pill-switch-btn flex-1 text-center ${
                filter === value ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              {formatUiLabel(value)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

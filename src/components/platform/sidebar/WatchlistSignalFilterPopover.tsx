'use client';

import React, { useRef, useEffect } from 'react';
import {
  Check,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
} from '@/components/ui/icon-library';

export interface SignalFilterConfig {
  isActive: boolean;
  strategies: string[]; // 'psi', 'thoth_egx_macro', 'psi_v2'
  signals: ('BUY' | 'SELL')[];
  lookbackDays: number; // 1, 3, 5, 7, 14
}

export const DEFAULT_SIGNAL_FILTER: SignalFilterConfig = {
  isActive: false,
  strategies: ['psi', 'thoth_egx_macro', 'psi_v2'],
  signals: ['BUY'],
  lookbackDays: 5,
};

interface WatchlistSignalFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  filter: SignalFilterConfig;
  onChange: (newFilter: SignalFilterConfig) => void;
  matchingCount: number;
  totalCount: number;
}

const STRATEGY_OPTIONS = [
  {
    id: 'psi',
    label: 'PSI Strategy',
    sub: 'Consensus & Inflection',
    badge: 'PSI',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    id: 'thoth_egx_macro',
    label: 'THOTH EGX V3.7P',
    sub: 'Macro Exhaustion Transformer',
    badge: 'THOTH',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    id: 'psi_v2',
    label: 'PSI V2 Strategy',
    sub: '3-Vector Momentum Architecture',
    badge: 'PSI V2',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
];

const LOOKBACK_OPTIONS = [
  { value: 1, label: '1D', desc: 'Today' },
  { value: 3, label: '3D', desc: '3 Days' },
  { value: 5, label: '5D', desc: '5 Days' },
  { value: 7, label: '7D', desc: '1 Week' },
  { value: 14, label: '14D', desc: '2 Weeks' },
];

export default function WatchlistSignalFilterPopover({
  isOpen,
  onClose,
  filter,
  onChange,
  matchingCount,
  totalCount,
}: WatchlistSignalFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleStrategy = (id: string) => {
    let next: string[];
    if (filter.strategies.includes(id)) {
      if (filter.strategies.length === 1) return; // keep at least 1
      next = filter.strategies.filter((s) => s !== id);
    } else {
      next = [...filter.strategies, id];
    }
    onChange({
      ...filter,
      strategies: next,
      isActive: true,
    });
  };

  const toggleSignal = (sig: 'BUY' | 'SELL') => {
    let next: ('BUY' | 'SELL')[];
    if (filter.signals.includes(sig)) {
      if (filter.signals.length === 1) return; // keep at least 1
      next = filter.signals.filter((s) => s !== sig);
    } else {
      next = [...filter.signals, sig];
    }
    onChange({
      ...filter,
      signals: next,
      isActive: true,
    });
  };

  const setLookback = (days: number) => {
    onChange({
      ...filter,
      lookbackDays: days,
      isActive: true,
    });
  };

  const handleReset = () => {
    onChange({
      ...DEFAULT_SIGNAL_FILTER,
      isActive: false,
    });
  };

  const toggleActive = () => {
    onChange({
      ...filter,
      isActive: !filter.isActive,
    });
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-11 right-2 z-50 w-72 rounded-lg border border-plt-border bg-plt-raised shadow-2xl p-3 text-plt-text text-[11px] select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-plt-border/60">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-plt-accent" />
          <span className="font-semibold text-[12px] text-plt-text">Signal Screener</span>
        </div>
        <div className="flex items-center gap-2">
          {filter.isActive && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset to default"
              className="text-[10px] text-plt-muted hover:text-plt-text flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-plt-hover"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-plt-muted hover:text-plt-text p-0.5 rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Filter On/Off Switch */}
      <div className="flex items-center justify-between bg-plt-bg/60 border border-plt-border/50 rounded-md p-2 mb-3">
        <div className="flex flex-col">
          <span className="font-medium text-[11px] text-plt-text">Filter Tickers List</span>
          <span className="text-[10px] text-plt-muted">
            {filter.isActive
              ? `Filtering active (${matchingCount} matched)`
              : 'Showing all tickers'}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            filter.isActive ? 'bg-plt-accent' : 'bg-plt-border'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              filter.isActive ? 'translate-x-3.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Strategies Selection */}
      <div className="mb-3">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-plt-muted mb-1.5 flex items-center justify-between">
          <span>Strategies</span>
          <span className="text-[9px] lowercase text-plt-faint font-normal">select 1 or more</span>
        </div>
        <div className="space-y-1">
          {STRATEGY_OPTIONS.map((strat) => {
            const isSelected = filter.strategies.includes(strat.id);
            return (
              <button
                key={strat.id}
                type="button"
                onClick={() => toggleStrategy(strat.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md border text-left transition-all ${
                  isSelected
                    ? 'bg-plt-hover border-plt-border-strong text-plt-text'
                    : 'bg-transparent border-plt-border/30 text-plt-muted hover:bg-plt-hover/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-plt-accent border-plt-accent text-plt-raised'
                        : 'border-plt-border bg-plt-bg'
                    }`}
                  >
                    {isSelected && <Check size={10} className="stroke-[3]" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate text-[11px] leading-tight">
                      {strat.label}
                    </span>
                    <span className="text-[9px] text-plt-muted truncate leading-tight">
                      {strat.sub}
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] font-mono px-1 py-0.5 rounded border ${strat.color}`}>
                  {strat.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Signal Type Selection */}
      <div className="mb-3">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-plt-muted mb-1.5 flex items-center justify-between">
          <span>Signal Type</span>
          <span className="text-[9px] lowercase text-plt-faint font-normal">buy, sell or both</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => toggleSignal('BUY')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all ${
              filter.signals.includes('BUY')
                ? 'bg-plt-profit/15 border-plt-profit/50 text-plt-profit'
                : 'bg-transparent border-plt-border/40 text-plt-muted hover:bg-plt-hover/50'
            }`}
          >
            <TrendingUp size={12} />
            <span>Buy Signals</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSignal('SELL')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all ${
              filter.signals.includes('SELL')
                ? 'bg-plt-risk/15 border-plt-risk/50 text-plt-risk'
                : 'bg-transparent border-plt-border/40 text-plt-muted hover:bg-plt-hover/50'
            }`}
          >
            <TrendingDown size={12} />
            <span>Sell Signals</span>
          </button>
        </div>
      </div>

      {/* Lookback Window */}
      <div className="mb-3">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-plt-muted mb-1.5 flex items-center justify-between">
          <span>Lookback Window</span>
          <span className="text-[9px] font-mono text-plt-text">
            Last {filter.lookbackDays} trading days
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {LOOKBACK_OPTIONS.map((opt) => {
            const isSelected = filter.lookbackDays === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLookback(opt.value)}
                className={`flex flex-col items-center justify-center py-1 rounded border text-[10px] font-mono transition-all ${
                  isSelected
                    ? 'bg-plt-accent/15 border-plt-accent text-plt-accent font-semibold'
                    : 'bg-transparent border-plt-border/40 text-plt-muted hover:bg-plt-hover/60 hover:text-plt-text'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Live Count & Apply */}
      <div className="pt-2 border-t border-plt-border/60 flex items-center justify-between">
        <div className="text-[10px] text-plt-muted">
          {filter.isActive ? (
            <span className="text-plt-profit font-medium">
              {matchingCount} of {totalCount} tickers
            </span>
          ) : (
            <span>{totalCount} total tickers</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!filter.isActive) {
              onChange({ ...filter, isActive: true });
            }
            onClose();
          }}
          className="px-2.5 py-1 rounded bg-plt-accent text-plt-raised font-semibold text-[10px] hover:opacity-90 transition-opacity"
        >
          {filter.isActive ? 'Done' : 'Apply Filter'}
        </button>
      </div>
    </div>
  );
}

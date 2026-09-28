'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, ChevronUp, Sparkles } from '@/components/ui/icon-library';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import { resolveStrategyMeta } from './StrategySwitcher';
import MarketSignalRowItem, { type GroupedMarketSignal } from './MarketSignalRowItem';

interface MarketSignalsSectionProps {
  buyOpportunities: Opportunity[];
  isLoading?: boolean;
}

type QuickRange = '1D' | '5D' | '10D';

function MarketSignalsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2" role="status" aria-live="polite" aria-label="Scanning strategy models for fresh market entry signals">
      <span className="sr-only">Scanning strategy models for fresh market entry signals…</span>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-white/[0.08] py-3.5 animate-pulse">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/5 bg-white/[0.10]" />
            <div className="h-2.5 w-2/5 bg-white/[0.06]" />
          </div>
          <div className="h-3 w-12 shrink-0 bg-white/[0.10]" />
        </div>
      ))}
    </div>
  );
}

export default function MarketSignalsSection({
  buyOpportunities = [],
  isLoading = false,
}: MarketSignalsSectionProps) {
  const [quickRange, setQuickRange] = useState<QuickRange | null>('5D');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Keep one complete winning-model record per ticker. Never mix the signal
  // date from one strategy with alpha or metrics from another.
  const groupedSignals = useMemo(() => {
    const map = new Map<string, GroupedMarketSignal>();

    for (const opp of buyOpportunities) {
      const cleanSymbol = opp.symbol.replace('.CA', '').trim().toUpperCase();
      const stratMeta = resolveStrategyMeta(opp.strategyId, opp.strategyShortName);
      const barsAgo = opp.signal.barsAgo ?? opp.signalAgeBars ?? null;
      const candidateAlpha = typeof opp.metrics?.alpha === 'number' && Number.isFinite(opp.metrics.alpha)
        ? opp.metrics.alpha
        : null;
      const existing = map.get(cleanSymbol);

      if (existing && (existing.winningAlpha ?? Number.NEGATIVE_INFINITY) >= (candidateAlpha ?? Number.NEGATIVE_INFINITY)) {
        continue;
      }

      map.set(cleanSymbol, {
        symbol: opp.symbol,
        cleanSymbol,
        companyName: opp.companyName || cleanSymbol,
        sector: opp.sector || 'Equities',
        rotationRegime: opp.rotationRegime,
        logoUrl: opp.logoUrl,
        strategies: [stratMeta],
        signalPrice: opp.signal.price,
        signalDate: opp.signal.date,
        barsAgo,
        winningAlpha: candidateAlpha,
        metrics: opp.metrics,
        rawOpportunities: [opp],
      });
    }

    return Array.from(map.values());
  }, [buyOpportunities]);

  // Unique signal dates sorted descending (latest first)
  const sortedSignalDates = useMemo(() => {
    const dates = groupedSignals
      .map((s) => s.signalDate)
      .filter(Boolean) as string[];
    return Array.from(new Set(dates)).sort().reverse();
  }, [groupedSignals]);

  // Handle Quick Range selection (1D, 5D, 10D)
  const handleQuickRangeClick = (r: QuickRange) => {
    setQuickRange(r);
    setShowAllSignals(false);
    const latest = sortedSignalDates[0] || new Date().toISOString().split('T')[0];
    setToDate(latest);

    if (r === '1D') {
      const from = sortedSignalDates[0] || latest;
      setFromDate(from);
    } else if (r === '5D') {
      const idx = Math.min(4, sortedSignalDates.length - 1);
      const from = sortedSignalDates[idx] || latest;
      setFromDate(from);
    } else if (r === '10D') {
      const idx = Math.min(9, sortedSignalDates.length - 1);
      const from = sortedSignalDates[idx] || latest;
      setFromDate(from);
    }
  };

  const effectiveToDate = toDate || sortedSignalDates[0] || '';
  const defaultFromIndex = Math.min(4, sortedSignalDates.length - 1);
  const effectiveFromDate = fromDate || sortedSignalDates[defaultFromIndex] || effectiveToDate;

  // Filter grouped opportunities by date range
  const filteredSignals = useMemo(() => {
    return groupedSignals.filter((sig) => {
      if (quickRange === '1D') {
        if (sig.barsAgo != null) return sig.barsAgo < 1;
        if (effectiveFromDate && sig.signalDate && sig.signalDate < effectiveFromDate) return false;
      } else if (quickRange === '5D') {
        if (sig.barsAgo != null) return sig.barsAgo < 5;
        if (effectiveFromDate && sig.signalDate && sig.signalDate < effectiveFromDate) return false;
      } else if (quickRange === '10D') {
        if (sig.barsAgo != null) return sig.barsAgo < 10;
        if (effectiveFromDate && sig.signalDate && sig.signalDate < effectiveFromDate) return false;
      } else {
        // Custom date range selected by user
        if (effectiveFromDate && sig.signalDate && sig.signalDate < effectiveFromDate) return false;
        if (effectiveToDate && sig.signalDate && sig.signalDate > effectiveToDate) return false;
      }

      return true;
    });
  }, [groupedSignals, quickRange, effectiveFromDate, effectiveToDate]);

  const INITIAL_SIGNALS = 6;
  const [showAllSignals, setShowAllSignals] = useState(false);

  const visibleSignals = showAllSignals ? filteredSignals : filteredSignals.slice(0, INITIAL_SIGNALS);

  return (
    <section id="section-market-signals" className="section-container section-viewport-fit space-y-4">
      {/* 1. Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Market Signals</h2>
            <span className="badge-count">
              {filteredSignals.length}
            </span>
          </div>
          <p className="section-subtitle">
            Live algorithmic buy opportunities computed across quantitative strategy models
          </p>
        </div>
      </div>

      {/* 2. Date Range & Quick Buttons */}
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          {/* Quick Range Switch Buttons */}
          <div className="seg-control shrink-0 [&_.seg-control-btn]:px-2">
            {(['1D', '5D', '10D'] as const).map((r) => {
              const isActive = quickRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickRangeClick(r)}
                  className={`seg-control-btn ${isActive ? 'seg-control-btn-active' : ''}`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* From / To Date Inputs */}
          <div className="flex h-9 min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised px-2 text-xs text-text-muted sm:gap-2 sm:px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 font-sans">From</span>
            <input
              type="date"
              value={effectiveFromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setQuickRange(null);
                setShowAllSignals(false);
              }}
              className="w-full min-w-0 max-w-[118px] flex-1 cursor-pointer bg-transparent font-sans text-xs tabular-nums text-text-primary outline-none [color-scheme:dark]"
            />
            <span className="text-zinc-600 text-xs shrink-0 select-none">•</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 font-sans">To</span>
            <input
              type="date"
              value={effectiveToDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setQuickRange(null);
                setShowAllSignals(false);
              }}
              className="w-full min-w-0 max-w-[118px] flex-1 cursor-pointer bg-transparent font-sans text-xs tabular-nums text-text-primary outline-none [color-scheme:dark]"
            />
          </div>
      </div>

      {/* 3. Main Signals List / Grid */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <MarketSignalsSkeleton />
        ) : filteredSignals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <Sparkles className="w-6 h-6 text-text-muted/50 mb-2" />
            <span>No fresh buy signals from active strategies at this moment.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
              {visibleSignals.map((item) => (
                <MarketSignalRowItem
                  key={item.cleanSymbol}
                  item={item}
                />
              ))}
            </div>

            {filteredSignals.length > INITIAL_SIGNALS && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllSignals((prev) => !prev)}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-hover-raised text-text-muted hover:text-text-primary border border-border-subtle text-xs font-medium font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span>{showAllSignals ? 'Show top 6 signals' : `Show all ${filteredSignals.length} signals`}</span>
                  {showAllSignals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer: View Full Screener on bottom left & Signal Count */}
      {filteredSignals.length > 0 && (
        <div className="pt-3 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border-subtle/60">
          <Link
            href="/invest"
            className="text-xs font-semibold text-brand-blue hover:text-brand-blue-light inline-flex items-center gap-1 transition-colors"
          >
            View full screener
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-[11px] text-text-muted">
            Showing {visibleSignals.length} of {filteredSignals.length} potential buy signals
          </span>
        </div>
      )}
    </section>
  );
}

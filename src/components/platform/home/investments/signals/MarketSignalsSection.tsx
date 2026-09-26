'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, ChevronUp, Sparkles, Loader2 } from '@/components/ui/icon-library';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import StrategySwitcher, { KNOWN_STRATEGIES, resolveStrategyMeta } from './StrategySwitcher';
import MarketSignalRowItem, { type GroupedMarketSignal } from './MarketSignalRowItem';

interface MarketSignalsSectionProps {
  buyOpportunities: Opportunity[];
  isLoading?: boolean;
}

type QuickRange = '1D' | '5D' | '10D';

export default function MarketSignalsSection({
  buyOpportunities = [],
  isLoading = false,
}: MarketSignalsSectionProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [quickRange, setQuickRange] = useState<QuickRange | null>('5D');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Deduplicate and group buy opportunities by ticker symbol
  const groupedSignals = useMemo(() => {
    const map = new Map<string, GroupedMarketSignal>();

    for (const opp of buyOpportunities) {
      const cleanSymbol = opp.symbol.replace('.CA', '').trim().toUpperCase();
      const stratMeta = resolveStrategyMeta(opp.strategyId, opp.strategyShortName);
      const barsAgo = (opp.signal as any)?.barsAgo ?? (opp as any)?.signalAgeBars ?? null;

      if (!map.has(cleanSymbol)) {
        map.set(cleanSymbol, {
          symbol: opp.symbol,
          cleanSymbol,
          companyName: opp.companyName || cleanSymbol,
          sector: opp.sector || 'Equities',
          logoUrl: opp.logoUrl,
          strategies: [stratMeta],
          signalPrice: opp.signal.price,
          signalDate: opp.signal.date,
          barsAgo,
          metrics: opp.metrics,
          rawOpportunities: [opp],
        });
      } else {
        const existing = map.get(cleanSymbol)!;
        // Avoid duplicate strategy badges for the same model
        if (!existing.strategies.some((s) => s.id === stratMeta.id)) {
          existing.strategies.push(stratMeta);
        }
        // Inherit metrics if missing
        if (!existing.metrics?.buyHoldReturn && opp.metrics?.buyHoldReturn) {
          existing.metrics = opp.metrics;
        }
        // Keep the latest price if this opp is more recent
        if (opp.signal.date && (!existing.signalDate || opp.signal.date > existing.signalDate)) {
          existing.signalPrice = opp.signal.price;
          existing.signalDate = opp.signal.date;
          if (barsAgo != null) existing.barsAgo = barsAgo;
        }
        existing.rawOpportunities?.push(opp);
      }
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

  // Initialize dates on first load when signals arrive
  useEffect(() => {
    if (sortedSignalDates.length > 0 && !fromDate && !toDate) {
      handleQuickRangeClick('5D');
    }
  }, [sortedSignalDates]);

  // Extract unique strategies present in grouped signals
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    groupedSignals.forEach((sig) => {
      sig.strategies.forEach((s) => set.add(s.id));
    });
    return Array.from(set);
  }, [groupedSignals]);

  // Compute counts per strategy (unique tickers triggering each strategy)
  const strategyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sId of availableStrategies) {
      counts[sId] = 0;
    }
    for (const sig of groupedSignals) {
      for (const s of sig.strategies) {
        counts[s.id] = (counts[s.id] || 0) + 1;
      }
    }
    return counts;
  }, [groupedSignals, availableStrategies]);

  // Filter grouped opportunities by selected strategy and date range
  const filteredSignals = useMemo(() => {
    return groupedSignals.filter((sig) => {
      // 1. Strategy Model Filter
      if (selectedStrategy !== 'ALL') {
        const match = sig.strategies.some((s) => s.id === selectedStrategy);
        if (!match) return false;
      }

      // 2. Date Range Filter
      if (quickRange === '1D') {
        if (sig.barsAgo != null) return sig.barsAgo <= 1;
        if (fromDate && sig.signalDate && sig.signalDate < fromDate) return false;
      } else if (quickRange === '5D') {
        if (sig.barsAgo != null) return sig.barsAgo <= 5;
        if (fromDate && sig.signalDate && sig.signalDate < fromDate) return false;
      } else if (quickRange === '10D') {
        if (sig.barsAgo != null) return sig.barsAgo <= 10;
        if (fromDate && sig.signalDate && sig.signalDate < fromDate) return false;
      } else {
        // Custom date range selected by user
        if (fromDate && sig.signalDate && sig.signalDate < fromDate) return false;
        if (toDate && sig.signalDate && sig.signalDate > toDate) return false;
      }

      return true;
    });
  }, [groupedSignals, selectedStrategy, quickRange, fromDate, toDate]);

  const activeStrategyMeta = KNOWN_STRATEGIES[selectedStrategy];

  const INITIAL_SIGNALS = 6;
  const [showAllSignals, setShowAllSignals] = useState(false);

  // Reset expansion when filtering parameters change
  useEffect(() => {
    setShowAllSignals(false);
  }, [selectedStrategy, quickRange, fromDate, toDate]);

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

      {/* 2. Controls Toolbar: Strategy Switcher + Date Range & Quick Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StrategySwitcher
          selectedStrategy={selectedStrategy}
          onSelectStrategy={setSelectedStrategy}
          availableStrategies={availableStrategies}
          counts={strategyCounts}
          totalCount={groupedSignals.length}
        />

        {/* Right Corner: Quick Access (1D, 5D, 10D) + From / To Date Inputs */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Quick Range Switch Buttons */}
          <div className="seg-control">
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
          <div className="h-9 flex items-center gap-2 bg-surface-raised border border-border-subtle rounded-xl px-3 text-xs text-text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 font-sans">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setQuickRange(null);
              }}
              className="bg-transparent text-text-primary text-xs font-sans tabular-nums outline-none cursor-pointer [color-scheme:dark] w-[118px] shrink-0"
            />
            <span className="text-zinc-600 text-xs shrink-0 select-none">•</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted shrink-0 font-sans">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setQuickRange(null);
              }}
              className="bg-transparent text-text-primary text-xs font-sans tabular-nums outline-none cursor-pointer [color-scheme:dark] w-[118px] shrink-0"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Signals List / Grid */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
            <span>Scanning strategy models for fresh market entry signals...</span>
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <Sparkles className="w-6 h-6 text-text-muted/50 mb-2" />
            <span>
              {selectedStrategy === 'ALL'
                ? 'No fresh buy signals from active strategies at this moment.'
                : `No active buy triggers for ${
                    activeStrategyMeta?.name || selectedStrategy
                  } right now.`}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
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
            {selectedStrategy !== 'ALL' && ` in ${activeStrategyMeta?.name || selectedStrategy}`}
          </span>
        </div>
      )}
    </section>
  );
}

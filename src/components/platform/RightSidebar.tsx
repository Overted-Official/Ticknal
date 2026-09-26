'use client';

import { ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from '@/components/ui/icon-library';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import type { OpportunitySignal } from '@/lib/opportunities';
import WatchlistSignalFilterPopover, {
  type SignalFilterConfig,
  DEFAULT_SIGNAL_FILTER,
} from './sidebar/WatchlistSignalFilterPopover';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface WatchlistItem {
  symbol: string;
  companyName: string;
  website?: string | null;
  sector: string;
  price: string;
  change?: string;
  changePct?: string;
  volume?: string;
  isUp?: boolean;
  hasOpenPosition?: boolean;
  logoUrl?: string | null;
  recentBuyOpportunity?: boolean;
}

interface RightSidebarProps {
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  timeframe?: string;
  rangeData?: {
    dayHigh: number;
    dayLow: number;
    yearHigh: number;
    yearLow: number;
  };
}

export default function RightSidebar({
  watchlist,
  selectedSymbol,
  timeframe = 'D',
  rangeData
}: RightSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: quoteData } = useSWR(`/api/quote?symbol=${selectedSymbol}`, fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 30000,
    revalidateOnFocus: process.env.NODE_ENV === 'development' ? false : true,
  });

  const liveData = useMemo(() => {
    if (!quoteData || !quoteData.data) return null;
    const { close, previous_close } = quoteData.data;
    const change = close - previous_close;
    const changePct = previous_close ? (change / previous_close) * 100 : 0;
    return {
      price: close.toFixed(2),
      change: `${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`,
      changePct: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      isUp: change >= 0
    };
  }, [quoteData]);

  const [searchQuery, setSearchQuery] = useState("");

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHeight, setPanelHeight] = useState(280);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [collapsedSectors, setCollapsedSectors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 160 && newHeight <= 600) {
        setPanelHeight(newHeight);
      }
    };
    const handleMouseUp = () => setIsResizingPanel(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanel]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 440) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Signal Screener & Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [signalFilter, setSignalFilter] = useState<SignalFilterConfig>(DEFAULT_SIGNAL_FILTER);

  // Fetch opportunities/signals across all tickers (cached server-side)
  const { data: oppsData } = useSWR<{ opportunities: OpportunitySignal[] }>(
    '/api/opportunities?bars=15',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );
  const opportunities = oppsData?.opportunities || [];

  // Group opportunities by clean symbol
  const signalsBySymbol = useMemo(() => {
    const map = new Map<string, OpportunitySignal[]>();
    for (const opp of opportunities) {
      const sym = opp.symbol.toUpperCase().replace('.CA', '');
      const list = map.get(sym) || [];
      list.push(opp);
      map.set(sym, list);
    }
    return map;
  }, [opportunities]);

  // Compute matching signals based on active filter config
  const matchingSignalsBySymbol = useMemo(() => {
    if (!signalFilter.isActive) return new Map<string, OpportunitySignal>();

    const result = new Map<string, OpportunitySignal>();
    const stratSet = new Set(signalFilter.strategies);
    const sigSet = new Set(signalFilter.signals);
    const maxBars = signalFilter.lookbackDays;

    for (const [sym, oppList] of signalsBySymbol.entries()) {
      // Find matching signals within selected strategies, directions, and lookback
      const matched = oppList.find((opp) => {
        if (!stratSet.has(opp.strategyId)) return false;
        const isBuy = opp.signal.signal === 'BUY';
        const isSell = opp.signal.signal === 'SELL' || opp.signal.signal.startsWith('SELL_');
        const matchesSig = (isBuy && sigSet.has('BUY')) || (isSell && sigSet.has('SELL'));
        if (!matchesSig) return false;

        const barsAgo = opp.signal.barsAgo ?? 0;
        return barsAgo < maxBars;
      });

      if (matched) {
        result.set(sym, matched);
      }
    }
    return result;
  }, [signalFilter, signalsBySymbol]);

  // Matching tickers count in the watchlist
  const matchingCount = useMemo(() => {
    return watchlist.filter((item) => {
      const sym = item.symbol.toUpperCase().replace('.CA', '');
      return matchingSignalsBySymbol.has(sym);
    }).length;
  }, [watchlist, matchingSignalsBySymbol]);

  const baseSelectedItem = watchlist.find(i => i.symbol === selectedSymbol) || watchlist[0];
  const displaySelectedSymbol = selectedSymbol.replace('.CA', '');

  const selectedItem = liveData
    ? { ...baseSelectedItem, ...liveData }
    : baseSelectedItem;

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter(item => {
      const sym = item.symbol.toUpperCase().replace('.CA', '');

      // 1. Signal Filter
      if (signalFilter.isActive && !matchingSignalsBySymbol.has(sym)) {
        return false;
      }

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.symbol.toLowerCase().includes(q) ||
          item.companyName.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [watchlist, signalFilter.isActive, matchingSignalsBySymbol, searchQuery]);

  const groupedWatchlist = useMemo(() => {
    const groups = new Map<string, WatchlistItem[]>();

    for (const item of filteredWatchlist) {
      // item.sector now carries the GICS industry group (25 groups) or 'Funds' for fund instruments
      const group = item.sector || 'Unclassified';
      const items = groups.get(group) ?? [];
      items.push(item);
      groups.set(group, items);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredWatchlist]);

  const toggleSector = (sector: string) => {
    setCollapsedSectors((current) => {
      const next = new Set(current);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  const [pendingTicker, setPendingTicker] = useState<string | null>(null);

  const openTicker = (symbol: string, strategyId?: string) => {
    if (symbol === selectedSymbol) return;
    setPendingTicker(symbol);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('ticker', symbol);
    params.set('timeframe', timeframe);
    params.set('view', 'chart');
    if (strategyId) {
      params.set('strategy', strategyId);
    }
    router.push(`?${params.toString()}`);
  };

  const currentPriceNum = parseFloat(selectedItem?.price || '0');
  const validPrice = !isNaN(currentPriceNum) && currentPriceNum > 0 ? currentPriceNum : 100;
  const dLow = quoteData?.dayLow ?? (rangeData?.dayHigh ? rangeData.dayLow : (quoteData?.low ? Number(quoteData.low) : validPrice * 0.98));
  const dHigh = quoteData?.dayHigh ?? (rangeData?.dayHigh ? rangeData.dayHigh : (quoteData?.high ? Number(quoteData.high) : validPrice * 1.02));
  const yLow = quoteData?.yearLow ?? (rangeData?.yearLow ? rangeData.yearLow : validPrice * 0.6);
  const yHigh = quoteData?.yearHigh ?? (rangeData?.yearHigh ? rangeData.yearHigh : validPrice * 1.15);

  const dayPct = Math.min(100, Math.max(0, ((validPrice - dLow) / (dHigh - dLow || 1)) * 100));
  const yearPct = Math.min(100, Math.max(0, ((validPrice - yLow) / (yHigh - yLow || 1)) * 100));

  return (
    <div
      className="bg-cold-gray-900 border-l border-border-subtle flex flex-col select-none relative shrink-0 text-plt-text font-sans"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/40 active:bg-white/70 z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Search bar + filter */}
      <div className="p-2 border-b border-white/[0.08] bg-cold-gray-900 shrink-0 flex items-center gap-1.5">
        <div className="relative flex items-center flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-muted">
            <Search size={13} />
          </div>
          <input
            type="text"
            placeholder="Search tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded-md bg-surface-input border border-border-subtle pl-7 pr-6 text-[11px] text-text-primary placeholder:text-text-muted placeholder:text-[11px] focus:border-border-input-hover focus:outline-none transition-colors leading-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-text-muted hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            title={
              signalFilter.isActive
                ? `Signal Filter Active (${matchingCount} tickers matched)`
                : 'Filter tickers by strategy signals'
            }
            aria-label="Filter tickers"
            className={`h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-all relative ${
              signalFilter.isActive
                ? 'bg-brand-blue/15 border-brand-blue text-brand-blue shadow-xs'
                : isFilterOpen
                ? 'bg-surface-active border-border-subtle text-white'
                : 'border-border-subtle bg-surface-raised text-text-muted hover:text-white hover:bg-surface-hover-raised'
            }`}
          >
            <SlidersHorizontal size={13} />
            {signalFilter.isActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-blue border-2 border-cold-gray-900 animate-pulse" />
            )}
          </button>

          <WatchlistSignalFilterPopover
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filter={signalFilter}
            onChange={setSignalFilter}
            matchingCount={matchingCount}
            totalCount={watchlist.length}
          />
        </div>
      </div>

      {/* Active Filter Banner */}
      {signalFilter.isActive && (
        <div className="px-3 py-1 bg-cold-gray-900/90 border-b border-white/[0.08] flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 animate-pulse" />
            <span className="text-text-muted truncate">
              Signals:{' '}
              <span className="text-plt-text font-medium">
                {signalFilter.signals.join('/')}
              </span>{' '}
              ·{' '}
              <span className="text-plt-text font-medium">
                {signalFilter.strategies
                  .map((s) => (s === 'hydra' ? 'Hydra' : s === 'psi_v2' ? 'Cerberus' : s === 'thoth_egx_macro' ? 'Archived' : 'Typhon'))
                  .join(', ')}
              </span>{' '}
              ({signalFilter.lookbackDays}D)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSignalFilter((prev) => ({ ...prev, isActive: false }))}
            className="btn-typography text-text-muted hover:text-loss-num px-1 py-0.5 rounded transition-colors shrink-0 ml-1 hover:bg-surface-hover-subtle"
            title="Clear filter"
          >
            Clear
          </button>
        </div>
      )}

      {/* Columns Header */}
      <div className="watchlist-header shrink-0">
        <div className="truncate">Symbol</div>
        <div className="text-right">Last</div>
        <div className="text-right">Chg%</div>
        <div className="text-right">Vol</div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {groupedWatchlist.length === 0 ? (
          <div className="p-6 text-center text-text-muted flex flex-col items-center justify-center space-y-2 h-52">
            <SlidersHorizontal size={22} className="text-text-muted stroke-1" />
            <p className="text-[11px] font-medium text-plt-text">No matching tickers</p>
            <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
              {signalFilter.isActive
                ? `No tickers had a ${signalFilter.signals.join(' or ')} signal from ${signalFilter.strategies.map(s => s === 'hydra' ? 'Hydra' : s === 'psi_v2' ? 'Cerberus' : s === 'thoth_egx_macro' ? 'Archived' : 'Typhon').join(', ')} in the last ${signalFilter.lookbackDays} days.`
                : 'Try a different search query.'}
            </p>
            {signalFilter.isActive && (
              <button
                type="button"
                onClick={() => setSignalFilter((prev) => ({ ...prev, isActive: false }))}
                className="mt-1 btn-typography text-brand-blue hover:underline"
              >
                Clear signal filter
              </button>
            )}
          </div>
        ) : (
          groupedWatchlist.map(([sector, items]) => {
            const collapsed = collapsedSectors.has(sector) && searchQuery.length === 0;
            return (
              <div key={sector}>
                {/* Sector group header */}
                <button
                  type="button"
                  onClick={() => toggleSector(sector)}
                  className="flex w-full items-center gap-1.5 px-2.5 h-[25px] text-left text-[10.5px] tracking-wider text-text-muted transition-colors hover:text-plt-text group border-b border-white/[0.08] bg-cold-gray-900 sticky top-0 z-10"
                >
                  {collapsed ? <ChevronRight size={13} className="text-text-muted/60 group-hover:text-plt-text shrink-0" /> : <ChevronDown size={13} className="text-text-muted/60 group-hover:text-plt-text shrink-0" />}
                  <span className="min-w-0 flex-1 truncate font-medium">{sector}</span>
                  <span className="text-[9.5px] tabular-nums px-1.5 leading-none h-4 inline-flex items-center rounded bg-surface-raised text-text-muted shrink-0">{items.length}</span>
                </button>

                {!collapsed && items.map((item) => {
                  const isSelected = item.symbol === selectedSymbol;
                  const changePctDisplay = item.changePct || (item.change ? item.change.split('(')[1]?.replace(')', '') : '0.00%');
                  const isPositive = item.isUp;
                  const isPendingThis = pendingTicker === item.symbol && selectedSymbol !== item.symbol;
                  const symClean = item.symbol.toUpperCase().replace('.CA', '');
                  const matchingSignal = matchingSignalsBySymbol.get(symClean);
                  
                  return (
                    <div
                      key={item.symbol}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTicker(item.symbol, matchingSignal?.strategyId)}
                      className={`watchlist-row cursor-pointer group border-b border-white/[0.06] ${
                        isPendingThis
                          ? 'bg-white/[0.04] animate-pulse'
                          : isSelected
                            ? 'watchlist-row-active bg-white/[0.08]'
                            : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center space-x-1.5">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.symbol} className="ticker-logo-image h-3.5 w-3.5 shrink-0" />
                        ) : item.website ? (
                          <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="ticker-logo-image h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-plt-border bg-plt-hover text-[8px] font-medium text-plt-text">
                            {item.symbol.substring(0, 2)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`truncate text-[11px] font-medium leading-none ${isSelected ? 'text-plt-text font-semibold' : 'text-plt-text group-hover:text-plt-text'}`}>
                            {item.symbol.replace('.CA', '')}
                          </span>
                          {matchingSignal && (
                            <span
                              title={`${matchingSignal.strategyLabel}: ${matchingSignal.signal.signal} on ${matchingSignal.signal.date} (${matchingSignal.signal.barsAgo ?? 0} bars ago)`}
                              className={`text-[7.5px] font-sans tabular-nums font-semibold px-1 py-[1.5px] rounded leading-none border shrink-0 ${
                                matchingSignal.signal.signal === 'BUY'
                                  ? 'bg-profit-num/15 text-profit-num border-profit-num/30'
                                  : 'bg-loss-num/15 text-loss-num border-loss-num/30'
                              }`}
                            >
                              {matchingSignal.signal.signal}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right font-sans font-medium text-plt-text text-[11px] tabular-nums whitespace-nowrap leading-none">
                        {item.price}
                      </div>
                      <div className={`text-right font-sans font-medium text-[11px] tabular-nums whitespace-nowrap leading-none ${
                        isPositive ? 'text-profit-num' : 'text-loss-num'
                      }`}>
                        {changePctDisplay}
                      </div>
                      <div className="text-right font-sans font-medium text-plt-muted text-[10.5px] tabular-nums whitespace-nowrap truncate leading-none">
                        {item.volume || '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {selectedItem && (
        <div
          className="border-t border-white/[0.08] bg-cold-gray-900 flex flex-col shrink-0 relative overflow-hidden transition-all duration-200"
          style={{ height: isDetailsCollapsed ? 'auto' : `${panelHeight}px` }}
        >
          {!isDetailsCollapsed && (
            <div
              className="absolute top-0 left-0 right-0 h-2 cursor-row-resize hover:bg-white/40 active:bg-white/70 z-50 transition-colors"
              onMouseDown={() => setIsResizingPanel(true)}
            />
          )}

          <div
            onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
            className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer hover:bg-surface-hover-subtle transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0">
              {selectedItem.logoUrl ? (
                <img src={selectedItem.logoUrl} alt={selectedItem.symbol} className="ticker-logo-image w-6 h-6 shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-xl bg-surface-raised flex items-center justify-center font-medium text-plt-text border border-border-subtle text-compact shrink-0">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium text-plt-text text-xs tracking-tight truncate">{displaySelectedSymbol}</span>
                {isDetailsCollapsed && (
                  <span className={`text-[11px] tabular-nums font-semibold ${selectedItem.isUp ? 'text-profit-num' : 'text-loss-num'}`}>
                    {selectedItem.price || '0.00'} {['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'USD' : 'EGP'}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl text-text-muted hover:text-plt-text transition-colors"
              aria-label={isDetailsCollapsed ? 'Expand details' : 'Collapse details'}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isDetailsCollapsed ? 'rotate-180 text-text-muted' : ''}`} />
            </button>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-3 font-sans">
              {/* Company Name & Market/Sector */}
              <div>
                <div className="text-plt-text text-[11px] font-medium leading-snug">
                  {selectedItem.companyName}
                </div>
                <div className="flex items-center text-[10px] text-text-muted space-x-1.5 mt-0.5">
                  <span>{['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'COMEX' : selectedSymbol.toUpperCase() === 'USDEGP' ? 'FOREX' : 'EGX'}</span>
                  {selectedItem.sector && (
                    <>
                      <span>•</span>
                      <span className="truncate">{selectedItem.sector}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Price & Change */}
              <div className="py-1 space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-bold tabular-nums tracking-tight ${selectedItem.isUp ? 'text-profit-num' : 'text-loss-num'}`}>
                    {selectedItem.price || '0.00'}
                  </span>
                  <span className="text-[11px] text-text-muted font-sans font-medium">
                    {['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'USD' : 'EGP'}
                  </span>
                  <div className={`ml-2 text-xs font-semibold tabular-nums ${selectedItem.isUp ? 'text-profit-num' : 'text-loss-num'}`}>
                    {selectedItem.changePct || (selectedItem.change ? (selectedItem.change.includes('(') ? selectedItem.change.split('(')[1]?.replace(')', '') : selectedItem.change) : '')}
                  </div>
                </div>

                <div className="flex items-center text-text-muted text-[10px]">
                  <span>Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:28 GMT+3</span>
                </div>
              </div>

              {/* Day's Range & 52Wk Range */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5 font-sans">
                    <span className="text-plt-text tabular-nums font-semibold">{dLow.toFixed(2)}</span>
                    <span className="text-text-muted text-[10px] tracking-wider font-sans font-medium uppercase">Day&apos;s Range</span>
                    <span className="text-plt-text tabular-nums font-semibold">{dHigh.toFixed(2)}</span>
                  </div>
                  {/* Track */}
                  <div className="h-1.5 bg-surface-raised rounded-full relative overflow-hidden">
                    <div
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-profit-num' : 'bg-loss-num'}`}
                      style={{ width: `${dayPct}%`, left: 0 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1.5 font-sans">
                    <span className="text-plt-text tabular-nums font-semibold">{yLow.toFixed(2)}</span>
                    <span className="text-text-muted text-[10px] tracking-wider font-sans font-medium uppercase">52Wk Range</span>
                    <span className="text-plt-text tabular-nums font-semibold">{yHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-raised rounded-full relative overflow-hidden">
                    <div
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-profit-num' : 'bg-loss-num'}`}
                      style={{ width: `${yearPct}%`, left: 0 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { ChevronDown, ChevronRight, Search, SlidersHorizontal, X } from '@/components/ui/icon-library';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

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
    refreshInterval: 15000,
    revalidateOnFocus: true,
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

  const [sidebarWidth, setSidebarWidth] = useState(280);
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
      if (newWidth >= 240 && newWidth <= 440) {
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

  const baseSelectedItem = watchlist.find(i => i.symbol === selectedSymbol) || watchlist[0];
  const displaySelectedSymbol = selectedSymbol.replace('.CA', '');

  const selectedItem = liveData
    ? { ...baseSelectedItem, ...liveData }
    : baseSelectedItem;

  const filteredWatchlist = watchlist.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
    );
  });

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

  const openTicker = (symbol: string) => {
    if (symbol === selectedSymbol) return;
    setPendingTicker(symbol);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('ticker', symbol);
    params.set('timeframe', timeframe);
    params.set('view', 'chart');
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
      className="bg-plt-raised border-l border-plt-border flex flex-col select-none relative shrink-0 text-plt-text"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/40 active:bg-white/70 z-50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      <div className="p-2 border-b border-plt-border bg-plt-raised shrink-0 flex items-center gap-1.5">
        <div className="relative flex items-center flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-plt-muted">
            <Search size={13} />
          </div>
          <input
            type="text"
            placeholder="Search tickers or sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded-md bg-plt-raised border border-plt-border pl-7 pr-6 text-[11px] text-plt-text placeholder:text-plt-muted placeholder:text-[11px] focus:border-plt-border-strong focus:outline-none transition-colors leading-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-plt-muted hover:text-plt-text transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled
          title="Filter tickers (Coming soon)"
          aria-label="Filter tickers"
          className="h-7 w-7 rounded-md border border-plt-border bg-plt-raised flex items-center justify-center text-plt-muted opacity-45 cursor-not-allowed shrink-0 transition-colors hover:bg-plt-hover"
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {/* Columns Header */}
      <div className="watchlist-header shrink-0">
        <div className="truncate">Symbol</div>
        <div className="text-right">Last</div>
        <div className="text-right">Chg%</div>
        <div className="text-right">Vol</div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {groupedWatchlist.map(([sector, items]) => {
          const collapsed = collapsedSectors.has(sector) && searchQuery.length === 0;
          return (
            <div key={sector}>
              <button
                type="button"
                onClick={() => toggleSector(sector)}
                className="flex w-full items-center gap-1.5 px-3 py-1 text-left text-[11px] tracking-wider text-plt-muted transition-colors hover:text-plt-text group border-b border-plt-border/40"
              >
                {collapsed ? <ChevronRight size={14} className="text-plt-faint group-hover:text-plt-text" /> : <ChevronDown size={14} className="text-plt-faint group-hover:text-plt-text" />}
                <span className="min-w-0 flex-1 truncate font-medium">{sector}</span>
                <span className="text-[10px] tabular-nums px-1.5 leading-none h-4 inline-flex items-center rounded bg-plt-hover text-plt-muted">{items.length}</span>
              </button>

              {!collapsed && items.map((item) => {
                const isSelected = item.symbol === selectedSymbol;
                const changePctDisplay = item.changePct || (item.change ? item.change.split('(')[1]?.replace(')', '') : '0.00%');
                const isPositive = item.isUp;
                const isPendingThis = pendingTicker === item.symbol && selectedSymbol !== item.symbol;
                
                return (
                  <div
                    key={item.symbol}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTicker(item.symbol)}
                    className={`watchlist-row cursor-pointer group ${
                      isPendingThis
                        ? 'bg-plt-hover animate-pulse'
                        : isSelected
                          ? 'watchlist-row-active'
                          : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center space-x-1.5">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} alt={item.symbol} className="h-3.5 w-3.5 rounded-full bg-transparent object-contain shrink-0" />
                      ) : item.website ? (
                        <img src={`https://logo.clearbit.com/${item.website}`} alt={item.symbol} className="h-3.5 w-3.5 rounded-full border border-plt-border bg-plt-hover object-cover shrink-0" />
                      ) : (
                        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-plt-border bg-plt-hover text-[8px] font-medium text-plt-text">
                          {item.symbol.substring(0, 2)}
                        </div>
                      )}
                      <span className={`truncate text-[11px] font-medium leading-none ${isSelected ? 'text-plt-text font-semibold' : 'text-plt-text group-hover:text-plt-text'}`}>
                        {item.symbol.replace('.CA', '')}
                      </span>
                    </div>
                    <div className="text-right font-sans font-medium text-plt-text text-[11px] tabular-nums whitespace-nowrap leading-none">
                      {item.price}
                    </div>
                    <div className={`text-right font-sans font-medium text-[11px] tabular-nums whitespace-nowrap leading-none ${
                      isPositive ? 'text-plt-profit' : 'text-plt-risk'
                    }`}>
                      {changePctDisplay}
                    </div>
                    <div className="text-right font-sans font-medium text-plt-muted text-[11px] tabular-nums whitespace-nowrap truncate leading-none">
                      {item.volume || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {selectedItem && (
        <div
          className="border-t border-plt-border bg-plt-raised flex flex-col shrink-0 relative overflow-hidden transition-all duration-200"
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
            className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer hover:bg-plt-hover transition-colors"
          >
            <div className="flex items-center space-x-2 min-w-0">
              {selectedItem.logoUrl ? (
                <img src={selectedItem.logoUrl} alt={selectedItem.symbol} className="w-6 h-6 rounded-xl bg-transparent object-contain shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-xl bg-plt-hover flex items-center justify-center font-medium text-plt-text border border-plt-border text-compact shrink-0">
                  {displaySelectedSymbol.substring(0, 2)}
                </div>
              )}
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium text-plt-text text-xs tracking-tight truncate">{displaySelectedSymbol}</span>
                {isDetailsCollapsed && (
                  <span className={`text-[11px] tabular-nums font-semibold ${selectedItem.isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {selectedItem.price || '0.00'} {['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'USD' : 'EGP'}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl text-plt-muted hover:text-plt-text transition-colors"
              aria-label={isDetailsCollapsed ? 'Expand details' : 'Collapse details'}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${isDetailsCollapsed ? 'rotate-180 text-plt-subtle' : ''}`} />
            </button>
          </div>

          {!isDetailsCollapsed && (
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-3">
              {/* Company Name & Market/Sector (Smaller Text, No redundant icon) */}
              <div>
                <div className="text-plt-text text-[11px] font-medium leading-snug">
                  {selectedItem.companyName}
                </div>
                <div className="flex items-center text-[10px] text-plt-muted space-x-1.5 mt-0.5">
                  <span>{['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'COMEX' : selectedSymbol.toUpperCase() === 'USDEGP' ? 'FOREX' : 'EGX'}</span>
                  {selectedItem.sector && (
                    <>
                      <span>•</span>
                      <span className="truncate">{selectedItem.sector}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Price & Change (Cardless, cleanly aligned) */}
              <div className="py-1 space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className={`text-3xl font-bold tabular-nums tracking-tight ${selectedItem.isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {selectedItem.price || '0.00'}
                  </span>
                  <span className="text-[11px] text-plt-muted font-sans font-medium">
                    {['GC1!', 'SI1!'].includes(selectedSymbol.toUpperCase()) ? 'USD' : 'EGP'}
                  </span>
                  <div className={`ml-2 text-xs font-semibold tabular-nums ${selectedItem.isUp ? 'text-plt-profit' : 'text-plt-risk'}`}>
                    {selectedItem.change ? selectedItem.change.split(' ')[0] : ''} {selectedItem.changePct || ''}
                  </div>
                </div>

                <div className="flex items-center text-plt-muted text-[10px] space-x-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-plt-muted" />
                  <span>Market closed</span>
                  <span>•</span>
                  <span>Last update at {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 14:28 GMT+3</span>
                </div>
              </div>

              {/* Day's Range & 52Wk Range */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                    <span className="text-plt-text tabular-nums font-semibold">{dLow.toFixed(2)}</span>
                    <span className="text-plt-muted text-[10px] tracking-wider font-sans font-medium uppercase">Day&apos;s Range</span>
                    <span className="text-plt-text tabular-nums font-semibold">{dHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-plt-hover rounded-full relative overflow-hidden">
                    <div
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-plt-profit' : 'bg-plt-risk'}`}
                      style={{ width: `${dayPct}%`, left: 0 }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                    <span className="text-plt-text tabular-nums font-semibold">{yLow.toFixed(2)}</span>
                    <span className="text-plt-muted text-[10px] tracking-wider font-sans font-medium uppercase">52Wk Range</span>
                    <span className="text-plt-text tabular-nums font-semibold">{yHigh.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-plt-hover rounded-full relative overflow-hidden">
                    <div
                      className={`absolute h-full rounded-full ${selectedItem.isUp ? 'bg-plt-profit' : 'bg-plt-risk'}`}
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

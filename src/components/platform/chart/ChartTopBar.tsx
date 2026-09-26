'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Search,
  Sparkles,
  BarChart2,
  FileText,
  Briefcase,
  Plus,
  X,
} from '@/components/ui/icon-library';
import type { WatchlistItem } from '@/components/platform/RightSidebar';

export interface ChartTopBarProps {
  symbol: string;
  watchlist: WatchlistItem[];
  timeframe?: string;
  companyName?: string;
  logoUrl?: string | null;
  // Analysis actions
  isPredicting?: boolean;
  isPredictPopoverOpen?: boolean;
  onTogglePredict?: () => void;
  activeIndicatorsCount?: number;
  isIndicatorsPopoverOpen?: boolean;
  onToggleIndicators?: () => void;
  onOpenStrategyReport?: () => void;
  // Portfolio actions
  openPositionsCount?: number;
  onOpenPositionsDrawer?: () => void;
  onOpenAddOrder?: () => void;
}

export default function ChartTopBar({
  symbol,
  watchlist = [],
  timeframe = '1D',
  isPredicting = false,
  isPredictPopoverOpen = false,
  onTogglePredict,
  activeIndicatorsCount = 0,
  isIndicatorsPopoverOpen = false,
  onToggleIndicators,
  onOpenStrategyReport,
  openPositionsCount = 0,
  onOpenPositionsDrawer,
  onOpenAddOrder,
}: ChartTopBarProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'funds'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFundItem = (item: WatchlistItem) => {
    const sym = item.symbol.toUpperCase().replace('.CA', '');
    return (
      item.sector?.toLowerCase() === 'funds' ||
      item.sector?.toLowerCase() === 'fund' ||
      ['CI_QUANT', 'OSOUL', 'COF'].includes(sym)
    );
  };

  const queryFilteredList = useMemo(() => {
    if (!searchQuery.trim()) return watchlist;
    const q = searchQuery.toLowerCase().trim();
    return watchlist.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.sector && item.sector.toLowerCase().includes(q))
    );
  }, [watchlist, searchQuery]);

  const tabCounts = useMemo(() => {
    let stocksCount = 0;
    let fundsCount = 0;
    for (const item of queryFilteredList) {
      if (isFundItem(item)) {
        fundsCount++;
      } else {
        stocksCount++;
      }
    }
    return {
      all: queryFilteredList.length,
      stocks: stocksCount,
      funds: fundsCount,
    };
  }, [queryFilteredList]);

  const searchResults = useMemo(() => {
    let list = queryFilteredList;
    if (activeTab === 'stocks') {
      list = list.filter((item) => !isFundItem(item));
    } else if (activeTab === 'funds') {
      list = list.filter((item) => isFundItem(item));
    }

    if (!searchQuery.trim()) {
      return activeTab === 'funds' ? list : list.slice(0, 30);
    }
    return list;
  }, [queryFilteredList, activeTab, searchQuery]);

  const handleSelectTicker = (tickerSymbol: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(`?ticker=${tickerSymbol}&timeframe=${timeframe}`);
  };

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (isSearchOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsSearchOpen(false);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setActiveTab((prev) => {
            const nextTab = prev === 'all' ? 'stocks' : prev === 'stocks' ? 'funds' : 'all';
            return nextTab;
          });
          setFocusedIndex(0);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) =>
            searchResults.length > 0 ? (prev + 1) % searchResults.length : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) =>
            searchResults.length > 0
              ? (prev - 1 + searchResults.length) % searchResults.length
              : 0
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (searchResults[focusedIndex]) {
            handleSelectTicker(searchResults[focusedIndex].symbol);
          } else if (searchResults[0]) {
            handleSelectTicker(searchResults[0].symbol);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchOpen, searchResults, focusedIndex]);

  // Focus input when search palette opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  return (
    <div className="h-[45px] shrink-0 w-full bg-cold-gray-900 border-b border-white/[0.08] flex items-center justify-between px-2 sm:px-3 select-none text-xs font-sans relative z-30">
      {/* ─── Left Section: Search Bar & Analysis Tools ─── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
        {/* Mobile Search Icon Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className={`sm:hidden h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isSearchOpen
              ? 'bg-white/15 text-white font-semibold'
              : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
          }`}
          title="Search tickers"
          aria-label="Search tickers"
        >
          <Search size={13} />
        </button>

        {/* Desktop Search Trigger Input */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex relative items-center cursor-pointer group"
        >
          <Search
            size={13}
            className="absolute left-2.5 text-text-muted group-hover:text-white transition-colors pointer-events-none"
          />
          <div className="h-7 w-36 sm:w-44 md:w-52 rounded-md bg-white/[0.04] group-hover:bg-white/[0.07] border border-white/[0.08] group-hover:border-white/20 pl-7 pr-6 text-[11px] text-text-muted group-hover:text-white flex items-center transition-all leading-none font-sans select-none">
            {searchQuery || 'Search tickers...'}
          </div>
          <kbd className="hidden md:flex absolute right-1.5 px-1 py-0.5 rounded border border-white/10 text-[9px] text-text-muted font-sans pointer-events-none leading-none">
            ⌘K
          </kbd>
        </div>

        {/* Splitting Line between Search bar and Predict Price */}
        <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5 sm:mx-1" />

        {/* Predict Price */}
        {onTogglePredict && (
          <button
            type="button"
            title="AI Price Forecast"
            aria-label="Predict Price"
            disabled={isPredicting}
            onClick={onTogglePredict}
            className={`h-7 px-1.5 sm:px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
              isPredictPopoverOpen || isPredicting
                ? 'bg-white/15 text-white font-semibold'
                : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Sparkles size={13} className={isPredicting ? 'animate-spin text-white' : 'text-text-muted'} />
            <span className="hidden sm:inline">Predict Price</span>
            <span className="sm:hidden">Predict</span>
          </button>
        )}

        {/* Splitting Line between Predict Price and Indicators */}
        <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5 sm:mx-1" />

        {/* Indicators */}
        {onToggleIndicators && (
          <button
            type="button"
            title="Technical Indicators"
            aria-label="Indicators"
            onClick={onToggleIndicators}
            className={`h-7 px-1.5 sm:px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 ${
              isIndicatorsPopoverOpen || activeIndicatorsCount > 0
                ? 'bg-white/15 text-white font-semibold'
                : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <BarChart2 size={13} />
            <span>Indicators</span>
            {activeIndicatorsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-white/20 text-white font-bold leading-none">
                {activeIndicatorsCount}
              </span>
            )}
          </button>
        )}

        {/* Splitting Line between Indicators and Strategy Report */}
        <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5 sm:mx-1" />

        {/* Strategy Report */}
        {onOpenStrategyReport && (
          <button
            type="button"
            title="Strategy Report & Performance Backtest"
            aria-label="Strategy Report"
            onClick={onOpenStrategyReport}
            className="h-7 px-1.5 sm:px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">Strategy Report</span>
            <span className="sm:hidden">Report</span>
          </button>
        )}
      </div>

      {/* ─── Right Section: Portfolio & Execution Actions (Far Right) ─── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto pl-1 sm:pl-2">
        {/* My Positions */}
        {onOpenPositionsDrawer && (
          <button
            type="button"
            title="My Positions & Orders"
            aria-label="My Positions"
            onClick={onOpenPositionsDrawer}
            className="h-7 px-1.5 sm:px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
          >
            <Briefcase size={13} />
            <span className="hidden sm:inline">My Positions</span>
            <span className="hidden min-[410px]:inline sm:hidden">Positions</span>
            {openPositionsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-white/20 text-white font-bold leading-none">
                {openPositionsCount}
              </span>
            )}
          </button>
        )}

        {/* Splitting Line */}
        <div className="h-3.5 w-px bg-white/10 shrink-0 mx-0.5" />

        {/* Add Position Primary CTA */}
        {onOpenAddOrder && (
          <button
            type="button"
            title="Add Position"
            aria-label="Add Position"
            onClick={onOpenAddOrder}
            className="h-7 px-2 sm:px-3 rounded-md bg-white hover:bg-white/90 text-black text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95 shadow-xs"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Position</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* ─── Portal Search Command Palette & Dropdown (Immune to parent overflow clipping) ─── */}
      {mounted && isSearchOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-start p-3 sm:p-0 select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-100"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* Search Card Container */}
          <div
            className="relative z-10 w-full max-w-lg sm:max-w-xl md:max-w-2xl mt-4 sm:mt-12 bg-black border border-white/[0.12] rounded-xl shadow-2xl shadow-black overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="h-12 px-4 flex items-center gap-3 border-b border-white/[0.08] bg-black">
              <Search size={16} className="text-white/40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  activeTab === 'funds'
                    ? 'Search mutual funds by name or ticker...'
                    : activeTab === 'stocks'
                    ? 'Search stocks by symbol, company, or sector...'
                    : 'Search stocks, mutual funds, or sectors...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-white/35 focus:outline-none font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFocusedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer font-sans flex items-center gap-1.5"
              >
                <span>Close</span>
                <kbd className="hidden sm:inline px-1 py-0.2 rounded border border-white/10 text-[9px] text-white/40">ESC</kbd>
              </button>
            </div>

            {/* Filter Tabs & Header Bar */}
            <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    setFocusedIndex(0);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      activeTab === 'all'
                        ? 'bg-black/15 text-black font-bold'
                        : 'bg-white/[0.08] text-white/60'
                    }`}
                  >
                    {tabCounts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('stocks');
                    setFocusedIndex(0);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'stocks'
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Stocks</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      activeTab === 'stocks'
                        ? 'bg-black/15 text-black font-bold'
                        : 'bg-white/[0.08] text-white/60'
                    }`}
                  >
                    {tabCounts.stocks}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('funds');
                    setFocusedIndex(0);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'funds'
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Funds</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      activeTab === 'funds'
                        ? 'bg-black/15 text-black font-bold'
                        : 'bg-white/[0.08] text-white/60'
                    }`}
                  >
                    {tabCounts.funds}
                  </span>
                </button>
              </div>

              {/* Status info */}
              <div className="text-[11px] text-white/40 font-medium hidden sm:block">
                <span>
                  {activeTab === 'funds'
                    ? `${searchResults.length} funds found`
                    : activeTab === 'stocks'
                    ? `${searchResults.length} stocks found`
                    : `${searchResults.length} instruments found`}
                </span>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto no-scrollbar py-1 divide-y divide-white/[0.03]">
              {searchResults.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <p className="text-white/60 text-xs font-medium">No matching {activeTab === 'funds' ? 'funds' : activeTab === 'stocks' ? 'stocks' : 'instruments'} found</p>
                  <p className="text-white/30 text-[11px] mt-1">Try a different ticker name, company keyword, or switch tabs.</p>
                </div>
              ) : (
                searchResults.map((item, index) => {
                  const isSelected = item.symbol === symbol;
                  const isFocused = index === focusedIndex;
                  const itemDisplay = item.symbol.replace('.CA', '');
                  const isFund = isFundItem(item);

                  return (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectTicker(item.symbol)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-white/[0.08] text-white font-medium'
                          : isFocused
                          ? 'bg-white/[0.04] text-white'
                          : 'hover:bg-white/[0.04] text-text-primary'
                      }`}
                    >
                      {/* Left: Avatar/Logo + Symbol + Type Badge + Company Name */}
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={item.symbol}
                              className="ticker-logo-image ticker-logo-fill"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-white/80">
                              {itemDisplay.substring(0, 2)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-[13px] font-bold font-sans tracking-tight ${
                                isSelected ? 'text-white' : 'text-text-primary'
                              }`}
                            >
                              {itemDisplay}
                            </span>

                            {isFund ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                                Fund
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase bg-white/[0.06] text-white/50 border border-white/10 shrink-0">
                                Stock
                              </span>
                            )}

                            {item.sector && (
                              <span className="hidden sm:inline text-[10px] text-white/40 truncate">
                                · {item.sector}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-text-muted truncate max-w-[220px] sm:max-w-[340px]">
                            {item.companyName}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price + Change % */}
                      <div className="flex items-center gap-2.5 shrink-0 font-sans tabular-nums text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-[13px] font-semibold text-white">
                            {item.price} <span className="text-[10px] text-white/40 font-normal">EGP</span>
                          </span>
                          {item.changePct && (
                            <span
                              className={`text-[10px] font-semibold ${
                                item.isUp ? 'text-profit-num' : 'text-loss-num'
                              }`}
                            >
                              {item.changePct}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.06] bg-black/60 flex items-center justify-between text-[10px] text-white/40 font-sans">
              <span className="hidden sm:inline text-[10px] text-white/40">
                ↑↓ to navigate • Enter to select • Tab to switch tabs • Esc to close
              </span>
              <span className="sm:hidden text-[10px] text-white/40">
                Tap ticker to view chart
              </span>
              <span className="text-[10px] text-white/30 hidden sm:inline">
                {activeTab === 'funds' ? 'Mutual Funds' : activeTab === 'stocks' ? 'EGX Listed Equities' : 'EGX Market'}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

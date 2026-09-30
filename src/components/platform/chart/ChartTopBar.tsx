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
import InlineSpinner from '@/components/ui/InlineSpinner';

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
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'funds' | 'metals'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMetalItem = (item: WatchlistItem) => {
    const sym = item.symbol.toUpperCase().replace('.CA', '');
    return (
      sym === 'GC1!' ||
      sym === 'SI1!' ||
      sym === 'GOLD' ||
      sym === 'SILVER' ||
      item.sector?.toLowerCase() === 'metals' ||
      item.sector?.toLowerCase() === 'precious metals'
    );
  };

  const isFundItem = (item: WatchlistItem) => {
    const sym = item.symbol.toUpperCase().replace('.CA', '');
    return (
      !isMetalItem(item) &&
      (item.sector?.toLowerCase() === 'funds' ||
        item.sector?.toLowerCase() === 'fund' ||
        item.companyName?.toLowerCase().includes('fund') ||
        ['CI_QUANT', 'OSOUL', 'COF'].includes(sym))
    );
  };

  const isStockItem = (item: WatchlistItem) => {
    return !isMetalItem(item) && !isFundItem(item);
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
    let metalsCount = 0;
    for (const item of queryFilteredList) {
      if (isMetalItem(item)) {
        metalsCount++;
      } else if (isFundItem(item)) {
        fundsCount++;
      } else {
        stocksCount++;
      }
    }
    return {
      all: queryFilteredList.length,
      stocks: stocksCount,
      funds: fundsCount,
      metals: metalsCount,
    };
  }, [queryFilteredList]);

  const searchResults = useMemo(() => {
    let list = queryFilteredList;
    if (activeTab === 'stocks') {
      list = list.filter((item) => isStockItem(item));
    } else if (activeTab === 'funds') {
      list = list.filter((item) => isFundItem(item));
    } else if (activeTab === 'metals') {
      list = list.filter((item) => isMetalItem(item));
    }

    if (!searchQuery.trim()) {
      return activeTab === 'all' ? list.slice(0, 40) : list;
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
            const nextTab =
              prev === 'all'
                ? 'stocks'
                : prev === 'stocks'
                ? 'funds'
                : prev === 'funds'
                ? 'metals'
                : 'all';
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
    <div className="w-full shrink-0 bg-cold-gray-900 border-b border-white/[0.08] select-none text-xs font-sans relative z-30">
      {/* ─── Mobile 2-Bar Layout (sm:hidden) ─── */}
      <div className="sm:hidden flex flex-col w-full divide-y divide-white/[0.06]">
        {/* Bar 1: Search Bar (with search input look) + Positions + Add */}
        <div className="h-10 px-2 flex items-center justify-between gap-1.5 w-full">
          {/* Mobile Search Bar Trigger */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-white/[0.04] active:bg-white/[0.08] border border-white/[0.08] flex items-center gap-2 cursor-pointer transition-colors"
            role="button"
            tabIndex={0}
            aria-label="Search tickers"
          >
            <Search size={13} className="text-text-muted shrink-0" />
            <span className="text-[11px] text-text-muted truncate select-none">
              {searchQuery || 'Search tickers...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* My Positions */}
            {onOpenPositionsDrawer && (
              <button
                type="button"
                title="My Positions & Orders"
                aria-label="My Positions"
                onClick={onOpenPositionsDrawer}
                className="h-8 px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-white active:bg-white/[0.08] bg-white/[0.03] border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Briefcase size={12} className="shrink-0" />
                <span>Positions</span>
                {openPositionsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-white/20 text-white font-bold leading-none shrink-0">
                    {openPositionsCount}
                  </span>
                )}
              </button>
            )}

            {/* Add Position Primary CTA */}
            {onOpenAddOrder && (
              <button
                type="button"
                title="Add Position"
                aria-label="Add Position"
                onClick={onOpenAddOrder}
                className="h-8 px-2.5 rounded-md bg-white hover:bg-white/90 active:bg-white/80 text-black text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Bar 2: Predict + Indicators + Report taking full width correctly */}
        <div className="h-9 px-2 flex items-center w-full">
          <div className="grid grid-cols-3 gap-1.5 w-full">
            {/* Predict Price */}
            {onTogglePredict && (
              <button
                type="button"
                title="AI Price Forecast"
                aria-label="Predict Price"
                disabled={isPredicting}
                onClick={onTogglePredict}
                className={`h-7 px-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full border ${
                  isPredictPopoverOpen || isPredicting
                    ? 'bg-white/15 text-white border-white/20 font-semibold'
                    : 'text-text-muted hover:text-white bg-white/[0.03] border-white/[0.08] active:bg-white/[0.08]'
                }`}
              >
                {isPredicting ? (
                  <InlineSpinner className="h-[13px] w-[13px]" label="Generating forecast" />
                ) : (
                  <Sparkles size={12} className="text-text-muted shrink-0" />
                )}
                <span className="truncate">Predict</span>
              </button>
            )}

            {/* Indicators */}
            {onToggleIndicators && (
              <button
                type="button"
                title="Technical Indicators"
                aria-label="Indicators"
                onClick={onToggleIndicators}
                className={`h-7 px-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full border ${
                  isIndicatorsPopoverOpen || activeIndicatorsCount > 0
                    ? 'bg-white/15 text-white border-white/20 font-semibold'
                    : 'text-text-muted hover:text-white bg-white/[0.03] border-white/[0.08] active:bg-white/[0.08]'
                }`}
              >
                <BarChart2 size={12} className="shrink-0" />
                <span className="truncate">Indicators</span>
                {activeIndicatorsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-white/20 text-white font-bold leading-none shrink-0">
                    {activeIndicatorsCount}
                  </span>
                )}
              </button>
            )}

            {/* Strategy Report */}
            {onOpenStrategyReport && (
              <button
                type="button"
                title="Strategy Report & Performance Backtest"
                aria-label="Strategy Report"
                onClick={onOpenStrategyReport}
                className="h-7 px-1 rounded-md text-[11px] font-medium text-text-muted hover:text-white bg-white/[0.03] border border-white/[0.08] active:bg-white/[0.08] transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full"
              >
                <FileText size={12} className="shrink-0" />
                <span className="truncate">Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Desktop Single-Bar Layout (hidden sm:flex) ─── */}
      <div className="hidden sm:flex h-[45px] w-full items-center justify-between px-3">
        {/* Left Section: Search Bar & Analysis Tools */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          {/* Desktop Search Trigger Input */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="flex relative items-center cursor-pointer group"
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
          <div className="h-3.5 w-px bg-white/10 shrink-0 mx-1" />

          {/* Predict Price */}
          {onTogglePredict && (
            <button
              type="button"
              title="AI Price Forecast"
              aria-label="Predict Price"
              disabled={isPredicting}
              onClick={onTogglePredict}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                isPredictPopoverOpen || isPredicting
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {isPredicting ? (
                <InlineSpinner className="h-[13px] w-[13px]" label="Generating price forecast" />
              ) : (
                <Sparkles size={13} className="text-text-muted" />
              )}
              <span>Predict Price</span>
            </button>
          )}

          {/* Splitting Line between Predict Price and Indicators */}
          <div className="h-3.5 w-px bg-white/10 shrink-0 mx-1" />

          {/* Indicators */}
          {onToggleIndicators && (
            <button
              type="button"
              title="Technical Indicators"
              aria-label="Indicators"
              onClick={onToggleIndicators}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
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
          <div className="h-3.5 w-px bg-white/10 shrink-0 mx-1" />

          {/* Strategy Report */}
          {onOpenStrategyReport && (
            <button
              type="button"
              title="Strategy Report & Performance Backtest"
              aria-label="Strategy Report"
              onClick={onOpenStrategyReport}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileText size={13} />
              <span>Strategy Report</span>
            </button>
          )}
        </div>

        {/* Right Section: Portfolio & Execution Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
          {/* My Positions */}
          {onOpenPositionsDrawer && (
            <button
              type="button"
              title="My Positions & Orders"
              aria-label="My Positions"
              onClick={onOpenPositionsDrawer}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Briefcase size={13} />
              <span>My Positions</span>
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
              className="h-7 px-3 rounded-md bg-white hover:bg-white/90 text-black text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Position</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Portal Search Command Palette & Dropdown (Immune to parent overflow clipping) ─── */}
      {mounted && isSearchOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* Search Card Container - Centralized, Sleek Pure Black Surface */}
          <div
            className="relative z-10 w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-black border border-white/[0.12] rounded-2xl shadow-[0_32px_96px_-12px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-[0.98] duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="h-13 sm:h-14 px-4 sm:px-5 flex items-center gap-3 border-b border-white/[0.08] bg-black">
              <Search size={17} className="text-white/40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  activeTab === 'funds'
                    ? 'Search mutual funds by name or ticker...'
                    : activeTab === 'metals'
                    ? 'Search precious metals (Gold, Silver)...'
                    : activeTab === 'stocks'
                    ? 'Search stocks by symbol, company, or sector...'
                    : 'Search stocks, mutual funds, metals, or sectors...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(0);
                }}
                className="flex-1 bg-transparent text-sm sm:text-[15px] text-white placeholder:text-white/30 focus:outline-none font-sans tracking-tight"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFocusedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer rounded-md hover:bg-white/[0.06]"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer font-sans flex items-center gap-1.5"
              >
                <span>Close</span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded border border-white/10 text-[9px] text-white/40 bg-white/[0.04]">ESC</kbd>
              </button>
            </div>

            {/* Filter Tabs & Header Bar */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-white/[0.06] bg-black flex items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06]">
                {(
                  [
                    { id: 'all', label: 'All', count: tabCounts.all },
                    { id: 'stocks', label: 'Stocks', count: tabCounts.stocks },
                    { id: 'funds', label: 'Funds', count: tabCounts.funds },
                    { id: 'metals', label: 'Metals', count: tabCounts.metals },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setFocusedIndex(0);
                      }}
                      className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-black font-semibold shadow-xs'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.04] font-medium'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums leading-none ${
                          isActive
                            ? 'bg-black/15 text-black font-bold'
                            : 'bg-white/[0.06] text-white/40'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status info */}
              <div className="text-[11px] text-white/40 font-medium tabular-nums hidden sm:block">
                <span>
                  {activeTab === 'funds'
                    ? `${searchResults.length} funds found`
                    : activeTab === 'metals'
                    ? `${searchResults.length} metals found`
                    : activeTab === 'stocks'
                    ? `${searchResults.length} stocks found`
                    : `${searchResults.length} instruments found`}
                </span>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto no-scrollbar py-1 divide-y divide-white/[0.03]">
              {searchResults.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-white/40">
                    <Search size={18} />
                  </div>
                  <p className="text-white/70 text-xs font-semibold">
                    No matching {activeTab === 'funds' ? 'funds' : activeTab === 'metals' ? 'metals' : activeTab === 'stocks' ? 'stocks' : 'instruments'} found
                  </p>
                  <p className="text-white/35 text-[11px] mt-1 max-w-xs">
                    Try a different ticker name, company keyword, or switch tabs.
                  </p>
                </div>
              ) : (
                searchResults.map((item, index) => {
                  const isSelected = item.symbol === symbol;
                  const isFocused = index === focusedIndex;
                  const itemDisplay = item.symbol.replace('.CA', '');
                  const isMetal = isMetalItem(item);
                  const isFund = isFundItem(item);

                  return (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectTicker(item.symbol)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={`flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-white/[0.08] text-white font-medium'
                          : isFocused
                          ? 'bg-white/[0.04] text-white'
                          : 'hover:bg-white/[0.03] text-text-primary'
                      }`}
                    >
                      {/* Left: Avatar/Logo + Symbol + Type Badge + Sector + Company Name */}
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={item.symbol}
                              className="ticker-logo-image ticker-logo-fill"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-white/75">
                              {itemDisplay.substring(0, 2)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs sm:text-[13px] font-bold font-sans tracking-tight ${
                                isSelected ? 'text-white' : 'text-white/90'
                              }`}
                            >
                              {itemDisplay}
                            </span>

                            {isMetal ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/25 shrink-0">
                                Metal
                              </span>
                            ) : isFund ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 shrink-0">
                                Fund
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase bg-white/[0.05] text-white/50 border border-white/[0.08] shrink-0">
                                Stock
                              </span>
                            )}

                            {item.sector && (
                              <span className="hidden sm:inline text-[11px] text-white/40 truncate">
                                · {item.sector}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-white/50 truncate max-w-[220px] sm:max-w-[340px]">
                            {item.companyName}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price + Change % */}
                      <div className="flex items-center gap-2.5 shrink-0 font-sans tabular-nums text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-[13px] font-semibold text-white">
                            {item.price}{' '}
                            <span className="text-[10px] text-white/40 font-normal">
                              {item.currency || 'EGP'}
                            </span>
                          </span>
                          {item.changePct && (
                            <span
                              className={`text-[10px] font-medium ${
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
            <div className="px-4 sm:px-5 py-2.5 border-t border-white/[0.06] bg-black flex items-center justify-between text-[11px] text-white/40 font-sans">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] text-white/50 leading-none">↑↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] text-white/50 leading-none">↵</kbd>
                  <span>select</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] text-white/50 leading-none">Tab</kbd>
                  <span>filter</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] text-white/50 leading-none">Esc</kbd>
                  <span>close</span>
                </span>
              </div>
              <span className="sm:hidden text-[10px] text-white/40">
                Tap ticker to view chart
              </span>
              <span className="text-[11px] text-white/30 hidden sm:inline">
                {activeTab === 'funds' ? 'Mutual Funds' : activeTab === 'metals' ? 'Precious Metals' : activeTab === 'stocks' ? 'EGX Listed Equities' : 'All Markets'}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

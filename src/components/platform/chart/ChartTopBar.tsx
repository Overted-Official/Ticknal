'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  BarChart2,
  FileText,
  Briefcase,
  Plus,
  X,
  Landmark,
} from '@/components/ui/icon-library';
import type { WatchlistItem } from '@/components/platform/RightSidebar';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { useTranslation } from '@/lib/i18n';
import { localizeSectorName } from '@/lib/finance/sector-translations';
import { TourTriggerButton } from '@/components/ui/tour';

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
  onOpenFinancials?: () => void;
  // Portfolio actions
  openPositionsCount?: number;
  onOpenPositionsDrawer?: () => void;
  onOpenAddOrder?: () => void;
  // Tour action
  onStartTour?: () => void;
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
  onOpenFinancials,
  openPositionsCount = 0,
  onOpenPositionsDrawer,
  onOpenAddOrder,
  onStartTour,
}: ChartTopBarProps) {
  const { locale } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'funds' | 'metals'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    <div className="w-full shrink-0 bg-plt-base border-b border-plt-border-soft select-none text-xs font-sans relative z-30">
      {/* ─── Mobile 2-Bar Layout (sm:hidden) ─── */}
      <div className="sm:hidden flex flex-col w-full divide-y divide-plt-border-soft">
        {/* Bar 1: Search Bar (with search input look) + Positions + Add */}
        <div className="h-10 px-2 flex items-center justify-between gap-1.5 w-full">
          {/* Mobile Search Bar Trigger */}
          <div
            data-tour="chart-ticker-search"
            data-testid="mobile-search-trigger"
            onClick={() => setIsSearchOpen(true)}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-plt-hover active:bg-plt-active border border-plt-border-soft flex items-center gap-2 cursor-pointer transition-colors"
            role="button"
            tabIndex={0}
            aria-label={locale === 'ar' ? 'بحث عن الأسهم والأصول' : 'Search tickers'}
          >
            <Search size={13} className="text-plt-muted shrink-0" />
            <span className="text-[11px] text-plt-muted truncate select-none">
              {searchQuery || (locale === 'ar' ? 'بحث عن سهم أو أصل...' : 'Search tickers...')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Tour Button */}
            {onStartTour && (
              <TourTriggerButton
                onClick={onStartTour}
                variant="icon"
                className="h-8 w-8 p-0 flex items-center justify-center rounded-md shrink-0"
              />
            )}

            {/* My Positions */}
            {onOpenPositionsDrawer && (
              <button
                type="button"
                data-tour="chart-positions-btn"
                title={locale === 'ar' ? 'صفقاتي وأوامري' : 'My Positions & Orders'}
                aria-label={locale === 'ar' ? 'صفقاتي' : 'My Positions'}
                onClick={onOpenPositionsDrawer}
                className="h-8 px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text active:bg-plt-active bg-plt-hover border border-plt-border-soft transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Briefcase size={12} className="shrink-0" />
                <span>{locale === 'ar' ? 'صفقاتي' : 'Positions'}</span>
                {openPositionsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-plt-active text-plt-text font-bold leading-none shrink-0">
                    {openPositionsCount}
                  </span>
                )}
              </button>
            )}

            {/* Add Position Primary CTA */}
            {onOpenAddOrder && (
              <button
                type="button"
                data-tour="chart-add-order-btn"
                title={locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}
                aria-label={locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}
                onClick={onOpenAddOrder}
                className="h-8 px-2.5 rounded-md bg-white hover:bg-white/90 active:bg-white/80 text-black text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>{locale === 'ar' ? 'إضافة' : 'Add'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Bar 2: Predict + Indicators + Report + Financials taking full width correctly */}
        <div className="h-9 px-2 flex items-center w-full">
          <div className="grid grid-flow-col auto-cols-fr gap-1.5 w-full">
            {/* Predict Price */}
            {onTogglePredict && (
              <button
                type="button"
                data-tour="chart-predict-btn"
                title={locale === 'ar' ? 'توقعات الأسعار بالذكاء الاصطناعي' : 'AI Price Forecast'}
                aria-label={locale === 'ar' ? 'توقع السعر' : 'Predict Price'}
                disabled={isPredicting}
                onClick={onTogglePredict}
                className={`h-7 px-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full border ${
                  isPredictPopoverOpen || isPredicting
                    ? 'bg-plt-active text-plt-text border-plt-border-active font-semibold'
                    : 'text-plt-muted hover:text-plt-text bg-plt-hover border-plt-border-soft active:bg-plt-active'
                }`}
              >
                {isPredicting ? (
                  <InlineSpinner className="h-[13px] w-[13px]" label={locale === 'ar' ? 'جاري إنشاء التوقع' : 'Generating forecast'} />
                ) : (
                  <Sparkles size={12} className="text-plt-muted shrink-0" />
                )}
                <span className="truncate">{locale === 'ar' ? 'توقع' : 'Predict'}</span>
              </button>
            )}

            {/* Indicators */}
            {onToggleIndicators && (
              <button
                type="button"
                data-tour="chart-indicators-btn"
                title={locale === 'ar' ? 'المؤشرات الفنية' : 'Technical Indicators'}
                aria-label={locale === 'ar' ? 'المؤشرات' : 'Indicators'}
                onClick={onToggleIndicators}
                className={`h-7 px-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full border ${
                  isIndicatorsPopoverOpen || activeIndicatorsCount > 0
                    ? 'bg-plt-active text-plt-text border-plt-border-active font-semibold'
                    : 'text-plt-muted hover:text-plt-text bg-plt-hover border-plt-border-soft active:bg-plt-active'
                }`}
              >
                <BarChart2 size={12} className="shrink-0" />
                <span className="truncate">{locale === 'ar' ? 'المؤشرات' : 'Indicators'}</span>
                {activeIndicatorsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-plt-active text-plt-text font-bold leading-none shrink-0">
                    {activeIndicatorsCount}
                  </span>
                )}
              </button>
            )}

            {/* Strategy Report */}
            {onOpenStrategyReport && (
              <button
                type="button"
                data-tour="chart-strategy-report-btn"
                title={locale === 'ar' ? 'تقرير الاستراتيجية واختبار الأداء' : 'Strategy Report & Performance Backtest'}
                aria-label={locale === 'ar' ? 'تقرير الاستراتيجية' : 'Strategy Report'}
                onClick={onOpenStrategyReport}
                className="h-7 px-1 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text bg-plt-hover border border-plt-border-soft active:bg-plt-active transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full"
              >
                <FileText size={12} className="shrink-0" />
                <span className="truncate">{locale === 'ar' ? 'التقرير' : 'Report'}</span>
              </button>
            )}

            {/* Financials */}
            {onOpenFinancials && (
              <button
                type="button"
                data-tour="chart-financials-btn"
                title={locale === 'ar' ? 'البيانات المالية والتقييم (F)' : 'Financials & Valuation (F)'}
                aria-label={locale === 'ar' ? 'البيانات المالية' : 'Financials'}
                onClick={onOpenFinancials}
                className="h-7 px-1 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text bg-plt-hover border border-plt-border-soft active:bg-plt-active transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full"
              >
                <Landmark size={12} className="shrink-0" />
                <span className="truncate">{locale === 'ar' ? 'المالية' : 'Financials'}</span>
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
            data-tour="chart-ticker-search"
            onClick={() => setIsSearchOpen(true)}
            className="flex relative items-center cursor-pointer group"
          >
            <Search
              size={13}
              className="absolute left-2.5 text-plt-muted group-hover:text-plt-text transition-colors pointer-events-none"
            />
            <div className="h-7 w-36 sm:w-44 md:w-52 rounded-md bg-plt-hover group-hover:bg-plt-active border border-plt-border-soft group-hover:border-plt-border pl-7 pr-6 text-[11px] text-plt-muted group-hover:text-plt-text flex items-center transition-all leading-none font-sans select-none">
              {searchQuery || (locale === 'ar' ? 'بحث عن سهم أو أصل...' : 'Search tickers...')}
            </div>
            <kbd className="hidden md:flex absolute right-1.5 px-1 py-0.5 rounded border border-plt-border text-[9px] text-plt-muted font-sans pointer-events-none leading-none">
              ⌘K
            </kbd>
          </div>

          {/* Splitting Line between Search bar and Predict Price */}
          <div className="h-3.5 w-px bg-plt-border-soft shrink-0 mx-1" />

          {/* Predict Price */}
          {onTogglePredict && (
            <button
              type="button"
              data-tour="chart-predict-btn"
              title={locale === 'ar' ? 'توقعات الأسعار بالذكاء الاصطناعي' : 'AI Price Forecast'}
              aria-label={locale === 'ar' ? 'توقع السعر' : 'Predict Price'}
              disabled={isPredicting}
              onClick={onTogglePredict}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                isPredictPopoverOpen || isPredicting
                  ? 'bg-plt-active text-plt-text font-semibold'
                  : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
              }`}
            >
              {isPredicting ? (
                <InlineSpinner className="h-[13px] w-[13px]" label={locale === 'ar' ? 'جاري إنشاء توقع السعر' : 'Generating price forecast'} />
              ) : (
                <Sparkles size={13} className="text-plt-muted" />
              )}
              <span>{locale === 'ar' ? 'توقع السعر' : 'Predict Price'}</span>
            </button>
          )}

          {/* Splitting Line between Predict Price and Indicators */}
          <div className="h-3.5 w-px bg-plt-border-soft shrink-0 mx-1" />

          {/* Indicators */}
          {onToggleIndicators && (
            <button
              type="button"
              data-tour="chart-indicators-btn"
              title={locale === 'ar' ? 'المؤشرات الفنية' : 'Technical Indicators'}
              aria-label={locale === 'ar' ? 'المؤشرات' : 'Indicators'}
              onClick={onToggleIndicators}
              className={`h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isIndicatorsPopoverOpen || activeIndicatorsCount > 0
                  ? 'bg-plt-active text-plt-text font-semibold'
                  : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
              }`}
            >
              <BarChart2 size={13} />
              <span>{locale === 'ar' ? 'المؤشرات الفنية' : 'Indicators'}</span>
              {activeIndicatorsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-plt-active text-plt-text font-bold leading-none">
                  {activeIndicatorsCount}
                </span>
              )}
            </button>
          )}

          {/* Splitting Line between Indicators and Strategy Report */}
          <div className="h-3.5 w-px bg-plt-border-soft shrink-0 mx-1" />

          {/* Strategy Report */}
          {onOpenStrategyReport && (
            <button
              type="button"
              data-tour="chart-strategy-report-btn"
              title={locale === 'ar' ? 'تقرير الاستراتيجية واختبار الأداء' : 'Strategy Report & Performance Backtest'}
              aria-label={locale === 'ar' ? 'تقرير الاستراتيجية' : 'Strategy Report'}
              onClick={onOpenStrategyReport}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileText size={13} />
              <span>{locale === 'ar' ? 'تقرير الاستراتيجية' : 'Strategy Report'}</span>
            </button>
          )}

          {/* Financials & Valuation */}
          {onOpenFinancials && (
            <button
              type="button"
              data-tour="chart-financials-btn"
              title={locale === 'ar' ? 'البيانات المالية والتقييم (F)' : 'Financials & Valuation (F)'}
              aria-label={locale === 'ar' ? 'البيانات المالية' : 'Financials'}
              onClick={onOpenFinancials}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Landmark size={13} />
              <span>{locale === 'ar' ? 'البيانات المالية' : 'Financials'}</span>
            </button>
          )}
        </div>

        {/* Right Section: Portfolio & Execution Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2">
          {/* Quick Tour Trigger */}
          {onStartTour && (
            <TourTriggerButton
              onClick={onStartTour}
              className="h-7 px-2.5 rounded-md text-[11px] border-plt-border-soft"
            />
          )}

          {/* Splitting Line */}
          {onStartTour && <div className="h-3.5 w-px bg-plt-border-soft shrink-0 mx-0.5" />}

          {/* My Positions */}
          {onOpenPositionsDrawer && (
            <button
              type="button"
              data-tour="chart-positions-btn"
              title={locale === 'ar' ? 'صفقاتي وأوامري' : 'My Positions & Orders'}
              aria-label={locale === 'ar' ? 'صفقاتي' : 'My Positions'}
              onClick={onOpenPositionsDrawer}
              className="h-7 px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Briefcase size={13} />
              <span>{locale === 'ar' ? 'صفقاتي' : 'My Positions'}</span>
              {openPositionsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-sans tabular-nums bg-plt-active text-plt-text font-bold leading-none">
                  {openPositionsCount}
                </span>
              )}
            </button>
          )}

          {/* Splitting Line */}
          <div className="h-3.5 w-px bg-plt-border-soft shrink-0 mx-0.5" />

          {/* Add Position Primary CTA */}
          {onOpenAddOrder && (
            <button
              type="button"
              data-tour="chart-add-order-btn"
              title={locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}
              aria-label={locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}
              onClick={onOpenAddOrder}
              className="h-7 px-3 rounded-md bg-white hover:bg-white/90 text-black text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>{locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Portal Search Drawer (Mobile) & Command Palette (Desktop) ─── */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSearchOpen && (
            <div
              key="chart-search-portal"
              className="fixed inset-0 z-[150] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 select-none overflow-hidden"
            >
              {/* Backdrop */}
              <motion.div
                key="chart-search-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 bg-plt-base/80 backdrop-blur-md cursor-pointer"
                onClick={() => setIsSearchOpen(false)}
                aria-label={locale === 'ar' ? 'إغلاق البحث' : 'Close search'}
              />

              {/* Drawer Sheet (Phone) / Modal Dialog (Desktop) */}
              <motion.div
                key="chart-search-sheet"
                initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98, y: -6 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.98, y: -6 }}
                transition={
                  isMobile
                    ? { type: 'spring', damping: 28, stiffness: 280 }
                    : { duration: 0.15, ease: 'easeOut' }
                }
                className="relative z-10 w-full sm:max-w-xl md:max-w-2xl h-[88dvh] sm:h-auto sm:max-h-[85vh] bg-plt-base border-t sm:border border-plt-border rounded-none sm:rounded-2xl shadow-[0_-16px_48px_rgba(0,0,0,0.9),0_32px_96px_-12px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile Drag Indicator Handle */}
                <div
                  className="sm:hidden w-full flex items-center justify-center pt-3 pb-1 cursor-pointer shrink-0"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label={locale === 'ar' ? 'سحب للإغلاق' : 'Drag handle to close'}
                >
                  <div className="w-10 h-1 rounded-full bg-plt-faint active:bg-plt-subtle transition-colors" />
                </div>

                {/* Search Input Bar */}
                <div className="px-4 sm:px-5 pb-3 pt-1 sm:py-3.5 flex items-center gap-3 border-b border-plt-border-soft bg-plt-base shrink-0">
                  <div className="flex-1 flex items-center gap-2.5 h-10 px-3.5 rounded-xl bg-plt-hover border border-plt-border-soft focus-within:border-plt-border focus-within:bg-plt-active transition-all">
                    <Search size={16} className="text-plt-muted shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={
                        activeTab === 'funds'
                          ? (locale === 'ar' ? 'بحث في صناديق الاستثمار بالاسم أو الرمز...' : 'Search mutual funds by name or ticker...')
                          : activeTab === 'metals'
                          ? (locale === 'ar' ? 'بحث في المعادن الثمينة (الذهب، الفضة)...' : 'Search precious metals (Gold, Silver)...')
                          : activeTab === 'stocks'
                          ? (locale === 'ar' ? 'بحث في الأسهم بالرمز، الشركة، أو القطاع...' : 'Search stocks by symbol, company, or sector...')
                          : (locale === 'ar' ? 'بحث في الأسهم، الصناديق، المعادن، أو القطاعات...' : 'Search stocks, mutual funds, metals, or sectors...')
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setFocusedIndex(0);
                      }}
                      style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                      className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-[14px] text-plt-text placeholder:text-plt-faint font-sans tracking-tight p-0"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFocusedIndex(0);
                          searchInputRef.current?.focus();
                        }}
                        className="w-6 h-6 flex items-center justify-center text-plt-muted hover:text-plt-text active:bg-plt-active rounded-full transition-colors cursor-pointer shrink-0"
                        title={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="h-10 px-3 rounded-xl text-xs font-semibold text-plt-subtle hover:text-plt-text active:bg-plt-active hover:bg-plt-hover transition-colors cursor-pointer font-sans flex items-center gap-1.5 shrink-0"
                  >
                    <span>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</span>
                    <kbd className="hidden sm:inline px-1.5 py-0.5 rounded border border-plt-border text-[9px] text-plt-muted bg-plt-hover">ESC</kbd>
                  </button>
                </div>

                {/* Filter Tabs & Header Bar */}
                <div className="px-4 sm:px-5 py-2.5 border-b border-plt-border-soft bg-plt-base flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar">
                  {/* Tabs */}
                  <div className="flex items-center gap-1.5 sm:gap-1 bg-plt-hover p-1 sm:p-0.5 rounded-xl sm:rounded-lg border border-plt-border-soft shrink-0">
                    {(
                      [
                        { id: 'all', label: locale === 'ar' ? 'الكل' : 'All', count: tabCounts.all },
                        { id: 'stocks', label: locale === 'ar' ? 'الأسهم' : 'Stocks', count: tabCounts.stocks },
                        { id: 'funds', label: locale === 'ar' ? 'الصناديق' : 'Funds', count: tabCounts.funds },
                        { id: 'metals', label: locale === 'ar' ? 'المعادن' : 'Metals', count: tabCounts.metals },
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
                          className={`px-3.5 sm:px-3 py-1.5 sm:py-1 rounded-lg sm:rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 select-none shrink-0 ${
                            isActive
                              ? 'bg-white text-black font-semibold shadow-xs'
                              : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover font-medium'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums leading-none ${
                              isActive
                                ? 'bg-black/15 text-black font-bold'
                                : 'bg-plt-active text-plt-muted'
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Status info */}
                  <div className="text-[11px] text-plt-muted font-medium tabular-nums hidden sm:block shrink-0">
                    <span>
                      {activeTab === 'funds'
                        ? (locale === 'ar' ? `${searchResults.length} صندوق` : `${searchResults.length} funds`)
                        : activeTab === 'metals'
                        ? (locale === 'ar' ? `${searchResults.length} أصل معادن` : `${searchResults.length} metals`)
                        : activeTab === 'stocks'
                        ? (locale === 'ar' ? `${searchResults.length} سهم` : `${searchResults.length} stocks`)
                        : (locale === 'ar' ? `${searchResults.length} أداة مالية` : `${searchResults.length} instruments`)}
                    </span>
                  </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar py-1 divide-y divide-plt-border-soft">
                  {searchResults.length === 0 ? (
                    <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-plt-hover border border-plt-border-soft flex items-center justify-center mb-3 text-plt-muted">
                        <Search size={20} />
                      </div>
                      <p className="text-plt-text text-sm font-semibold">
                        {locale === 'ar'
                          ? `لم يتم العثور على أي ${activeTab === 'funds' ? 'صناديق' : activeTab === 'metals' ? 'معادن' : activeTab === 'stocks' ? 'أسهم' : 'أدوات مالية'}`
                          : `No matching ${activeTab === 'funds' ? 'funds' : activeTab === 'metals' ? 'metals' : activeTab === 'stocks' ? 'stocks' : 'instruments'} found`}
                      </p>
                      <p className="text-plt-muted text-xs mt-1.5 max-w-xs leading-relaxed">
                        {locale === 'ar'
                          ? 'جرب البحث برمز أو اسم شركة مختلف، أو قم باختيار تبويب آخر.'
                          : 'Try searching with a different ticker, name, or change the filter tab.'}
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
                          className={`flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-3 cursor-pointer transition-colors active:bg-plt-active min-h-[58px] sm:min-h-[52px] ${
                            isSelected
                              ? 'bg-plt-active text-plt-text font-medium'
                              : isFocused
                              ? 'bg-plt-hover text-plt-text'
                              : 'hover:bg-plt-hover text-plt-text'
                          }`}
                        >
                          {/* Left: Avatar/Logo + Symbol + Type Badge + Sector + Company Name */}
                          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-3">
                            <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-plt-hover border border-plt-border-soft flex items-center justify-center overflow-hidden shrink-0">
                              {item.logoUrl ? (
                                <img
                                  src={item.logoUrl}
                                  alt={item.symbol}
                                  className="ticker-logo-image ticker-logo-fill"
                                />
                              ) : (
                                <span className="text-[11px] sm:text-[10px] font-bold text-plt-text font-sans">
                                  {itemDisplay.substring(0, 2)}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm sm:text-[13px] font-bold font-sans tracking-tight text-plt-text"
                                >
                                  {itemDisplay}
                                </span>

                                {isMetal ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/25 shrink-0 font-sans">
                                    {locale === 'ar' ? 'معدن' : 'Metal'}
                                  </span>
                                ) : isFund ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 shrink-0 font-sans">
                                    {locale === 'ar' ? 'صندوق' : 'Fund'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase bg-plt-hover text-plt-muted border border-plt-border-soft shrink-0 font-sans">
                                    {locale === 'ar' ? 'سهم' : 'Stock'}
                                  </span>
                                )}

                                {item.sector && (
                                  <span className="hidden sm:inline text-[11px] text-plt-muted truncate font-sans">
                                    · {localizeSectorName(item.sector, locale)}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs sm:text-[11px] text-plt-muted truncate max-w-[200px] sm:max-w-[340px] font-sans">
                                {item.companyName}
                              </div>
                            </div>
                          </div>

                          {/* Right: Price + Change % */}
                          <div className="flex items-center gap-2.5 shrink-0 font-sans tabular-nums text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm sm:text-[13px] font-bold text-plt-text">
                                {item.price}{' '}
                                <span className="text-[10px] text-plt-muted font-normal">
                                  {item.currency ? (item.currency === 'EGP' && locale === 'ar' ? 'ج.م' : item.currency) : (locale === 'ar' ? 'ج.م' : 'EGP')}
                                </span>
                              </span>
                              {item.changePct && (
                                <span
                                  className={`text-[11px] sm:text-[10px] font-semibold mt-0.5 ${
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
                <div className="px-4 sm:px-5 py-3 sm:py-2.5 border-t border-plt-border-soft bg-plt-base flex items-center justify-between text-[11px] text-plt-muted font-sans shrink-0 pb-[max(1rem,calc(var(--ticknal-safe-area-bottom)+0.75rem))]">
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-plt-hover border border-plt-border text-[10px] text-plt-muted leading-none">↑↓</kbd>
                      <span>{locale === 'ar' ? 'تنقل' : 'navigate'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-plt-hover border border-plt-border text-[10px] text-plt-muted leading-none">↵</kbd>
                      <span>{locale === 'ar' ? 'اختيار' : 'select'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-plt-hover border border-plt-border text-[10px] text-plt-muted leading-none">Tab</kbd>
                      <span>{locale === 'ar' ? 'تصفية' : 'filter'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-plt-hover border border-plt-border text-[10px] text-plt-muted leading-none">Esc</kbd>
                      <span>{locale === 'ar' ? 'إغلاق' : 'close'}</span>
                    </span>
                  </div>
                  <span className="sm:hidden text-xs text-plt-muted font-medium">
                    {locale === 'ar' ? 'اضغط على أي أصل لعرض الرسم البياني' : 'Tap any ticker to open chart'}
                  </span>
                  <span className="text-[11px] text-plt-faint hidden sm:inline">
                    {activeTab === 'funds'
                      ? (locale === 'ar' ? 'صناديق الاستثمار' : 'Mutual Funds')
                      : activeTab === 'metals'
                      ? (locale === 'ar' ? 'المعادن الثمينة' : 'Precious Metals')
                      : activeTab === 'stocks'
                      ? (locale === 'ar' ? 'أسهم البورصة المصرية' : 'EGX Listed Equities')
                      : (locale === 'ar' ? 'جميع الأسواق' : 'All Markets')}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import { Search, ArrowLeft, X, TrendingUp, TrendingDown } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { PRESET_STRATEGY_TICKERS } from '@/components/platform/strategies/builder/StrategyTickerSearchSelect';
import { ALL_SNDUK_FUNDS } from '@/lib/funds/snduk-funds-list';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type SearchCategoryTab = 'all' | 'stocks' | 'funds' | 'metals';

export interface MobileSearchItem {
  symbol: string;
  companyName: string;
  companyNameAr?: string;
  category: 'stocks' | 'funds' | 'metals';
  logoUrl?: string | null;
  price: number;
  change?: number;
  changePct?: number;
  currency?: string;
  sector?: string;
  keywords?: string[];
}

export interface MobileSearchScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

// Benchmark precious metals with reliable metadata
const BENCHMARK_METALS: MobileSearchItem[] = [
  {
    symbol: 'GC1!',
    companyName: 'Gold 24K (EGP/g)',
    companyNameAr: 'ذهب عيار 24 (ج.م/جرام)',
    category: 'metals',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
    price: 7096.42,
    currency: 'EGP',
    sector: 'Precious Metals',
    keywords: ['gold', 'ذهب', '24k', 'عيار 24', 'سبائك', 'معدن'],
  },
  {
    symbol: 'SI1!',
    companyName: 'Silver (EGP/g)',
    companyNameAr: 'فضة نقية (ج.م/جرام)',
    category: 'metals',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/silver.svg',
    price: 102.75,
    currency: 'EGP',
    sector: 'Precious Metals',
    keywords: ['silver', 'فضة', 'معدن', 'سيلفر'],
  },
  {
    symbol: 'ADF',
    companyName: 'Al Ahly Dahab Fund',
    companyNameAr: 'صندوق الأهلي للذهب',
    category: 'metals',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/funds/1777587912769-0m35y8f5lyg.png',
    price: 175.55,
    currency: 'EGP',
    sector: 'Precious Metals',
    keywords: ['gold', 'ذهب', 'صندوق الذهب', 'الاهلي دهب'],
  },
  {
    symbol: 'AZG',
    companyName: 'Azimut Gold Fund',
    companyNameAr: 'صندوق أزيموت للذهب',
    category: 'metals',
    logoUrl: 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
    price: 28.40,
    currency: 'EGP',
    sector: 'Precious Metals',
    keywords: ['gold', 'ذهب', 'azimut', 'ازيموت'],
  },
];

function isMetalSymbol(symbol: string, sector?: string, industry?: string): boolean {
  const sym = symbol.toUpperCase().replace('.CA', '');
  return (
    sym === 'GC1!' ||
    sym === 'SI1!' ||
    sym === 'GOLD' ||
    sym === 'SILVER' ||
    sym === 'GOLD24' ||
    sym === 'GOLD21' ||
    sym === 'GOLD18' ||
    sym === 'ADF' ||
    sym === 'AZG' ||
    sym === 'BGF' ||
    sector?.toLowerCase() === 'metals' ||
    sector?.toLowerCase() === 'precious metals' ||
    industry?.toLowerCase() === 'precious metals' ||
    industry?.toLowerCase() === 'gold funds'
  );
}

function isFundSymbol(symbol: string, sector?: string, industry?: string, companyName?: string): boolean {
  if (isMetalSymbol(symbol, sector, industry)) return false;
  const sym = symbol.toUpperCase().replace('.CA', '');
  return (
    sector?.toLowerCase() === 'funds' ||
    sector?.toLowerCase() === 'fund' ||
    industry?.toLowerCase().includes('fund') ||
    companyName?.toLowerCase().includes('fund') ||
    companyName?.toLowerCase().includes('صندوق') ||
    ['CI_QUANT', 'OSOUL', 'COF', 'BMM', 'NHE', 'B35', 'CCF', 'RUB', 'BFF', 'CEX', 'GUF'].includes(sym)
  );
}

function TickerSearchAvatar({
  logoUrl,
  symbol,
}: {
  logoUrl?: string | null;
  symbol: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();

  return (
    <div className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-plt-active border border-plt-border overflow-hidden flex items-center justify-center shrink-0 aspect-square relative">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full rounded-full object-cover block"
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-xs font-bold text-plt-text font-sans select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

export default function MobileSearchScreen({
  isOpen,
  onClose,
  initialQuery = '',
}: MobileSearchScreenProps) {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const isAr = locale === 'ar';

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchCategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial query and focus when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch all tickers with live enriched prices when search modal is open
  const { data: apiTickers } = useSWR<any[]>(
    isOpen ? '/api/tickers' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  // Consolidated database of items across Stocks, Funds, Metals
  const allItems = useMemo<MobileSearchItem[]>(() => {
    const map = new Map<string, MobileSearchItem>();

    // 1. Add Metals benchmarks
    for (const metal of BENCHMARK_METALS) {
      map.set(metal.symbol.toUpperCase(), metal);
    }

    // 2. Add preset strategy tickers for instant UI readiness
    for (const preset of PRESET_STRATEGY_TICKERS) {
      const cleanSym = preset.symbol.toUpperCase();
      if (!map.has(cleanSym)) {
        map.set(cleanSym, {
          symbol: cleanSym,
          companyName: preset.companyName,
          companyNameAr: preset.companyNameAr,
          category: 'stocks',
          logoUrl: preset.logoUrl || null,
          price: 0,
          sector: preset.sector || undefined,
        });
      }
    }

    // 3. Add SNDUK funds catalog
    for (const fund of ALL_SNDUK_FUNDS) {
      const cleanSym = fund.symbol.toUpperCase();
      if (!map.has(cleanSym)) {
        map.set(cleanSym, {
          symbol: cleanSym,
          companyName: fund.companyName,
          category: isMetalSymbol(fund.symbol, fund.sector, fund.industry) ? 'metals' : 'funds',
          logoUrl: fund.logoUrl || null,
          price: 0,
          currency: fund.currency || 'EGP',
          sector: fund.industry || fund.sector,
        });
      }
    }

    // 4. Enrich & add all live items from API
    if (Array.isArray(apiTickers)) {
      for (const t of apiTickers) {
        const rawSym = t.symbol || '';
        const cleanSym = rawSym.replace('.CA', '').toUpperCase();
        if (!cleanSym) continue;

        let category: 'stocks' | 'funds' | 'metals' = 'stocks';
        if (isMetalSymbol(cleanSym, t.sector, t.industry)) {
          category = 'metals';
        } else if (isFundSymbol(cleanSym, t.sector, t.industry, t.companyName)) {
          category = 'funds';
        }

        const existing = map.get(cleanSym);
        const priceNum = typeof t.price === 'number' ? t.price : parseFloat(t.price) || 0;
        const changeNum = typeof t.change === 'number' ? t.change : parseFloat(t.change) || 0;
        const changePctNum = typeof t.changePct === 'number' ? t.changePct : parseFloat(t.changePct) || 0;

        if (existing) {
          map.set(cleanSym, {
            ...existing,
            companyName: existing.companyName || t.companyName || cleanSym,
            logoUrl: existing.logoUrl || t.logoUrl || null,
            price: priceNum || existing.price,
            change: changeNum || existing.change,
            changePct: changePctNum || existing.changePct,
            currency: t.currency || existing.currency || 'EGP',
            category: existing.category || category,
            sector: existing.sector || t.sector || t.industry,
          });
        } else {
          map.set(cleanSym, {
            symbol: cleanSym,
            companyName: t.companyName || cleanSym,
            category,
            logoUrl: t.logoUrl || null,
            price: priceNum,
            change: changeNum,
            changePct: changePctNum,
            currency: t.currency || 'EGP',
            sector: t.sector || t.industry,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [apiTickers]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let stocks = 0;
    let funds = 0;
    let metals = 0;
    for (const item of allItems) {
      if (item.category === 'metals') metals++;
      else if (item.category === 'funds') funds++;
      else stocks++;
    }
    return {
      all: allItems.length,
      stocks,
      funds,
      metals,
    };
  }, [allItems]);

  // Filtered items based on Tab + Search Query
  const filteredItems = useMemo(() => {
    let list = allItems;

    // Filter by Tab
    if (activeTab === 'stocks') {
      list = list.filter((i) => i.category === 'stocks');
    } else if (activeTab === 'funds') {
      list = list.filter((i) => i.category === 'funds');
    } else if (activeTab === 'metals') {
      list = list.filter((i) => i.category === 'metals');
    }

    // Filter by Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const symMatch = item.symbol.toLowerCase().includes(q);
        const nameMatch = item.companyName.toLowerCase().includes(q);
        const nameArMatch = item.companyNameAr ? item.companyNameAr.toLowerCase().includes(q) : false;
        const sectorMatch = item.sector ? item.sector.toLowerCase().includes(q) : false;
        const keywordMatch = item.keywords ? item.keywords.some((k) => k.toLowerCase().includes(q)) : false;
        return symMatch || nameMatch || nameArMatch || sectorMatch || keywordMatch;
      });
    }

    return list;
  }, [allItems, activeTab, searchQuery]);

  const handleSelect = (symbol: string) => {
    onClose();
    router.push(`/charts?ticker=${symbol}`);
  };

  const tabs: Array<{ id: SearchCategoryTab; label: string; count?: number }> = [
    { id: 'all', label: isAr ? 'الكل' : 'All', count: tabCounts.all },
    { id: 'stocks', label: isAr ? 'الأسهم' : 'Stocks', count: tabCounts.stocks },
    { id: 'funds', label: isAr ? 'الصناديق' : 'Funds', count: tabCounts.funds },
    { id: 'metals', label: isAr ? 'المعادن' : 'Metals', count: tabCounts.metals },
  ];

  function formatPriceValue(price: number, currency: string = 'EGP'): string {
    if (!price || isNaN(price) || price === 0) return '—';
    const curr = isAr && currency === 'EGP' ? 'ج.م' : currency;
    const formatted = price >= 1000
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2);
    return `${formatted} ${curr}`;
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-plt-base text-plt-text flex flex-col font-sans select-none overflow-hidden"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), var(--ticknal-safe-area-top, 0px))',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), var(--ticknal-safe-area-bottom, 0px))',
          }}
        >
          {/* Top Bar: Back Action + Search Input */}
          <div className="px-3.5 pt-2.5 pb-2 border-b border-plt-border-soft flex items-center gap-2.5 shrink-0 bg-plt-base">
            {/* Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.18] flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              title={isAr ? 'رجوع' : 'Back'}
              aria-label={isAr ? 'رجوع' : 'Back'}
            >
              <ArrowLeft
                size={18}
                className={isRTL ? 'rotate-180 transition-transform' : ''}
              />
            </button>

            {/* Search Input Container */}
            <div className="flex-1 min-w-0 h-10 px-3.5 rounded-full bg-white/[0.08] flex items-center gap-2.5">
              <Search size={16} className="text-plt-faint shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? 'بحث في الأسهم، الصناديق، المعادن...'
                    : 'Search stocks, funds, metals...'
                }
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                className="w-full bg-transparent border-none outline-none focus:outline-none focus:border-none focus-visible:outline-none ring-0 focus:ring-0 shadow-none text-sm text-plt-text placeholder:text-plt-faint font-sans p-0 leading-normal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-plt-muted hover:text-plt-text transition-colors shrink-0 cursor-pointer"
                  title={isAr ? 'مسح' : 'Clear'}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* 4 Tabs: All | Stocks | Funds | Metals */}
          <div className="px-3.5 py-2.5 border-b border-plt-border-soft flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-plt-base">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-category-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-black shadow-xs font-bold'
                      : 'bg-plt-hover hover:bg-plt-active text-plt-muted hover:text-plt-text'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] tabular-nums font-sans ${
                        isActive ? 'text-black/60 font-bold' : 'text-plt-faint'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-3.5 divide-y divide-plt-border-soft custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-plt-hover flex items-center justify-center text-plt-faint mb-3">
                  <Search size={22} />
                </div>
                <p className="text-sm font-semibold text-plt-muted font-sans">
                  {isAr ? 'لا توجد نتائج مطابقة' : 'No matching results'}
                </p>
                <p className="text-xs text-plt-faint mt-1 max-w-xs font-sans">
                  {isAr
                    ? `لم نتمكن من العثور على أصول تطابق "${searchQuery}" في هذا التصنيف.`
                    : `Could not find any instruments matching "${searchQuery}" in this tab.`}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const displayName = isAr && item.companyNameAr ? item.companyNameAr : item.companyName;
                const hasPrice = item.price > 0;
                const isPositive = (item.change || 0) >= 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    role="button"
                    tabIndex={0}
                    className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-plt-hover active:bg-plt-active transition-colors rounded-lg group"
                  >
                    {/* Column 1 & 2: Circular Logo + Name / Symbol */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Circular Logo */}
                      <TickerSearchAvatar logoUrl={item.logoUrl} symbol={item.symbol} />

                      {/* Middle: Full name (top) and Symbol (bottom) */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-plt-text truncate font-sans transition-colors">
                          {displayName}
                        </div>
                        <div className="text-xs text-plt-muted font-sans mt-0.5 flex items-center gap-1.5">
                          <span className="tracking-wide">{item.symbol}</span>
                          {item.sector && (
                            <span className="text-[10px] text-plt-faint truncate max-w-[120px]">
                              • {item.sector}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Latest Price */}
                    <div className="text-end shrink-0 pl-2">
                      <div className="text-sm font-bold text-plt-text tabular-nums font-sans">
                        {formatPriceValue(item.price, item.currency)}
                      </div>
                      {hasPrice && item.changePct !== undefined && (
                        <div
                          className={`text-[11px] font-medium tabular-nums font-sans mt-0.5 flex items-center justify-end gap-0.5 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>
                            {isPositive ? '+' : ''}
                            {item.changePct.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

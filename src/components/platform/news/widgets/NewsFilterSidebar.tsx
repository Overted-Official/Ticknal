'use client';

import React from 'react';
import { X, Search } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}

interface NewsFilterSidebarProps {
  categories: CategoryOption[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
  trendingTickers?: string[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export default function NewsFilterSidebar({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedTicker,
  onSelectTicker,
  trendingTickers = ['COMI', 'TMGH', 'SWDY', 'FWRY', 'EAST', 'EGX30', 'GOLD21K', 'USD/EGP', 'CIB_ADR', 'AZG'],
  onResetFilters,
  hasActiveFilters,
}: NewsFilterSidebarProps) {
  const { locale } = useTranslation();

  return (
    <aside
      aria-label="Feed Filters"
      className="w-full flex flex-col bg-plt-base select-none font-sans py-1"
    >
      {/* Header (No icons) */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-plt-border-soft">
        <span className="font-semibold text-[10.5px] tracking-wider uppercase text-plt-muted">
          {locale === 'ar' ? 'التصنيفات والأسواق' : 'Feeds & Markets'}
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[10px] text-plt-muted hover:text-plt-text flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{locale === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
            <X size={10} />
          </button>
        )}
      </div>

      {/* Category Navigation Items (No icons) */}
      <nav className="space-y-0.5 mb-3">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer group text-left ${
                isSelected
                  ? 'bg-plt-active text-plt-text font-medium'
                  : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
              }`}
            >
              <span className="truncate">{cat.label}</span>

              {typeof cat.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-normal tabular-nums shrink-0 ${
                    isSelected
                      ? 'bg-plt-active text-plt-text font-medium'
                      : 'text-plt-faint group-hover:text-plt-muted'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Search Input (Directly above Watchlist Tickers) */}
      <div className="pt-3 border-t border-plt-border-soft mb-3">
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-plt-faint pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث في الأخبار...' : 'Search news or ticker...'}
            className="w-full pl-7 pr-6 py-1.5 text-[11px] rounded-lg bg-plt-hover border border-plt-border text-plt-text placeholder:text-plt-faint focus:outline-none focus:border-[#1d9bf0] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-plt-muted hover:text-plt-text text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Watchlist Tickers List Section */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="font-semibold text-[10px] tracking-wider uppercase text-plt-faint">
            {locale === 'ar' ? 'الأسهم المتابعة' : 'Watchlist Tickers'}
          </span>
          {selectedTicker && (
            <button
              type="button"
              onClick={() => onSelectTicker(selectedTicker)}
              className="text-[10px] text-[#1d9bf0] hover:underline cursor-pointer"
            >
              Clear @{selectedTicker}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {trendingTickers.map((sym) => {
            const cleanSym = sym.replace(/^[@$]/, '');
            const isSelected = selectedTicker === cleanSym;

            return (
              <button
                key={cleanSym}
                type="button"
                onClick={() => onSelectTicker(cleanSym)}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1d9bf0] text-black font-semibold shadow-xs'
                    : 'bg-plt-hover border border-plt-border-soft text-plt-muted hover:text-plt-text hover:border-plt-border hover:bg-plt-active'
                }`}
              >
                <span>@{cleanSym}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

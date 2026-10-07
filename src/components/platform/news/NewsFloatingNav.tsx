'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

export interface NewsFloatingCategory {
  id: string;
  label: string;
  shortLabel?: string;
  count?: number;
}

interface NewsFloatingNavProps {
  categories: NewsFloatingCategory[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function NewsFloatingNav({
  categories,
  activeCategory,
  onSelectCategory,
}: NewsFloatingNavProps) {
  const { locale } = useTranslation();

  return (
    <nav
      aria-label="Market Wire Categories"
      className="sticky top-0 z-30 w-full py-2.5 sm:py-3 px-3 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center"
    >
      <div className="w-full max-w-full min-w-0 flex items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-name="round-tabs-anchors"
          className="relative pointer-events-auto rounded-full border border-white/15 bg-black/90 backdrop-blur-xl p-1 sm:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-center max-w-[calc(100vw-24px)] sm:max-w-full"
        >
          <div
            id="sticky-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full"
          >
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`nav-news-${cat.id}`}
                  role="tab"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`relative inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap outline-none ${
                    isSelected
                      ? 'bg-white/15 text-white font-semibold shadow-xs'
                      : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10'
                  }`}
                >
                  <span className="leading-none sm:hidden">
                    {cat.shortLabel || cat.label}
                  </span>
                  <span className="leading-none hidden sm:inline">
                    {cat.label}
                  </span>
                  {typeof cat.count === 'number' && cat.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white/[0.06] text-zinc-500'
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

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
      aria-label="News Categories"
      className="lg:hidden sticky top-0 z-30 w-full py-2 px-3 pointer-events-none select-none font-sans flex items-center justify-center"
    >
      <div className="w-full max-w-md min-w-0 flex items-center justify-center">
        {/* TradingView-Inspired Mobile Floating Segmented Pill */}
        <div
          data-name="round-tabs-anchors"
          className="w-full pointer-events-auto rounded-full border border-white/15 bg-black/95 backdrop-blur-xl p-1 shadow-[0_6px_24px_rgba(0,0,0,0.8)]"
        >
          <div
            id="sticky-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="grid grid-cols-6 gap-0.5 w-full items-center"
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
                  className={`relative flex items-center justify-center py-1.5 px-0.5 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer truncate outline-none select-none ${
                    isSelected
                      ? 'bg-white/15 text-white font-semibold shadow-xs'
                      : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10'
                  }`}
                  title={cat.label}
                >
                  <span className="truncate leading-none text-center">
                    {cat.shortLabel || cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

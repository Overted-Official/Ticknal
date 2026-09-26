'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface MarketNavSection {
  id: string;
  label: string;
  shortLabel: string;
}

export const MARKET_SECTIONS: MarketNavSection[] = [
  { id: 'market-overview', label: 'Market Overview', shortLabel: 'Overview' },
  { id: 'sector-rotation', label: 'Sector Rotation', shortLabel: 'Rotation' },
  { id: 'market-heatmap', label: 'Market Heatmap', shortLabel: 'Heatmap' },
];

export default function MarketsFloatingNav() {
  const [activeSection, setActiveSection] = useState<string>('market-overview');

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    // Check if the scroll container is command-surface-page
    const container = document.querySelector('.command-surface-page') as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 56;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else {
      const top = element.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (let i = MARKET_SECTIONS.length - 1; i >= 0; i--) {
        const sectionId = MARKET_SECTIONS[i].id;
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 160) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      setActiveSection(MARKET_SECTIONS[0].id);
    };

    const container = document.querySelector('.command-surface-page');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <nav
      aria-label="Markets Page Sections"
      className="sticky top-0 z-30 w-full max-w-full overflow-x-hidden py-1.5 sm:py-2 px-2 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center"
    >
      <div className="w-full max-w-full min-w-0 flex items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-name="round-tabs-anchors"
          className="relative pointer-events-auto rounded-[36px] border border-white/10 bg-black/80 backdrop-blur-md p-0.5 sm:p-1 w-fit max-w-[calc(100vw-16px)] sm:max-w-full overflow-hidden shadow-sm"
        >
          <div
            id="sticky-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar max-w-full"
          >
            {MARKET_SECTIONS.map((sec) => {
              const isSelected = activeSection === sec.id;

              return (
                <button
                  key={sec.id}
                  id={`header-${sec.id}`}
                  role="tab"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`relative inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap outline-none ${
                    isSelected
                      ? 'bg-white/10 text-white shadow-xs'
                      : 'bg-transparent text-[#8c8c8c] hover:text-neutral-200 hover:bg-white/[0.05] active:bg-white/10'
                  }`}
                >
                  <span className="leading-tight sm:hidden">{sec.shortLabel}</span>
                  <span className="leading-tight hidden sm:inline">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

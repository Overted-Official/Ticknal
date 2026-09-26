'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface MarketNavSection {
  id: string;
  label: string;
}

export const MARKET_SECTIONS: MarketNavSection[] = [
  { id: 'market-overview', label: 'Market Overview' },
  { id: 'sector-rotation', label: 'Sector Rotation' },
  { id: 'market-heatmap', label: 'Market Heatmap' },
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
      className="sticky top-0 z-30 w-full py-2 px-4 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center"
    >
      <div className="w-full flex items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-name="round-tabs-anchors"
          className="relative pointer-events-auto rounded-[36px] border border-border-subtle bg-black/60 backdrop-blur-[6px] p-1 w-fit max-w-full overflow-hidden shadow-sm"
        >
          <div
            id="sticky-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
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
                  className={`relative inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap outline-none ${
                    isSelected
                      ? 'bg-surface-active text-white shadow-xs'
                      : 'bg-transparent text-text-muted hover:text-white hover:bg-surface-active/50 active:bg-surface-active'
                  }`}
                >
                  <span className="leading-tight">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

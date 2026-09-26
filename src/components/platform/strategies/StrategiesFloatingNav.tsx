'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface StrategyNavSection {
  id: string;
  label: string;
  shortLabel: string;
}

export const STRATEGY_SECTIONS: StrategyNavSection[] = [
  { id: 'simulation-overview', label: 'Performance Simulation', shortLabel: 'Simulation' },
  { id: 'strategy-models', label: 'Algorithmic Models', shortLabel: 'Models' },
];

export default function StrategiesFloatingNav() {
  const [activeSection, setActiveSection] = useState<string>('simulation-overview');

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

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
      for (let i = STRATEGY_SECTIONS.length - 1; i >= 0; i--) {
        const sectionId = STRATEGY_SECTIONS[i].id;
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 160) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      setActiveSection(STRATEGY_SECTIONS[0].id);
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
      aria-label="Strategies Page Sections"
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
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full px-1 sm:px-1.5"
          >
            {STRATEGY_SECTIONS.map((sec) => {
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
                  className={`relative inline-flex items-center justify-center px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap outline-none ${
                    isSelected
                      ? 'bg-white/15 text-white font-semibold shadow-xs'
                      : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10'
                  }`}
                >
                  <span className="leading-none sm:hidden">{sec.shortLabel}</span>
                  <span className="leading-none hidden sm:inline">{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

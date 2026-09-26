'use client';

import React, { useEffect, useState, useCallback } from 'react';

export interface StrategyNavSection {
  id: string;
  label: string;
}

export const STRATEGY_SECTIONS: StrategyNavSection[] = [
  { id: 'simulation-overview', label: 'Performance Simulation' },
  { id: 'strategy-models', label: 'Algorithmic Models' },
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
      className="sticky top-0 z-30 w-full py-2 px-4 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center"
    >
      <div className="w-full flex items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-name="round-tabs-anchors"
          className="relative pointer-events-auto rounded-[36px] border border-[#3d3d3d] bg-black/60 backdrop-blur-[6px] p-1 w-fit max-w-full overflow-hidden shadow-sm"
        >
          <div
            id="sticky-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
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
                  className={`relative inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap outline-none ${
                    isSelected
                      ? 'bg-[#2e2e2e] text-white shadow-xs'
                      : 'bg-transparent text-[#8c8c8c] hover:text-neutral-200 hover:bg-[#2e2e2e]/50 active:bg-[#2e2e2e]'
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

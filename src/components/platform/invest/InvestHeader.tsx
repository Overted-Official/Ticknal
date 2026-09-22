'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LayoutGrid, LineChart, PieChart, Check } from '@/components/ui/icon-library';

export type InvestView = 'sectors' | 'chart' | 'portfolio';

interface InvestHeaderProps {
  currentView: InvestView;
  subtitle?: string;
  actions?: React.ReactNode;
}

const INVEST_PAGES: Array<{ label: string; view: InvestView; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { label: 'Sectors', view: 'sectors', href: '/invest?view=sectors', icon: LayoutGrid },
  { label: 'Charts', view: 'chart', href: '/invest?view=chart', icon: LineChart },
  { label: 'Portfolio', view: 'portfolio', href: '/invest?view=portfolio', icon: PieChart },
];

export default function InvestHeader({
  currentView,
  subtitle,
  actions,
}: InvestHeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activePage = INVEST_PAGES.find((p) => p.view === currentView) || INVEST_PAGES[0];

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="flex items-center justify-between gap-4 select-none pb-1 shrink-0">
      {/* Left: Breadcrumb & Dropdown Title */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-xs md:text-sm text-[#787b86] font-normal hover:text-white transition-colors cursor-pointer"
            onClick={() => router.push('/invest?view=sectors')}
          >
            Invest
          </span>
          <span className="text-xs md:text-sm text-[#50535e]">/</span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              className="group inline-flex items-center gap-1.5 text-2xl md:text-3xl font-bold text-white tracking-tight hover:opacity-90 transition-opacity focus:outline-hidden cursor-pointer"
            >
              <span>{activePage.label}</span>
              <ChevronDown
                className={`w-5 h-5 text-[#787b86] group-hover:text-white transition-transform duration-200 ${
                  isOpen ? 'transform rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-[#787b86] uppercase tracking-wider">
                  Invest Views
                </div>
                {INVEST_PAGES.map((page) => {
                  const isActive = page.view === currentView;
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.view}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (!isActive) {
                          router.push(page.href);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#3f3f46] text-white font-medium'
                          : 'text-[#d1d4dc] hover:text-white hover:bg-[#3f3f46]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-white' : 'text-[#787b86]'} />
                        <span>{page.label}</span>
                      </div>
                      {isActive && (
                        <Check size={16} className="text-[#089981]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {subtitle && (
          <p className="text-xs text-[#787b86] mt-0.5 tracking-tight">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </header>
  );
}

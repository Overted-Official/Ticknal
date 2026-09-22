'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ShieldCheck, TrendingUp, Landmark, Check } from '@/components/ui/icon-library';

interface NetWorthHeaderProps {
  currencyMode: 'EGP' | 'USD';
  onCurrencyModeChange: (mode: 'EGP' | 'USD') => void;
}

const DASHBOARD_PAGES = [
  { label: 'Networth', tab: 'net-worth', href: '/dashboard?tab=net-worth', icon: ShieldCheck },
  { label: 'Investments', tab: 'investments', href: '/dashboard?tab=investments', icon: TrendingUp },
  { label: 'Banks', tab: 'banks', href: '/dashboard?tab=banks', icon: Landmark },
];

export default function NetWorthHeader({
  currencyMode,
  onCurrencyModeChange,
}: NetWorthHeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="flex items-center justify-between gap-4 select-none pb-1">
      {/* Left: Single-line Breadcrumb & Title with Dropdown */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs md:text-sm text-[#787b86] font-normal hover:text-white transition-colors cursor-pointer"
          onClick={() => router.push('/dashboard?tab=net-worth')}
        >
          Dashboard
        </span>
        <span className="text-xs md:text-sm text-[#50535e]">/</span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="group inline-flex items-center gap-1.5 text-2xl md:text-3xl font-bold text-white tracking-tight hover:opacity-90 transition-opacity focus:outline-hidden"
          >
            <span>Networth</span>
            <ChevronDown
              className={`w-5 h-5 text-[#787b86] group-hover:text-white transition-transform duration-200 ${
                isOpen ? 'transform rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu for Dashboard Views */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-[#27272a] border border-[#3f3f46] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#787b86] uppercase tracking-wider">
                Dashboard views
              </div>
              {DASHBOARD_PAGES.map((page) => {
                const isActive = page.tab === 'net-worth';
                const Icon = page.icon;
                return (
                  <button
                    key={page.tab}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (!isActive) {
                        router.push(page.href);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      isActive
                        ? 'bg-[#3f3f46] text-white font-medium'
                        : 'text-[#d1d4dc] hover:text-white hover:bg-[#3f3f46]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#787b86]'}`} />
                      <span>{page.label}</span>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-[#089981]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: TradingView Cohesive Currency Segmented Control */}
      <div className="inline-flex items-center p-0.5 rounded-lg bg-[#18181b] border border-[#27272a]">
        <button
          type="button"
          onClick={() => onCurrencyModeChange('EGP')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            currencyMode === 'EGP'
              ? 'bg-[#27272a] text-white shadow-xs'
              : 'text-[#787b86] hover:text-white font-medium'
          }`}
        >
          EGP (£)
        </button>
        <button
          type="button"
          onClick={() => onCurrencyModeChange('USD')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            currencyMode === 'USD'
              ? 'bg-[#3f3f46] text-white shadow-xs'
              : 'text-[#787b86] hover:text-white font-medium'
          }`}
        >
          USD ($)
        </button>
      </div>
    </header>
  );
}

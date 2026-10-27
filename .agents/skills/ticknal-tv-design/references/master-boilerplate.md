# Master Boilerplate: Turnkey Page & Platform Template

Use this blueprint when building a new page in Ticknal, or when spinning up an entirely new platform that shares the exact same dark financial craft, typography, geometry, and design DNA.

---

## 1. Route Entry Point (`src/app/(main)/example/page.tsx`)

The server route handles auth verification, metadata, dynamic flags, and serializes initial data:

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import ExamplePageView from '@/components/platform/example/ExamplePageView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics & Operations | ticknal',
  description: 'Real-time market analytics, portfolio tracking, and executive intelligence.',
};

export default async function ExamplePage() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-plt-base text-plt-text overflow-hidden">
      <Suspense fallback={<div className="flex-1 bg-black" />}>
        <ExamplePageView />
      </Suspense>
    </div>
  );
}
```

---

## 2. Centralized PageView (`src/components/platform/example/ExamplePageView.tsx`)

The client page view is the scroll owner and layout orchestrator. It manages:
- Breadcrumb header with live market status pill
- Floating section navigation pill
- The `.app-page.page-sections-stack` container with responsive `--space-page-x` gutters
- Safe-area bottom padding

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import ExampleFloatingNav from './ExampleFloatingNav';
import ExampleExecutiveSection from './sections/ExampleExecutiveSection';
import ExampleTableSection from './sections/ExampleTableSection';
import ExampleDetailDrawer from './drawers/ExampleDetailDrawer';

export default function ExamplePageView() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none font-sans">
      
      {/* 1. Header (Breadcrumbs + Actions + Live Market Pulse) */}
      <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-plt-base">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Link href="/home" className="text-text-muted font-normal hover:text-text-primary transition-colors cursor-pointer">
            Home
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="font-semibold text-text-primary">Analytics</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {}}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title="Refresh Data"
          >
            {isLoading ? <InlineSpinner className="h-3.5 w-3.5" /> : <RefreshCw size={14} />}
          </button>

          <span className="hidden xs:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE MARKET
          </span>
        </div>
      </header>

      {/* 2. Sticky Floating Section Navigation */}
      <ExampleFloatingNav />

      {/* 3. Main Sections Stack (Controlled by .app-page & .page-sections-stack) */}
      <main className="app-page page-sections-stack pt-3 space-y-8 sm:space-y-10 pb-[calc(56px+var(--ticknal-safe-area-bottom)+1rem)] md:pb-24 max-w-7xl mx-auto w-full">
        <ExampleExecutiveSection onSelectEntity={setSelectedEntity} />
        <ExampleTableSection onSelectEntity={setSelectedEntity} />
      </main>

      {/* 4. Interactive Detail Drawer */}
      <ExampleDetailDrawer
        isOpen={Boolean(selectedEntity)}
        onClose={() => setSelectedEntity(null)}
        entity={selectedEntity}
      />
    </div>
  );
}
```

---

## 3. Sticky Floating Section Nav (`ExampleFloatingNav.tsx`)

A floating pill that targets the `.command-surface-page` scroll container and updates active states via a 160px scroll spy:

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';

const SECTIONS = [
  { id: 'section-overview', label: 'Executive Overview', shortLabel: 'Overview' },
  { id: 'section-analytics', label: 'Constituents & Flow', shortLabel: 'Analytics' },
];

export default function ExampleFloatingNav() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const container = document.querySelector('.command-surface-page') as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 56;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    } else {
      const top = element.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.getBoundingClientRect().top <= 160) {
          setActiveSection(SECTIONS[i].id);
          return;
        }
      }
      setActiveSection(SECTIONS[0].id);
    };

    const container = document.querySelector('.command-surface-page');
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <nav className="sticky top-0 z-30 w-full py-2.5 sm:py-3 px-3 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center">
      <div className="relative pointer-events-auto rounded-full border border-plt-border bg-plt-base/90 backdrop-blur-xl p-1 sm:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-center max-w-[calc(100vw-24px)] sm:max-w-full">
        <div role="tablist" className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          {SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`relative inline-flex items-center justify-center px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap outline-none ${
                  isSelected
                    ? 'bg-plt-active text-plt-text font-semibold shadow-xs'
                    : 'bg-transparent text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                }`}
              >
                <span className="sm:hidden">{sec.shortLabel}</span>
                <span className="hidden sm:inline">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## 4. Analytical Section with KPI Snap Rail (`ExampleExecutiveSection.tsx`)

Combines section title/subtitle, timeframe `.seg-control`, mobile-friendly KPI horizontal swipe rail, and TradingView-style Recharts Area:

```tsx
'use client';

import React, { useState } from 'react';
import { TrendingUp, Activity, Flame, ShieldAlert, BarChart3 } from '@/components/ui/icon-library';
import KPICard from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', 'YTD', '1Y'];

export default function ExampleExecutiveSection({ onSelectEntity }: { onSelectEntity: (e: any) => void }) {
  const [timeframe, setTimeframe] = useState('1M');

  const kpis = [
    { id: '1', title: 'Market Status', value: 'Bullish', changeText: '+2.4% EGX30', changeColorClass: 'text-profit-num', icon: TrendingUp, sparklinePoints: [50, 52, 51, 55, 58, 62], sparklineTrend: 'up' as const },
    { id: '2', title: 'Net Turnover', value: '4.82 Bn', unit: 'EGP', changeText: 'High Liquidity', changeColorClass: 'text-brand-blue', icon: Activity },
    { id: '3', title: 'Hot Money Inflow', value: '+342 M', unit: 'EGP NET', changeText: 'Foreign Buying', changeColorClass: 'text-profit-num', icon: Flame, sparklinePoints: [20, 25, 22, 28, 35, 40], sparklineTrend: 'up' as const },
    { id: '4', title: 'FX Risk Index', value: '38/100', unit: 'LOW RISK', changeText: 'Controlled Crawl', changeColorClass: 'text-emerald-400', icon: ShieldAlert },
    { id: '5', title: 'Sector Dispersion', value: '8.4%', changeText: 'Real Estate Leads', changeColorClass: 'text-amber-400', icon: BarChart3 },
  ];

  const chartData = [
    { date: '10-01', close: 31200 },
    { date: '10-08', close: 31450 },
    { date: '10-15', close: 31800 },
    { date: '10-22', close: 32250 },
    { date: '10-28', close: 32680 },
  ];

  return (
    <section id="section-overview" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="section-title">Executive Overview</h2>
          <p className="section-subtitle">Macro benchmark health, market breadth, and capital flow distribution</p>
        </div>

        <div className="seg-control">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`seg-control-btn ${timeframe === tf ? 'seg-control-btn-active' : ''}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Responsive 5-Card KPI Rail (Mobile Horizontal Snap -> Desktop 5-Col Grid) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:pb-0">
        {kpis.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[132px] xs:w-[140px] sm:w-[170px] md:w-[185px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Main Analytical Chart */}
      <div className="w-full h-80 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 48, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="execChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#089981" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e222d" strokeDasharray="2 2" vertical={false} strokeOpacity={0.6} />
            <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={6} />
            <YAxis orientation="right" width={50} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dx={8} domain={['auto', 'auto']} />
            <ReferenceLine
              y={32680}
              stroke="#089981"
              strokeDasharray="2 2"
              label={({ viewBox }: any) => viewBox && (
                <g transform={`translate(${viewBox.x + viewBox.width + 2}, ${viewBox.y - 10})`}>
                  <rect width="48" height="20" rx="4" fill="#089981" />
                  <text x="24" y="14" fill="#ffffff" textAnchor="middle" fontSize="10.5" fontWeight="bold">32,680</text>
                </g>
              )}
            />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="hover-card bg-[#3D3D3D] p-3 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[160px] border-0 text-white font-sans">
                    <span className="text-[11px] text-neutral-300 font-semibold">{label}</span>
                    <span className="text-sm font-bold tabular-nums">{d.close?.toLocaleString()} EGP</span>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="close" stroke="#089981" strokeWidth={2} fill="url(#execChartGrad)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

---

## 5. Interactive Detail Drawer (`ExampleDetailDrawer.tsx`)

Pure pitch black, sharp edges (`rounded-none`), Framer Motion spring transitions (bottom sheet on phone, side sheet on desktop):

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LineChart } from '@/components/ui/icon-library';

export default function ExampleDetailDrawer({ isOpen, onClose, entity }: { isOpen: boolean; onClose: () => void; entity: any }) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted || !isOpen || !entity) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex font-sans select-none" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Drawer Sheet */}
        <motion.div
          key="drawer-sheet"
          initial={isMobile ? { y: '100%' } : { x: '100%' }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: '100%' } : { x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className={`drawer-sheet ${!isMobile ? 'drawer-sheet-viewport-safe' : ''} bg-black rounded-none`}
        >
          {/* Header */}
          <div className="drawer-header border-b border-plt-border p-4 bg-black">
            {isMobile && (
              <div className="w-full flex items-center justify-center pb-2 cursor-pointer" onClick={onClose}>
                <div className="drawer-drag-pill" />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white border border-border-default flex items-center justify-center font-bold text-xs text-zinc-900 shrink-0">
                  {entity.symbol?.slice(0, 2) || 'EG'}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-semibold text-base text-plt-text tracking-tight truncate">{entity.name || entity.symbol}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="badge-symbol">{entity.symbol}</span>
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="drawer-close-btn" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="drawer-body flex-1 overflow-y-auto custom-scrollbar p-4 bg-black">
            {/* Detailed data grids, transaction history, breakdown */}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
```

---

## 6. Critical Token & Rule Checklist

Whenever building any platform UI with this template:

- [x] **Pitch Black Surface**: Background is `#000000` / `bg-plt-base`; widgets are `bg-transparent`.
- [x] **No Monospace**: Sans-serif exclusively (`font-sans`), with `tabular-nums` for numeric column alignment.
- [x] **Single `#3D3D3D` Surface**: Tooltips and hovercards use `.hover-card` / `.surface-popover` (`bg-[#3D3D3D]`).
- [x] **Brand Typography**: Lowercase `ticknal` in EuclidCircularSemibold, 600 weight, `-0.04em` tracking.
- [x] **Responsive Rail**: Mobile uses `snap-x snap-mandatory` with peeking cards (`w-[140px] sm:w-[170px] snap-start`); desktop converts to `lg:grid lg:grid-cols-5`.
- [x] **Safe Areas**: Main scroll container padding includes `pb-[calc(56px+var(--ticknal-safe-area-bottom)+1rem)] md:pb-24`.
- [x] **Hairline Separators**: Dividers use `border-plt-border-soft` (`border-white/[0.06]`) or `border-border-subtle` (`#222222`).

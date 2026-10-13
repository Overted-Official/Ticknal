'use client';

import React from 'react';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import MarketsFloatingNav from './MarketsFloatingNav';
import { useTranslation } from '@/lib/i18n';

export default function MarketsPageSkeleton() {
  const { locale } = useTranslation();

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
      {/* 1. Header (Instant shell breadcrumbs) */}
      <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-black">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Link
            href="/home"
            className="text-zinc-400 font-normal hover:text-white transition-colors cursor-pointer"
          >
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-zinc-600">/</span>
          <h1 className="font-semibold text-white">
            {locale === 'ar' ? 'الأسواق' : 'Markets'}
          </h1>
        </div>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar (Instant shell tabs) */}
      <MarketsFloatingNav />

      {/* 3. Main Sections Stack (Targeted Data Skeletons) */}
      <main className="app-page page-sections-stack pt-3 space-y-8 sm:space-y-10 px-4 sm:px-6 pb-28 md:pb-24 max-w-7xl mx-auto w-full">
        {/* Section 1: Major Indices Carousel & Overview KPIs */}
        <div id="market-overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border border-white/[0.08] p-4 rounded-xl bg-black space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton variant="circular" className="h-4 w-4" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Area Chart Silhouette */}
          <div className="border border-white/[0.08] p-4 sm:p-5 rounded-xl bg-black space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
            <div className="h-48 sm:h-64 flex items-end justify-between gap-1 pt-6 px-2">
              {[35, 42, 38, 55, 60, 48, 65, 72, 68, 80, 85, 78, 90, 84, 95].map((h, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-white/[0.04] rounded-t-xs animate-pulse"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: FX & Devaluation Risk Skeleton */}
        <div id="fx-devaluation" className="border border-white/[0.08] p-4 sm:p-5 rounded-xl bg-black space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border border-white/[0.06] rounded-lg space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Sector Heatmap / Treemap Skeleton */}
        <div id="market-heatmap" className="border border-white/[0.08] p-4 sm:p-5 rounded-xl bg-black space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <Skeleton className="h-4 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md hidden sm:block" />
            </div>
          </div>
          <div className="h-72 sm:h-80 w-full grid grid-cols-3 sm:grid-cols-4 grid-rows-3 gap-2">
            <div className="col-span-2 row-span-2 border border-white/[0.06] rounded-lg p-3 flex flex-col justify-between">
              <Skeleton className="h-4 w-28" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <div className="col-span-1 row-span-1 border border-white/[0.06] rounded-lg p-2 flex flex-col justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-1 row-span-2 border border-white/[0.06] rounded-lg p-2 flex flex-col justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-14" />
            </div>
            <div className="col-span-1 row-span-1 border border-white/[0.06] rounded-lg p-2 flex flex-col justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="col-span-2 row-span-1 border border-white/[0.06] rounded-lg p-2 flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

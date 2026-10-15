'use client';

import React from 'react';
import Skeleton from '@/components/ui/Skeleton';
import HomeInvestmentsHeader from './investments/HomeInvestmentsHeader';
import HomeFloatingNav from './HomeFloatingNav';
import MobileHomeHero from './MobileHomeHero';

export default function HomePageSkeleton() {
  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
      {/* 1. Mobile-Only Hero Banner (Instant shell) */}
      <div className="block md:hidden shrink-0 relative z-40">
        <MobileHomeHero isLoading={true} />
      </div>

      {/* Desktop/Tablet Header (Instant shell breadcrumbs) */}
      <div className="hidden md:block px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-black">
        <HomeInvestmentsHeader />
      </div>

      {/* 2. Sticky Floating Top Navigation Bar (Instant shell tabs) */}
      <HomeFloatingNav />

      {/* 3. Main Sections Stack (Targeted Data Skeletons) */}
      <div className="app-page page-sections-stack px-4 sm:px-6 pb-28 md:pb-20 pt-1 space-y-8">
        {/* Section 1: KPI Cards Grid Skeleton */}
        <section id="section-performance-overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-white/[0.08] p-4 rounded-xl bg-black space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton variant="circular" className="h-4 w-4" />
                </div>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Positions Table Skeleton */}
        <section id="section-my-positions" className="space-y-4">
          <div className="border border-white/[0.08] p-4 sm:p-5 rounded-xl bg-black space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circular" className="h-8 w-8" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-16" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-3.5 w-16 ml-auto" />
                    <Skeleton className="h-2.5 w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Market Signals Skeleton */}
        <section id="section-market-signals" className="space-y-4">
          <div className="border border-white/[0.08] p-4 sm:p-5 rounded-xl bg-black space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-white/[0.06] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circular" className="h-8 w-8" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-14" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

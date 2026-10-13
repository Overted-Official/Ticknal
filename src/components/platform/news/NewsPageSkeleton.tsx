'use client';

import React from 'react';
import Link from 'next/link';
import Skeleton from '@/components/ui/Skeleton';
import NewsFloatingNav from './NewsFloatingNav';
import { useTranslation } from '@/lib/i18n';

export default function NewsPageSkeleton() {
  const { locale } = useTranslation();

  const defaultCategories = [
    { id: 'all', label: locale === 'ar' ? 'الكل' : 'All', shortLabel: locale === 'ar' ? 'الكل' : 'All' },
    { id: 'stocks', label: locale === 'ar' ? 'أسهم مصر' : 'Egyptian Stocks', shortLabel: locale === 'ar' ? 'الأسهم' : 'Stocks' },
    { id: 'macro', label: locale === 'ar' ? 'اقتصاد كلي' : 'Macro & CBE', shortLabel: locale === 'ar' ? 'كلي' : 'Macro' },
    { id: 'disclosures', label: locale === 'ar' ? 'إفصاحات' : 'Disclosures', shortLabel: locale === 'ar' ? 'إفصاحات' : 'Disclosures' },
  ];

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
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
            {locale === 'ar' ? 'الأخبار' : 'News'}
          </h1>
        </div>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <NewsFloatingNav
        categories={defaultCategories}
        activeCategory="all"
        onSelectCategory={() => {}}
      />

      {/* 3. Page Title & Subtitle Hero */}
      <div className="px-4 sm:px-6 pt-2 pb-3 w-full shrink-0">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {locale === 'ar' ? 'الأخبار' : 'News'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          {locale === 'ar'
            ? 'إفصاحات حية، تحليلات كمية، وتغطية استثمارية فورية للشركات والأسواق'
            : 'Live disclosures, quantitative pulse, and breaking financial intelligence across EGX and macro markets'}
        </p>
      </div>

      {/* 4. Feed Stream Targeted Skeleton */}
      <div className="flex-1 min-h-0 flex gap-6 px-4 sm:px-6 pb-28 md:pb-20 max-w-7xl mx-auto w-full">
        {/* Left Desktop Sidebar Skeleton */}
        <div className="hidden lg:block shrink-0 w-64 xl:w-72 h-full space-y-4">
          <div className="p-4 border border-white/[0.08] rounded-xl bg-black space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Stream Timeline Skeletons */}
        <div className="flex-1 divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl bg-black overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 sm:p-5 flex gap-3.5">
              <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

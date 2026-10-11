'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Search } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import NewsFloatingNav, { type NewsFloatingCategory } from './NewsFloatingNav';
import NewsFilterSidebar from './widgets/NewsFilterSidebar';
import NewsFeedTimeline from './widgets/NewsFeedTimeline';
import GuestProLockModal from '@/components/platform/auth/GuestProLockModal';
import GuestConversionBanner from '@/components/platform/auth/GuestConversionBanner';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { useTranslation } from '@/lib/i18n';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_NEWS } from '@/components/landing/hero-scenes/hero-scene-snapshot';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NewsApiResponse {
  items: MarketNewsItemDTO[];
  total: number;
  updatedAt: string;
  categories: Array<{ id: string; label: string; count: number }>;
  trendingTickers: string[];
}

export default function NewsPageView() {
  const { locale } = useTranslation();
  const { isGuest } = useGuestGuard();
  const { isNavVisible } = useMobileNavScroll();

  const searchParams = useSearchParams();
  const isHeroScene = useHeroSceneMode();
  const targetItemId = searchParams?.get('item') || searchParams?.get('id') || null;

  // Filter State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pro Lock Modal State
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalFeature, setProModalFeature] = useState('News Bookmarking');
  const [isSyncing, setIsSyncing] = useState(false);

  // SWR Query for Live News from Database API
  const queryParams = new URLSearchParams();
  if (activeCategory && activeCategory !== 'all') queryParams.set('category', activeCategory);
  if (selectedTicker) queryParams.set('ticker', selectedTicker);
  if (searchQuery.trim()) queryParams.set('q', searchQuery.trim());
  if (targetItemId) queryParams.set('item', targetItemId);

  const { data: liveData, isLoading: liveIsLoading, mutate } = useSWR<NewsApiResponse>(
    isHeroScene ? null : `/api/news?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  );
  const data = isHeroScene ? HERO_SCENE_NEWS.data as unknown as NewsApiResponse : liveData;
  const isLoading = !isHeroScene && liveIsLoading;

  const items = data?.items || [];

  // Smooth-scroll and highlight target post when arriving from shared link (?item=...)
  useEffect(() => {
    if (!targetItemId || isLoading || items.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(targetItemId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [targetItemId, isLoading, items]);

  const floatingCategories: NewsFloatingCategory[] = [
    {
      id: 'all',
      label: locale === 'ar' ? 'كل الأخبار' : 'All News',
      shortLabel: locale === 'ar' ? 'الكل' : 'All',
      count: data?.categories?.find((c) => c.id === 'all')?.count ?? items.length,
    },
    {
      id: 'ticknal_take',
      label: locale === 'ar' ? 'نبض تكنال' : 'The Ticknal Take',
      shortLabel: locale === 'ar' ? 'تكنال' : 'Ticknal',
      count: data?.categories?.find((c) => c.id === 'ticknal_take')?.count,
    },
    {
      id: 'macro_market',
      label: locale === 'ar' ? 'الاقتصاد الكلي' : 'Macro Market',
      shortLabel: locale === 'ar' ? 'المركزي' : 'Macro',
      count: data?.categories?.find((c) => c.id === 'macro_market')?.count,
    },
    {
      id: 'listed_companies',
      label: locale === 'ar' ? 'شركات البورصة' : 'Listed Companies',
      shortLabel: locale === 'ar' ? 'البورصة' : 'EGX',
      count: data?.categories?.find((c) => c.id === 'listed_companies')?.count,
    },
    {
      id: 'funds',
      label: locale === 'ar' ? 'صناديق الاستثمار' : 'Investment Funds',
      shortLabel: locale === 'ar' ? 'الصناديق' : 'Funds',
      count: data?.categories?.find((c) => c.id === 'funds')?.count,
    },
    {
      id: 'gold_silver',
      label: locale === 'ar' ? 'الذهب والفضة' : 'Gold & Silver',
      shortLabel: locale === 'ar' ? 'الذهب' : 'Gold',
      count: data?.categories?.find((c) => c.id === 'gold_silver')?.count,
    },
  ];

  const sidebarCategories = [
    {
      id: 'all',
      label: locale === 'ar' ? 'كل الأخبار' : 'All News',
      count: data?.categories?.find((c) => c.id === 'all')?.count ?? items.length,
    },
    {
      id: 'ticknal_take',
      label: locale === 'ar' ? 'نبض تكنال' : 'The Ticknal Take',
      count: data?.categories?.find((c) => c.id === 'ticknal_take')?.count,
    },
    {
      id: 'macro_market',
      label: locale === 'ar' ? 'الاقتصاد الكلي' : 'Macro Market',
      count: data?.categories?.find((c) => c.id === 'macro_market')?.count,
    },
    {
      id: 'listed_companies',
      label: locale === 'ar' ? 'شركات البورصة (EGX)' : 'Listed Companies (EGX)',
      count: data?.categories?.find((c) => c.id === 'listed_companies')?.count,
    },
    {
      id: 'funds',
      label: locale === 'ar' ? 'صناديق الاستثمار' : 'Investment Funds',
      count: data?.categories?.find((c) => c.id === 'funds')?.count,
    },
    {
      id: 'gold_silver',
      label: locale === 'ar' ? 'الذهب والفضة' : 'Gold & Silver',
      count: data?.categories?.find((c) => c.id === 'gold_silver')?.count,
    },
  ];

  const handleTriggerPro = (feature: string) => {
    setProModalFeature(feature);
    setIsProModalOpen(true);
  };

  const handleSelectTicker = (sym: string) => {
    const cleanSym = sym.replace(/^[@$]/, '');
    setSelectedTicker((prev) => (prev === cleanSym ? null : cleanSym));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTicker(null);
    setActiveCategory('all');
  };

  const handleRefreshWire = async () => {
    if (isHeroScene || isLoading || isSyncing) return;
    setIsSyncing(true);
    try {
      await fetch('/api/news/sync', { method: 'POST' });
    } catch (err) {
      console.error('Failed to sync market wire:', err);
    } finally {
      await mutate();
      setIsSyncing(false);
    }
  };

  const hasActiveFilters = activeCategory !== 'all' || Boolean(selectedTicker) || Boolean(searchQuery.trim());

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
      {/* 1. Header (Breadcrumbs + Refresh) — Aligned with Markets page header */}
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

        <div className="flex items-center gap-3">
          {!isHeroScene && <button
            type="button"
            onClick={handleRefreshWire}
            disabled={isLoading || isSyncing}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title={locale === 'ar' ? 'تحديث الأخبار' : 'Refresh news'}
          >
            {isLoading || isSyncing ? (
              <InlineSpinner className="h-3.5 w-3.5" label="Refreshing news" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>}
        </div>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar — Centered pill on BOTH desktop and mobile */}
      <NewsFloatingNav
        categories={floatingCategories}
        activeCategory={activeCategory}
        onSelectCategory={(id) => setActiveCategory(id)}
      />

      {/* 3. Page Title & Subtitle Hero — Aligned with Markets page layout */}
      <div className="px-[var(--space-page-x)] pt-2 pb-3 w-full shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {locale === 'ar' ? 'الأخبار' : 'News'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {locale === 'ar'
                ? isHeroScene
                  ? 'لقطة أخبار السوق · ١٠ أكتوبر ٢٠٢٦'
                  : 'إفصاحات حية، تحليلات كمية، وتغطية استثمارية فورية للشركات والأسواق'
                : isHeroScene
                  ? 'Market news snapshot · 10 Oct 2026'
                  : 'Live disclosures, quantitative pulse, and breaking financial intelligence across EGX and macro markets'}
            </p>
          </div>

          {/* Search bar on mobile/tablet (where desktop sidebar is hidden) */}
          <div className="lg:hidden relative flex items-center w-full sm:w-64">
            <Search size={13} className="absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ar' ? 'بحث في الأخبار أو الأسهم...' : 'Search news or ticker...'}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Social Stream Feed Workspace: Full-width matching Markets & Home */}
      <div className="flex-1 min-h-0 flex w-full px-[var(--space-page-x)] bg-black lg:overflow-hidden gap-6 xl:gap-8">
        {/* Left Column: Feeds & Markets Sidebar (Desktop lg+, docked with its own subtle scroll) */}
        <div className="hidden lg:block shrink-0 w-64 xl:w-72 2xl:w-80 h-full overflow-y-auto custom-scrollbar pb-6 self-stretch">
          <NewsFilterSidebar
            categories={sidebarCategories}
            activeCategory={activeCategory}
            onSelectCategory={(id) => setActiveCategory(id)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTicker={selectedTicker}
            onSelectTicker={handleSelectTicker}
            trendingTickers={data?.trendingTickers || ['COMI', 'TMGH', 'SWDY', 'FWRY', 'EAST', 'EGX30', 'GOLD21K', 'USD/EGP', 'CIB_ADR', 'AZG']}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Center Stream: Expanded, airy feed timeline with internal desktop scroll */}
        <main
          aria-label="Market Social Feed"
          className={`flex-1 min-h-0 h-full lg:overflow-y-auto custom-scrollbar w-full flex flex-col bg-black lg:border-x border-white/[0.06] ${
            isGuest
              ? isNavVisible
                ? 'pb-[calc(112px+var(--ticknal-safe-area-bottom)+2rem)] md:pb-48 lg:pb-36'
                : 'pb-[calc(56px+var(--ticknal-safe-area-bottom)+2rem)] md:pb-48 lg:pb-36'
              : isNavVisible
              ? 'pb-[calc(56px+var(--ticknal-safe-area-bottom)+2rem)] md:pb-24 lg:pb-16'
              : 'pb-[max(var(--ticknal-safe-area-bottom),1.5rem)] md:pb-24 lg:pb-16'
          }`}
        >
          {/* Active Ticker Filter Banner */}
          {selectedTicker && (
            <div className="px-4 py-2 bg-blue-950/20 border-b border-white/[0.08] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Filtering posts for:</span>
                <span className="font-bold text-[#1d9bf0]">@{selectedTicker}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicker(null)}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors"
              >
                Clear filter ✕
              </button>
            </div>
          )}

          {/* Active Search Query Filter Banner */}
          {searchQuery.trim() && (
            <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Search results for:</span>
                <span className="font-semibold text-white">"{searchQuery.trim()}"</span>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors"
              >
                Clear ✕
              </button>
            </div>
          )}

          {/* Feed Post Timeline */}
          <NewsFeedTimeline
            items={items}
            isLoading={isLoading}
            asOf={isHeroScene ? HERO_SCENE_NEWS.asOf : undefined}
            targetItemId={targetItemId}
            onSelectTicker={handleSelectTicker}
            onBookmarkClick={handleTriggerPro}
            onResetFilters={handleResetFilters}
          />
        </main>
      </div>

      {/* Full-width Glassy Conversion Mini-Docker */}
      <GuestConversionBanner currentFeature="News Feed" />

      {/* Pro Lock Modal */}
      <GuestProLockModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        featureName={proModalFeature}
        title={`Unlock ${proModalFeature}`}
        description="Sign up for free to save high-impact disclosures, configure instant Telegram notifications, and sync your Egyptian portfolio."
      />
    </div>
  );
}

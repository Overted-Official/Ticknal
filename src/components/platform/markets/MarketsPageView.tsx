'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles, ExternalLink } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import MarketsFloatingNav from './MarketsFloatingNav';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import MarketOverviewSection, { type MarketTimeframe } from './sections/MarketOverviewSection';
import FxDevaluationSection from './sections/FxDevaluationSection';
import IncomeDistributionSection from './sections/IncomeDistributionSection';
import SectorRotationSection from './sections/SectorRotationSection';
import MarketHeatmapSection from './sections/MarketHeatmapSection';
import GuestConversionBanner from '@/components/platform/auth/GuestConversionBanner';
import GuestProLockModal from '@/components/platform/auth/GuestProLockModal';
import { useGuestGuard } from '@/context/GuestGuardContext';
import {
  type SectorsPerformanceResponse,
  aggregateSectorsFromStocks,
} from '@/lib/sectors-math';
import { useTranslation } from '@/lib/i18n';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_MARKETS } from '@/components/landing/hero-scenes/hero-scene-snapshot';
import { Tour, useTour, TourTriggerButton } from '@/components/ui/tour';
import { getMarketsTourSteps, MARKETS_TOUR_STORAGE_KEY } from '@/lib/tours/markets-tour-config';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MarketsPageView() {
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const { isNavVisible } = useMobileNavScroll();
  const { isGuest } = useGuestGuard();
  const isHeroScene = useHeroSceneMode();

  const tour = useTour(MARKETS_TOUR_STORAGE_KEY);
  const tourSteps = useMemo(() => getMarketsTourSteps(isRTL), [isRTL]);

  // Timeframe & Sizing State (default to 1M for responsive overview)
  const [timeframePreset, setTimeframePreset] = useState<MarketTimeframe | 'custom'>('1M');
  const [customStartDate, setCustomStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Sizing & Hierarchy Granularity
  const [sizingMetric, setSizingMetric] = useState<'turnover' | 'volume' | 'equal'>('turnover');
  const [granularity, setGranularity] = useState<'sector' | 'industryGroup' | 'industry' | 'ticker'>('sector');

  // Selection state
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Pro Lock Modal State
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proFeature, setProFeature] = useState('Sector Alpha Screener');

  // Compute start/end dates
  const { start, end } = useMemo(() => {
    const today = isHeroScene ? new Date('2026-10-10T12:00:00Z') : new Date();
    const endStr = today.toISOString().split('T')[0];

    if (timeframePreset === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    if (timeframePreset === '1D') {
      return { start: endStr, end: endStr };
    }

    const d = new Date(today);
    if (timeframePreset === '5D') {
      d.setDate(d.getDate() - 7);
    } else if (timeframePreset === '1M') {
      d.setMonth(d.getMonth() - 1);
    } else if (timeframePreset === '3M') {
      d.setMonth(d.getMonth() - 3);
    } else if (timeframePreset === '6M') {
      d.setMonth(d.getMonth() - 6);
    } else if (timeframePreset === 'YTD') {
      d.setFullYear(d.getFullYear(), 0, 1);
    } else if (timeframePreset === '1Y') {
      d.setFullYear(d.getFullYear() - 1);
    }

    return { start: d.toISOString().split('T')[0], end: endStr };
  }, [timeframePreset, customStartDate, customEndDate, isHeroScene]);

  // 1. SWR Query for Market Macro Data (cached by date range)
  const { data: liveMacroData, isLoading: isLiveMacroLoading, mutate: mutateMacro } = useSWR<SectorsPerformanceResponse>(
    isHeroScene ? null : `/api/sectors/performance?start=${start}&end=${end}&timeframe=${timeframePreset}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  const macroData = isHeroScene
    ? HERO_SCENE_MARKETS.data as unknown as SectorsPerformanceResponse
    : liveMacroData;
  const isMacroLoading = !isHeroScene && isLiveMacroLoading;

  // Instant in-memory hierarchy aggregation (0ms UI latency when changing granularity!)
  const { sectors, marketSummary } = useMemo(() => {
    if (!macroData?.rawStockItems || macroData.rawStockItems.length === 0) {
      return {
        sectors: macroData?.sectors || [],
        marketSummary: macroData?.marketSummary,
      };
    }
    return aggregateSectorsFromStocks(
      macroData.rawStockItems,
      granularity,
      macroData.egx30Return ?? null
    );
  }, [macroData, granularity]);

  const handleSelectSector = (sectorName: string) => {
    setSelectedSector(sectorName);
  };

  const handleSelectTicker = (tickerSymbol: string) => {
    setSelectedTicker(tickerSymbol);
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none font-sans">
      {/* 1. Markets Page Header (Breadcrumbs + Live Indicator) */}
      <header className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4 shrink-0 bg-plt-base">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <Link
            href="/home"
            className="text-text-muted font-normal hover:text-text-primary transition-colors cursor-pointer"
          >
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-text-muted">/</span>
          <h1 className="font-semibold text-text-primary">
            {locale === 'ar' ? 'الأسواق' : 'Markets'}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!isHeroScene && (
            <TourTriggerButton onClick={tour.start} />
          )}
          {!isHeroScene && <button
            type="button"
            onClick={() => mutateMacro()}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
            title={locale === 'ar' ? 'تحديث بيانات السوق' : 'Refresh market data'}
          >
            {isMacroLoading ? (
              <InlineSpinner className="h-3.5 w-3.5" label="Refreshing market data" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>}
        </div>
      </header>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <MarketsFloatingNav />

      {/* 3. Main 4-Section Executive Scroll */}
      <main
        className={`app-page page-sections-stack pt-3 space-y-8 sm:space-y-10 ${
          isGuest
            ? isNavVisible
              ? 'pb-[calc(112px+var(--ticknal-safe-area-bottom)+1rem)] md:pb-24'
              : 'pb-[calc(56px+var(--ticknal-safe-area-bottom)+1.25rem)] md:pb-24'
            : isNavVisible
            ? 'pb-[calc(56px+var(--ticknal-safe-area-bottom)+1rem)] md:pb-24'
            : 'pb-[max(var(--ticknal-safe-area-bottom),1.25rem)] md:pb-24'
        }`}
      >
        {/* Section 1: Executive Market Overview (includes KPIs & Major Indices Area Chart) */}
        <div data-tour="markets-overview">
          <MarketOverviewSection
            macroData={macroData}
            sectors={sectors}
            timeframe={timeframePreset === 'custom' ? '1M' : timeframePreset}
            onTimeframeChange={(tf) => setTimeframePreset(tf)}
            onSelectSector={handleSelectSector}
            isLoading={isMacroLoading}
          />
        </div>

        {/* Section 2: FX & Devaluation Risk (Fair Value, Barometer, CIB GDR, and Money Supply M2 Chart) */}
        <div data-tour="markets-fx">
          <FxDevaluationSection
            macroData={macroData}
            isLoading={isMacroLoading}
          />
        </div>

        {/* Section 3: Sector Rotation & Cycle Map */}
        <div data-tour="markets-sector-rotation">
          <SectorRotationSection
            macroData={macroData}
            sectors={sectors}
            selectedSector={selectedSector}
            onSelectSector={handleSelectSector}
            timeframe={timeframePreset === 'custom' ? '1M' : timeframePreset}
            onTimeframeChange={(tf) => setTimeframePreset(tf)}
          />
        </div>

        {/* Section 4: Market Performance Heatmap */}
        <div data-tour="markets-heatmap">
          <MarketHeatmapSection
            sectors={sectors}
            marketSummary={marketSummary}
            benchmarkReturn={macroData?.egx30Return ?? 0}
            timeframePreset={timeframePreset}
            setTimeframePreset={(preset) => setTimeframePreset(preset === '1W' ? '5D' : preset)}
            granularity={granularity}
            setGranularity={setGranularity}
            sizingMetric={sizingMetric}
            setSizingMetric={setSizingMetric}
            selectedSector={selectedSector}
            onSelectSector={setSelectedSector}
            selectedTicker={selectedTicker}
            onSelectTicker={handleSelectTicker}
            isLoading={isMacroLoading}
          />
        </div>

        {/* Section 5: Household Income & Wealth Distribution (21-Tier Demographic Purchasing Power Model) */}
        <div data-tour="markets-income">
          <IncomeDistributionSection
            isLoading={isMacroLoading}
          />
        </div>
      </main>

      {/* Floating Guest Conversion Pill */}
      <GuestConversionBanner currentFeature="Markets Overview" />

      {/* Pro Lock Modal */}
      <GuestProLockModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        featureName={proFeature}
        title="Access Ticknal's Full Power"
        description="Sign in to monitor your Egyptian market portfolio, automate your trading alerts, and test custom strategies."
      />

      {/* Walkthrough Product Tour */}
      <Tour
        steps={tourSteps}
        open={tour.open}
        onOpenChange={tour.setOpen}
        index={tour.index}
        onIndexChange={tour.setIndex}
        onFinish={tour.markSeen}
        onSkip={tour.markSeen}
        dark
      />
    </div>
  );
}

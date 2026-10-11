'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import type { SectorsPerformanceResponse, SectorPerformanceItem } from '@/lib/sectors-math';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Coins,
  Sparkles,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import MajorIndicesSection from './MajorIndicesSection';
import InvestorFlowSection from './InvestorFlowSection';
import type { InvestorFlowsResponse } from '@/lib/handlers/investor-flow-handler';
import { useTranslation } from '@/lib/i18n';
import { localizeSectorName } from '@/lib/finance/sector-translations';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_FLOWS } from '@/components/landing/hero-scenes/hero-scene-snapshot';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type MarketTimeframe = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y';

export const TIMEFRAMES: MarketTimeframe[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'];

interface MarketOverviewSectionProps {
  macroData?: SectorsPerformanceResponse;
  sectors?: SectorPerformanceItem[];
  timeframe: MarketTimeframe;
  onTimeframeChange: (tf: MarketTimeframe) => void;
  onSelectSector?: (sectorName: string) => void;
  isLoading?: boolean;
}

export default function MarketOverviewSection({
  macroData,
  sectors = [],
  timeframe,
  onTimeframeChange,
  onSelectSector,
  isLoading = false,
}: MarketOverviewSectionProps) {
  const { locale } = useTranslation();
  const isHeroScene = useHeroSceneMode();
  const marketSummary = macroData?.marketSummary;
  const egx30Return = macroData?.egx30Return ?? 0;

  const flowHorizon =
    timeframe === '3M' ? '3M' : timeframe === '6M' ? '6M' : timeframe === 'YTD' ? 'YTD' : timeframe === '1Y' ? '1Y' : '1M';

  const { data: liveFlowsData } = useSWR<InvestorFlowsResponse>(
    isHeroScene ? null : `/api/macro/investor-flows?horizon=${flowHorizon}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );
  const flowsData = isHeroScene ? HERO_SCENE_FLOWS.data as InvestorFlowsResponse : liveFlowsData;

  // 1. Breadth Metrics
  const totalGainers = marketSummary?.totalGainers ?? 0;
  const totalLosers = marketSummary?.totalLosers ?? 0;
  const totalStocks = marketSummary?.totalStocks || totalGainers + totalLosers || 1;
  const gainersPct = Math.round((totalGainers / totalStocks) * 100);
  const losersPct = Math.round((totalLosers / totalStocks) * 100);
  const unchangedPct = Math.max(0, 100 - gainersPct - losersPct);
  const netAdvancers = totalGainers - totalLosers;

  // 2. Turnover Display
  const turnoverDisplay = useMemo(() => {
    const val = marketSummary?.totalTurnover || 0;
    if (val >= 1_000_000_000_000) {
      const num = (val / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return locale === 'ar' ? `${num} تريليون` : `${num} Tn`;
    }
    if (val >= 1_000_000_000) {
      const num = (val / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return locale === 'ar' ? `${num} مليار` : `${num} Bn`;
    }
    if (val >= 1_000_000) {
      const num = (val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return locale === 'ar' ? `${num} مليون` : `${num} M`;
    }
    return `${val.toLocaleString('en-US')}`;
  }, [marketSummary?.totalTurnover, locale]);

  // 3. Leading & Lagging Sectors
  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => b.turnoverWeightedReturn - a.turnoverWeightedReturn);
  }, [sectors]);

  const topSector = marketSummary?.topSector || sortedSectors[0]?.sector || 'Real Estate';
  const topSectorReturn = marketSummary?.topSectorReturn ?? sortedSectors[0]?.turnoverWeightedReturn ?? 0;

  const laggardSector =
    marketSummary?.laggardSector ||
    sortedSectors[sortedSectors.length - 1]?.sector ||
    'Healthcare';
  const laggardSectorReturn =
    marketSummary?.laggardSectorReturn ??
    sortedSectors[sortedSectors.length - 1]?.turnoverWeightedReturn ??
    0;

  const dispersionSpread = topSectorReturn - laggardSectorReturn;

  // 4. Market Regime / Status Determination
  const marketStatus = useMemo(() => {
    if (egx30Return >= 3.0 && gainersPct >= 55) {
      return {
        label: 'Strong Bullish',
        labelAr: 'صعود قوي',
        trend: 'up' as const,
        bg: 'bg-profit-chart/20',
        text: 'text-profit-num',
        badge: 'bg-profit-chart/15 text-profit-num border-profit-num/25',
      };
    }
    if (egx30Return > 0 && gainersPct >= 48) {
      return {
        label: 'Bullish Trend',
        labelAr: 'اتجاه صاعد',
        trend: 'up' as const,
        bg: 'bg-profit-chart/20',
        text: 'text-profit-num',
        badge: 'bg-profit-chart/15 text-profit-num border-profit-num/25',
      };
    }
    if (egx30Return <= -3.0 && gainersPct <= 40) {
      return {
        label: 'Strong Bearish',
        labelAr: 'هبوط حاد',
        trend: 'down' as const,
        bg: 'bg-loss-chart/20',
        text: 'text-loss-num',
        badge: 'bg-loss-chart/15 text-loss-num border-loss-num/25',
      };
    }
    if (egx30Return < 0 && gainersPct < 48) {
      return {
        label: 'Bearish Pullback',
        labelAr: 'تصحيح هابط',
        trend: 'down' as const,
        bg: 'bg-loss-chart/20',
        text: 'text-loss-num',
        badge: 'bg-loss-chart/15 text-loss-num border-loss-num/25',
      };
    }
    return {
      label: 'Consolidating',
      labelAr: 'حركة عرضية',
      trend: 'neutral' as const,
      bg: 'bg-surface-sunken',
      text: 'text-text-muted',
      badge: 'bg-surface-sunken text-text-muted border-border-subtle',
    };
  }, [egx30Return, gainersPct]);

  // 5. Real Data Sparklines for KPI Cards
  const egx30SparklinePoints = useMemo(() => {
    if (macroData?.egx30History && macroData.egx30History.length >= 2) {
      return macroData.egx30History.map((h) => h.close);
    }
    return undefined;
  }, [macroData?.egx30History]);

  const breadthSparklinePoints = useMemo(() => {
    if (macroData?.dailyBreadth && macroData.dailyBreadth.length >= 2) {
      return macroData.dailyBreadth.map((b) => b.adLine);
    }
    return undefined;
  }, [macroData?.dailyBreadth]);

  const turnoverSparklinePoints = useMemo(() => {
    if (macroData?.egx30History && macroData.egx30History.length >= 2) {
      return macroData.egx30History.map((h) => h.volume || 0);
    }
    return undefined;
  }, [macroData?.egx30History]);

  const dispersionSparklinePoints = useMemo(() => {
    if (sortedSectors.length >= 3) {
      return sortedSectors.map((s) => s.turnoverWeightedReturn).reverse();
    }
    return undefined;
  }, [sortedSectors]);

  // 6. Investor Flow & Breadth Calculations
  const unchangedCount = Math.max(0, totalStocks - totalGainers - totalLosers);
  const egyShare = flowsData?.summary?.egyptianShareToday ?? 80;
  const arabShare = flowsData?.summary?.arabShareToday ?? 12;
  const forShare = flowsData?.summary?.foreignShareToday ?? 8;
  const totalFlowShare = egyShare + arabShare + forShare || 100;
  const egyPct = Math.round((egyShare / totalFlowShare) * 100);
  const arabPct = Math.round((arabShare / totalFlowShare) * 100);
  const forPct = Math.max(0, 100 - egyPct - arabPct);

  const isDaily = timeframe === '1D';
  const netForeignValue = isDaily
    ? (flowsData?.summary?.foreignNetToday ?? 0)
    : (flowsData?.summary?.cumulativeForeignNet ?? flowsData?.summary?.foreignNetToday ?? 0);

  const foreignNetFormatted = useMemo(() => {
    const val = netForeignValue;
    const sign = val >= 0 ? '+' : '-';
    const absVal = Math.abs(val);
    if (absVal >= 1_000_000_000) {
      const num = (absVal / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${sign}${num} ${locale === 'ar' ? 'مليار' : 'Bn'}`;
    }
    const num = (absVal / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${sign}${num} ${locale === 'ar' ? 'م' : 'M'}`;
  }, [netForeignValue, locale]);

  // 7. 5 Canonical KPI Card Specifications
  const kpiCards: KPICardProps[] = [
    {
      id: 'market-status',
      title: locale === 'ar' ? 'حالة السوق' : 'Market Status',
      shortTitle: locale === 'ar' ? 'حالة السوق' : 'Market Status',
      icon: marketStatus.trend === 'up' ? TrendingUp : marketStatus.trend === 'down' ? TrendingDown : Activity,
      iconBgClass: `${marketStatus.bg} ${marketStatus.text}`,
      iconColorClass: marketStatus.text,
      value: locale === 'ar' ? marketStatus.labelAr : marketStatus.label,
      changeText: `EGX 30 ${egx30Return >= 0 ? '+' : ''}${egx30Return.toFixed(1)}%`,
      changeColorClass: egx30Return >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? `إطار ${timeframe}` : `${timeframe} Horizon`,
      sparklinePoints: egx30SparklinePoints,
      sparklineTrend: egx30Return >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'major-indices',
    },
    {
      id: 'market-breadth',
      title: locale === 'ar' ? 'اتساع السوق' : 'Market Breadth',
      shortTitle: locale === 'ar' ? 'اتساع السوق' : 'Market Breadth',
      icon: Activity,
      iconBgClass: netAdvancers >= 0 ? 'bg-profit-chart/20 text-profit-num' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: netAdvancers >= 0 ? 'text-profit-num' : 'text-loss-num',
      value: `${gainersPct}%`,
      unit: locale === 'ar' ? 'صاعد' : 'ADVANCERS',
      changeText: locale === 'ar' ? `${totalGainers} صاعد • ${totalLosers} هابط` : `${totalGainers} Up • ${totalLosers} Down`,
      changeColorClass: 'text-text-primary',
      metaText: locale === 'ar' ? `(${totalStocks} سهم)` : `(${totalStocks} Tickers)`,
      showSparkline: false,
      customBottomContent: (
        <div className="space-y-1 w-full">
          <div className="h-1.5 sm:h-2 w-full rounded-full overflow-hidden flex bg-white/10">
            <div
              style={{ width: `${gainersPct}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`Advancing: ${totalGainers} (${gainersPct}%)`}
            />
            <div
              style={{ width: `${losersPct}%` }}
              className="h-full bg-rose-500 transition-all duration-300"
              title={`Declining: ${totalLosers} (${losersPct}%)`}
            />
            <div
              style={{ width: `${unchangedPct}%` }}
              className="h-full bg-white/30 transition-all duration-300"
              title={`Unchanged: ${unchangedCount} (${unchangedPct}%)`}
            />
          </div>
          <div className="flex items-center justify-between text-[8.5px] xs:text-[9px] sm:text-[10px] tabular-nums font-medium leading-none">
            <span className="text-emerald-400 font-semibold">{totalGainers} {locale === 'ar' ? 'صاعد' : 'Up'}</span>
            <span className="text-rose-400 font-semibold">{totalLosers} {locale === 'ar' ? 'هابط' : 'Down'}</span>
            <span className="text-white/50">{unchangedCount} {locale === 'ar' ? 'مستقر' : 'Flat'}</span>
          </div>
        </div>
      ),
      targetId: 'major-indices',
    },
    {
      id: 'traded-turnover',
      title: locale === 'ar' ? 'قيمة التداول' : 'Traded Turnover',
      shortTitle: locale === 'ar' ? 'التداول' : 'Turnover',
      icon: Coins,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: turnoverDisplay,
      unit: locale === 'ar' ? 'ج.م' : 'EGP',
      badgeText: locale === 'ar' ? 'تنفيذ' : 'Execution',
      badgeClass: 'bg-brand-blue/15 text-brand-blue border-brand-blue/25',
      changeText: locale === 'ar' ? `${macroData?.timeframe?.tradingDaysCount || 1} جلسات` : `${macroData?.timeframe?.tradingDaysCount || 1} Sessions`,
      changeColorClass: 'text-text-primary',
      metaText: locale === 'ar' ? 'إجمالي السيولة المتداولة' : 'Total Traded Liquidity',
      sparklinePoints: turnoverSparklinePoints,
      sparklineTrend: 'neutral',
      showSparkline: true,
      hideBadgeOnMobile: true,
      targetId: 'major-indices',
    },
    {
      id: 'net-foreign-inflow',
      title: locale === 'ar' ? 'صافي تدفقات الأجانب' : 'Net Foreign Inflow',
      shortTitle: locale === 'ar' ? 'صافي الأجانب' : 'Foreign Net',
      icon: Globe,
      iconBgClass: netForeignValue >= 0 ? 'bg-profit-chart/20 text-profit-num' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: netForeignValue >= 0 ? 'text-profit-num' : 'text-loss-num',
      value: foreignNetFormatted,
      unit: locale === 'ar' ? 'صافي ج.م' : 'EGP NET',
      changeText: isDaily
        ? (netForeignValue >= 0
            ? (locale === 'ar' ? 'تدفقات أجنبية واردة' : 'Foreign Inflow')
            : (locale === 'ar' ? 'تدفقات أجنبية خارجة' : 'Foreign Outflow'))
        : (netForeignValue >= 0
            ? (locale === 'ar' ? 'صافي تدفق وارد' : 'Net Cumulative Inflow')
            : (locale === 'ar' ? 'صافي تدفق خارج' : 'Net Cumulative Outflow')),
      changeColorClass: netForeignValue >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? `إطار ${timeframe}` : `${timeframe} Horizon`,
      sparklinePoints: flowsData?.history && flowsData.history.length >= 2
        ? flowsData.history.map((h) => h.cumulativeForeignNet)
        : undefined,
      sparklineTrend: netForeignValue >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'investor-flows',
    },
    {
      id: 'investor-flow',
      title: locale === 'ar' ? 'تدفقات المستثمرين' : 'Investor Flow',
      shortTitle: locale === 'ar' ? 'التدفقات' : 'Flows',
      icon: Sparkles,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: `${egyPct}%`,
      unit: locale === 'ar' ? 'محلي' : 'DOMESTIC',
      changeText: locale === 'ar'
        ? `المصريون ${egyPct}% • العرب ${arabPct}%`
        : `Egyptians ${egyPct}% • Arabs ${arabPct}%`,
      changeColorClass: 'text-text-primary',
      metaText: locale === 'ar' ? `الأجانب ${forPct}%` : `Foreigners ${forPct}%`,
      showSparkline: false,
      customBottomContent: (
        <div className="space-y-1 w-full">
          <div className="h-1.5 sm:h-2 w-full rounded-full overflow-hidden flex bg-white/10">
            <div
              style={{ width: `${egyPct}%` }}
              className="h-full bg-blue-500 transition-all duration-300"
              title={`Egyptians: ${egyPct}%`}
            />
            <div
              style={{ width: `${arabPct}%` }}
              className="h-full bg-amber-500 transition-all duration-300"
              title={`Arabs: ${arabPct}%`}
            />
            <div
              style={{ width: `${forPct}%` }}
              className="h-full bg-purple-500 transition-all duration-300"
              title={`Foreigners: ${forPct}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[8.5px] xs:text-[9px] sm:text-[10px] tabular-nums font-medium leading-none">
            <span className="text-blue-400 font-semibold">{locale === 'ar' ? 'مصر' : 'EGY'} {egyPct}%</span>
            <span className="text-amber-400 font-semibold">{locale === 'ar' ? 'عرب' : 'ARB'} {arabPct}%</span>
            <span className="text-purple-400 font-semibold">{locale === 'ar' ? 'أجانب' : 'FOR'} {forPct}%</span>
          </div>
        </div>
      ),
      targetId: 'investor-flows',
    },
  ];

  return (
    <section id="market-overview" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">
              {locale === 'ar' ? 'نظرة عامة على السوق' : 'Market Overview'}
            </h2>
          </div>
          <p className="section-subtitle">
            {locale === 'ar'
              ? 'أداء المؤشرات الرئيسية، اتساع الصعود والهبوط في الأسهم، وتفاوت أداء القطاعات عبر الإطار الزمني المحدد'
              : 'Benchmark performance, equity advance/decline breadth, and sector divergence across your selected horizon'}
          </p>
        </div>

        {/* Global Section Timeframe Switcher */}
        <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
          <div className="seg-control">
            {TIMEFRAMES.map((tf) => {
              const isSelected = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onTimeframeChange(tf)}
                  className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Canonical 5-Grid KPI Rails (Mobile Snap Rail: 2 cards + half of 3rd) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[132px] xs:w-[140px] sm:w-[170px] md:w-[185px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Major Indices Area Chart & Selectable Chips (Integrated directly inside Market Overview) */}
      <MajorIndicesSection
        macroData={macroData}
        isLoading={isLoading}
      />

      {/* 4. EGX Investor Flow (Domestic vs. Foreign Hot Money) Progression Chart */}
      <InvestorFlowSection />
    </section>
  );
}

'use client';

import React, { useMemo } from 'react';
import type { SectorsPerformanceResponse, SectorPerformanceItem } from '@/lib/sectors-math';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Coins,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import MajorIndicesSection from './MajorIndicesSection';

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
  const marketSummary = macroData?.marketSummary;
  const egx30Return = macroData?.egx30Return ?? 0;

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
      return `${(val / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tn`;
    }
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
    }
    return `${val.toLocaleString('en-US')}`;
  }, [marketSummary?.totalTurnover]);

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
      return { label: 'Strong Bullish', trend: 'up' as const, bg: 'bg-profit-chart/20', text: 'text-profit-num', badge: 'bg-profit-chart/15 text-profit-num border-profit-num/25' };
    }
    if (egx30Return > 0 && gainersPct >= 48) {
      return { label: 'Bullish Trend', trend: 'up' as const, bg: 'bg-profit-chart/20', text: 'text-profit-num', badge: 'bg-profit-chart/15 text-profit-num border-profit-num/25' };
    }
    if (egx30Return <= -3.0 && gainersPct <= 40) {
      return { label: 'Strong Bearish', trend: 'down' as const, bg: 'bg-loss-chart/20', text: 'text-loss-num', badge: 'bg-loss-chart/15 text-loss-num border-loss-num/25' };
    }
    if (egx30Return < 0 && gainersPct < 48) {
      return { label: 'Bearish Pullback', trend: 'down' as const, bg: 'bg-loss-chart/20', text: 'text-loss-num', badge: 'bg-loss-chart/15 text-loss-num border-loss-num/25' };
    }
    return { label: 'Consolidating', trend: 'neutral' as const, bg: 'bg-surface-sunken', text: 'text-text-muted', badge: 'bg-surface-sunken text-text-muted border-border-subtle' };
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

  // 6. 4 Canonical KPI Card Specifications
  const kpiCards: KPICardProps[] = [
    {
      id: 'market-status',
      title: 'Market Status',
      icon: marketStatus.trend === 'up' ? TrendingUp : marketStatus.trend === 'down' ? TrendingDown : Activity,
      iconBgClass: `${marketStatus.bg} ${marketStatus.text}`,
      iconColorClass: marketStatus.text,
      value: marketStatus.label,
      badgeText: `EGX 30 ${egx30Return >= 0 ? '+' : ''}${egx30Return.toFixed(1)}%`,
      badgeClass: marketStatus.badge,
      changeText: `${gainersPct}% Advancing`,
      changeColorClass: gainersPct >= 50 ? 'text-profit-num' : 'text-loss-num',
      metaText: `${timeframe} Horizon`,
      sparklinePoints: egx30SparklinePoints,
      sparklineTrend: egx30Return >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'major-indices',
    },
    {
      id: 'market-breadth',
      title: 'Market Breadth',
      icon: Activity,
      iconBgClass: netAdvancers >= 0 ? 'bg-profit-chart/20 text-profit-num' : 'bg-loss-chart/20 text-loss-num',
      iconColorClass: netAdvancers >= 0 ? 'text-profit-num' : 'text-loss-num',
      value: `${gainersPct}%`,
      unit: 'ADVANCERS',
      badgeText: netAdvancers >= 0 ? `+${netAdvancers} Net` : `${netAdvancers} Net`,
      badgeClass: netAdvancers >= 0 ? 'bg-profit-chart/15 text-profit-num border-profit-num/25' : 'bg-loss-chart/15 text-loss-num border-loss-num/25',
      changeText: `${totalGainers} Up • ${totalLosers} Down`,
      changeColorClass: 'text-text-primary',
      metaText: `${unchangedPct}% Unchanged (${totalStocks} Tickers)`,
      sparklinePoints: breadthSparklinePoints,
      sparklineTrend: netAdvancers >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'major-indices',
    },
    {
      id: 'traded-turnover',
      title: 'Traded Turnover',
      icon: Coins,
      iconBgClass: 'bg-brand-blue/20 text-brand-blue',
      iconColorClass: 'text-brand-blue',
      value: turnoverDisplay,
      unit: 'EGP',
      badgeText: 'Execution',
      badgeClass: 'bg-brand-blue/15 text-brand-blue border-brand-blue/25',
      changeText: `${macroData?.timeframe?.tradingDaysCount || 1} Sessions`,
      changeColorClass: 'text-text-primary',
      metaText: 'Total Traded Liquidity',
      sparklinePoints: turnoverSparklinePoints,
      sparklineTrend: 'neutral',
      showSparkline: true,
      targetId: 'major-indices',
    },
    {
      id: 'sector-dispersion',
      title: 'Sector Dispersion',
      icon: Sparkles,
      iconBgClass: 'bg-accent-orange/20 text-accent-orange',
      iconColorClass: 'text-accent-orange',
      value: `+${dispersionSpread.toFixed(1)}%`,
      unit: 'SPREAD',
      badgeText: 'Dispersion',
      badgeClass: 'bg-accent-orange/15 text-accent-orange border-accent-orange/25',
      changeText: `+${topSectorReturn.toFixed(1)}% vs ${laggardSectorReturn.toFixed(1)}%`,
      changeColorClass: 'text-profit-num',
      metaText: `${topSector} vs ${laggardSector}`,
      sparklinePoints: dispersionSparklinePoints,
      sparklineTrend: dispersionSpread >= 0 ? 'up' : 'down',
      showSparkline: true,
      targetId: 'major-indices',
      onClick: () => onSelectSector?.(topSector),
    },
  ];

  return (
    <section id="market-overview" className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16">
      {/* 1. Section Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Market Overview</h2>
          </div>
          <p className="section-subtitle">
            Benchmark performance, equity advance/decline breadth, and sector divergence across your selected horizon
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

      {/* 2. Canonical 4-Grid KPI Rails (Home Page Style with Mobile Snap Rail) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* 3. Major Indices Area Chart & Selectable Chips (Integrated directly inside Market Overview) */}
      <MajorIndicesSection
        macroData={macroData}
        isLoading={isLoading}
      />
    </section>
  );
}

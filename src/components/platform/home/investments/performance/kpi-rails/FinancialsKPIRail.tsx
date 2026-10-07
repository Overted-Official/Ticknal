'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useTranslation } from '@/lib/i18n';
import { Wallet, TrendingUp, CheckCircle2, Target } from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from './KPICard';
import { type OrderStats } from '../../homeInvestmentsTypes';

interface FinancialsKPIRailProps {
  orderStats: OrderStats;
}

export default function FinancialsKPIRail({ orderStats }: FinancialsKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();
  const { locale } = useTranslation();
  const currencyUnit = locale === 'ar' ? 'ج.م' : '£';

  const formatNumber = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) return '••••••';
    if (value === 0) return '0.0';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  const unrealizedPct =
    orderStats.openCostBasis > 0
      ? (orderStats.unrealized / orderStats.openCostBasis) * 100
      : 0;

  const totalGain = orderStats.unrealized + orderStats.realized;
  const totalRoi = orderStats.totalRoi;

  // KPI sparklines represent the current calendar year only. The full
  // history remains available in the detailed progression chart below.
  const currentYear = new Date().getUTCFullYear().toString();
  const ytdData = orderStats.monthlyData?.filter((month) => month.yearMonth?.startsWith(currentYear)) ?? [];
  const marketValPoints = ytdData.map((m) => m.marketValue ?? m.invested).filter((v) => v !== undefined && v > 0);
  const unrealizedPoints = ytdData.map((m) => m.unrealizedPl ?? m.pl).filter((v) => v !== undefined);
  const realizedPoints = ytdData.map((m) => m.cumulativeRealizedPl ?? m.pl).filter((v) => v !== undefined);
  const roiPoints = ytdData.map((m) => m.roi).filter((v) => v !== undefined);

  const cards: KPICardProps[] = [
    {
      id: 'portfolio-value',
      targetId: 'section-monthly-progression',
      title: locale === 'ar' ? 'قيمة المحفظة' : 'Portfolio Value',
      shortTitle: locale === 'ar' ? 'المحفظة' : 'Portfolio',
      icon: Wallet,
      iconBgClass: 'bg-brand-blue text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.openMarketValue),
      unit: currencyUnit,
      changeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      changeColorClass: unrealizedPct >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? 'الإجمالي' : 'total',
      sparklinePoints: marketValPoints && marketValPoints.length > 1 ? marketValPoints : undefined,
      sparklineTrend: unrealizedPct >= 0 ? 'up' : 'down',
    },
    {
      id: 'unrealized-gain',
      targetId: 'section-active-positions',
      title: locale === 'ar' ? 'الأرباح غير المحققة' : 'Unrealized Gain',
      shortTitle: locale === 'ar' ? 'غير محققة' : 'Unrealized',
      icon: TrendingUp,
      iconBgClass: orderStats.unrealized >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.unrealized, true),
      unit: currencyUnit,
      changeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      changeColorClass: orderStats.unrealized >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? 'المفتوحة' : 'open',
      sparklinePoints: unrealizedPoints && unrealizedPoints.length > 1 ? unrealizedPoints : undefined,
      sparklineTrend: orderStats.unrealized >= 0 ? 'up' : 'down',
    },
    {
      id: 'realized-gain',
      targetId: 'section-monthly-progression',
      title: locale === 'ar' ? 'الأرباح المحققة' : 'Realized Gain',
      shortTitle: locale === 'ar' ? 'المحققة' : 'Realized',
      icon: CheckCircle2,
      iconBgClass: orderStats.realized >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.realized, true),
      unit: currencyUnit,
      changeText:
        locale === 'ar'
          ? `${orderStats.closedWinning} رابحة · ${orderStats.closedLosing} خاسرة`
          : `${orderStats.closedWinning}W · ${orderStats.closedLosing}L`,
      changeColorClass: orderStats.realized >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? 'المغلقة' : 'closed',
      sparklinePoints: realizedPoints && realizedPoints.length > 1 ? realizedPoints : undefined,
      sparklineTrend: orderStats.realized >= 0 ? 'up' : 'down',
    },
    {
      id: 'total-gain',
      targetId: 'section-monthly-progression',
      title: locale === 'ar' ? 'إجمالي الأرباح' : 'Total Gain',
      shortTitle: locale === 'ar' ? 'الإجمالي' : 'Total Gain',
      icon: Target,
      iconBgClass: totalGain >= 0 ? 'bg-accent-amber text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(totalGain, true),
      unit: currencyUnit,
      changeText: `${totalRoi >= 0 ? '+' : ''}${totalRoi.toFixed(1)}%`,
      changeColorClass: totalGain >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: locale === 'ar' ? 'العائد' : 'ROI',
      sparklinePoints: roiPoints && roiPoints.length > 1 ? roiPoints : undefined,
      sparklineTrend: totalGain >= 0 ? 'up' : 'down',
    },
  ];

  return (
    <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          {...card}
          className="shrink-0 w-[138px] xs:w-[145px] sm:w-[180px] lg:w-full snap-start"
        />
      ))}
    </div>
  );
}

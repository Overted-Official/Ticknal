'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Wallet, TrendingUp, CheckCircle2, Target } from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from './KPICard';
import { type OrderStats } from '../../homeInvestmentsTypes';

interface FinancialsKPIRailProps {
  orderStats: OrderStats;
}

export default function FinancialsKPIRail({ orderStats }: FinancialsKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();

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

  // Extract sparkline historical trends from monthly progression
  const marketValPoints = orderStats.monthlyData?.map((m) => m.marketValue ?? m.invested).filter((v) => v !== undefined && v > 0);
  const unrealizedPoints = orderStats.monthlyData?.map((m) => m.unrealizedPl ?? m.pl).filter((v) => v !== undefined);
  const realizedPoints = orderStats.monthlyData?.map((m) => m.cumulativeRealizedPl ?? m.pl).filter((v) => v !== undefined);
  const roiPoints = orderStats.monthlyData?.map((m) => m.roi).filter((v) => v !== undefined);

  const cards: KPICardProps[] = [
    {
      id: 'portfolio-value',
      targetId: 'section-monthly-progression',
      title: 'Portfolio Value',
      icon: Wallet,
      iconBgClass: 'bg-brand-blue text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.openMarketValue),
      unit: '£',
      changeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      changeColorClass: unrealizedPct >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'total',
      sparklinePoints: marketValPoints && marketValPoints.length > 1 ? marketValPoints : undefined,
      sparklineTrend: unrealizedPct >= 0 ? 'up' : 'down',
    },
    {
      id: 'unrealized-gain',
      targetId: 'section-active-positions',
      title: 'Unrealized Gain',
      icon: TrendingUp,
      iconBgClass: orderStats.unrealized >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.unrealized, true),
      unit: '£',
      changeText: `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
      changeColorClass: orderStats.unrealized >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'open',
      sparklinePoints: unrealizedPoints && unrealizedPoints.length > 1 ? unrealizedPoints : undefined,
      sparklineTrend: orderStats.unrealized >= 0 ? 'up' : 'down',
    },
    {
      id: 'realized-gain',
      targetId: 'section-monthly-progression',
      title: 'Realized Gain',
      icon: CheckCircle2,
      iconBgClass: orderStats.realized >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(orderStats.realized, true),
      unit: '£',
      changeText: `${orderStats.closedWinning}W · ${orderStats.closedLosing}L`,
      changeColorClass: orderStats.realized >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'closed',
      sparklinePoints: realizedPoints && realizedPoints.length > 1 ? realizedPoints : undefined,
      sparklineTrend: orderStats.realized >= 0 ? 'up' : 'down',
    },
    {
      id: 'total-gain',
      targetId: 'section-monthly-progression',
      title: 'Total Gain',
      icon: Target,
      iconBgClass: totalGain >= 0 ? 'bg-accent-amber text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: formatNumber(totalGain, true),
      unit: '£',
      changeText: `${totalRoi >= 0 ? '+' : ''}${totalRoi.toFixed(1)}%`,
      changeColorClass: totalGain >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'ROI',
      sparklinePoints: roiPoints && roiPoints.length > 1 ? roiPoints : undefined,
      sparklineTrend: totalGain >= 0 ? 'up' : 'down',
    },
  ];

  return (
    <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          {...card}
          className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
        />
      ))}
    </div>
  );
}

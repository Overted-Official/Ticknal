'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { Trophy, Clock, BarChart3, AlertTriangle, Shield } from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from './KPICard';
import { type OrderStats } from '../../homeInvestmentsTypes';

interface TradingMetricsKPIRailProps {
  orderStats: OrderStats;
}

export default function TradingMetricsKPIRail({ orderStats }: TradingMetricsKPIRailProps) {
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

  const hasClosedTrades = orderStats.closedCount > 0;
  const winRate = orderStats.winRate;
  const displayWinRate = hasClosedTrades && winRate !== null ? `${winRate.toFixed(1)}` : '—';
  const winRateBadge =
    !hasClosedTrades || winRate === null
      ? 'No data'
      : winRate >= 60
      ? 'Optimal'
      : winRate >= 50
      ? 'Positive'
      : 'Active';

  const avgBars = orderStats.avgBarsPerTrade !== null ? Math.round(orderStats.avgBarsPerTrade) : null;
  const displayAvgBars = avgBars !== null ? `${avgBars}` : '—';
  const avgBarsBadge =
    avgBars !== null
      ? avgBars > 20
        ? 'Position'
        : avgBars > 5
        ? 'Swing'
        : 'Intraday'
      : 'No data';

  let avgGain: number | null = null;
  let avgGainMeta = 'Completed trades';
  if (orderStats.closedCount > 0) {
    avgGain = orderStats.realized / orderStats.closedCount;
    avgGainMeta = `${orderStats.closedCount} closed trades`;
  } else if (orderStats.openOrders.length > 0) {
    avgGain = orderStats.unrealized / orderStats.openOrders.length;
    avgGainMeta = `${orderStats.openOrders.length} active holdings`;
  }
  const displayAvgGain = avgGain !== null ? formatNumber(avgGain, true) : '—';
  const avgGainBadge =
    avgGain !== null
      ? avgGain > 0
        ? 'Profit'
        : avgGain < 0
        ? 'Loss'
        : 'Even'
      : 'No trades';

  const mae = orderStats.avgAdverseExcursion;
  const displayMae = mae !== null ? `-${Math.abs(mae).toFixed(1)}` : '—';
  const maeBadge =
    mae === null
      ? 'No data'
      : Math.abs(mae) < 2.5
      ? 'Low Risk'
      : 'Moderate';

  const mdd = orderStats.maxDrawdownPct;
  const displayMdd = mdd !== null ? `-${Math.abs(mdd).toFixed(1)}` : '—';
  const mddBadge =
    mdd === null
      ? 'No data'
      : Math.abs(mdd) <= 5
      ? 'Controlled'
      : 'Elevated';

  const cards: KPICardProps[] = [
    {
      id: 'win-rate',
      targetId: 'section-active-positions',
      title: 'Win Rate',
      icon: Trophy,
      iconBgClass: (winRate ?? 0) >= 50 ? 'bg-profit-num text-white' : 'bg-accent-amber text-white',
      iconColorClass: 'text-white',
      value: displayWinRate,
      unit: winRate !== null ? '%' : '',
      changeText: winRateBadge,
      changeColorClass: (winRate ?? 0) >= 50 ? 'text-profit-num' : 'text-accent-amber',
      metaText: hasClosedTrades ? `${orderStats.closedWinning}W · ${orderStats.closedLosing}L` : 'no closed trades',
      sparklineTrend: (winRate ?? 0) >= 50 ? 'up' : 'down',
    },
    {
      id: 'avg-bars',
      targetId: 'section-active-positions',
      title: 'Avg. Bars',
      shortTitle: 'Avg. Bars',
      icon: Clock,
      iconBgClass: 'bg-accent-cyan text-white',
      iconColorClass: 'text-white',
      value: displayAvgBars,
      unit: avgBars !== null ? 'BARS' : '',
      changeText: avgBarsBadge,
      changeColorClass: 'text-accent-cyan',
      metaText: 'hold time',
      sparklineTrend: 'neutral',
    },
    {
      id: 'avg-gain',
      targetId: 'section-active-positions',
      title: 'Avg. Gain',
      shortTitle: 'Avg. Gain',
      icon: BarChart3,
      iconBgClass: (avgGain ?? 0) >= 0 ? 'bg-profit-num text-white' : 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: isPrivacy && avgGain !== null ? '••••••' : displayAvgGain,
      unit: '£',
      changeText: avgGainBadge,
      changeColorClass: (avgGain ?? 0) >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'per trade',
      sparklineTrend: (avgGain ?? 0) >= 0 ? 'up' : 'down',
    },
    {
      id: 'max-adverse-excursion',
      targetId: 'section-active-positions',
      title: 'MAE Risk',
      shortTitle: 'MAE Risk',
      icon: AlertTriangle,
      iconBgClass: 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: displayMae,
      unit: '%',
      changeText: maeBadge,
      changeColorClass: 'text-loss-num',
      metaText: 'worst move',
      sparklineTrend: 'down',
    },
    {
      id: 'max-drawdown',
      targetId: 'section-monthly-progression',
      title: 'Max Drawdown',
      shortTitle: 'Max Drawdown',
      icon: Shield,
      iconBgClass: 'bg-loss-chart text-white',
      iconColorClass: 'text-white',
      value: displayMdd,
      unit: '%',
      changeText: mddBadge,
      changeColorClass: 'text-loss-num',
      metaText: 'peak→trough',
      sparklineTrend: 'down',
    },
  ];

  return (
    <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 md:grid md:grid-cols-3 lg:grid-cols-5 lg:gap-3 lg:overflow-visible lg:pb-0">
      {cards.map((card) => (
        <KPICard
          key={card.id}
          {...card}
          className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] md:w-full snap-start"
        />
      ))}
    </div>
  );
}

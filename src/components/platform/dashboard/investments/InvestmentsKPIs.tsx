'use client';

import React from 'react';
import { Wallet, TrendingUp, DollarSign, CheckCircle } from '@/components/ui/icon-library';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type OrderStats } from '../../DashboardInvestmentsView';

interface InvestmentsKPIsProps {
  orderStats: OrderStats;
  activeAlertCount: number;
}

export default function InvestmentsKPIs({
  orderStats,
  activeAlertCount,
}: InvestmentsKPIsProps) {
  const { isPrivacy } = usePrivacyMode();

  const formatMoney = (value: number, showSign: boolean = false): string => {
    if (isPrivacy) {
      if (value === 0) return '****** £';
      const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}****** £`;
    }
    if (value === 0) return '0.00 £';
    const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted} £`;
  };

  const unrealizedPct = orderStats.openMarketValue > 0
    ? ((orderStats.unrealized / (orderStats.openMarketValue - orderStats.unrealized || 1)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 select-none">
      {/* Card 1: Portfolio Value */}
      <RichSparklineCard
        title="Portfolio Value"
        value={formatMoney(orderStats.openMarketValue)}
        icon={Wallet}
        changeBadge={{
          text: `${orderStats.openOrders.length} Holdings`,
          isPositive: true,
        }}
        meta="Total active stock & fund holdings"
        sparklineTitle="30-Day Valuation Trend"
        sparklineData={[28, 29, 31, 30, 32, 33, 35, 34, 36, 38]}
        sparklineLabels={['30D Ago', '15D Ago', 'Present']}
        colorVariant="orange"
        isPrivacy={isPrivacy}
      />

      {/* Card 2: Unrealized P/L */}
      <RichSparklineCard
        title="Unrealized P/L"
        value={formatMoney(orderStats.unrealized, true)}
        icon={TrendingUp}
        changeBadge={{
          text: `${orderStats.unrealized >= 0 ? '+' : ''}${unrealizedPct}%`,
          isPositive: orderStats.unrealized >= 0,
        }}
        meta={`${orderStats.openWinning}W · ${orderStats.openLosing}L open trades`}
        sparklineTitle="Open Floating Return"
        sparklineData={[120, 180, 240, 310, 420, 390, 520, 640, 712, 780]}
        sparklineLabels={['Entry', 'Holding', 'Present']}
        colorVariant={orderStats.unrealized >= 0 ? 'profit' : 'risk'}
        isPrivacy={isPrivacy}
      />

      {/* Card 3: Realized P/L */}
      <RichSparklineCard
        title="Realized P/L"
        value={formatMoney(orderStats.realized, true)}
        icon={DollarSign}
        changeBadge={{
          text: `${orderStats.closedCount} Closed`,
          isPositive: orderStats.realized >= 0,
          isNeutral: orderStats.realized === 0,
        }}
        meta={`${orderStats.closedWinning}W · ${orderStats.closedLosing}L closed trades`}
        sparklineTitle="Cumulative Realized Return"
        sparklineData={[0, 45, 90, 140, 210, 280, 350, 410, 460, 510]}
        sparklineLabels={['Start', 'Mid', 'Present']}
        colorVariant={orderStats.realized >= 0 ? 'profit' : 'risk'}
        isPrivacy={isPrivacy}
      />

      {/* Card 4: Strategy Execution */}
      <RichSparklineCard
        title="System Win Rate"
        value={`${orderStats.winRate.toFixed(1)}%`}
        icon={CheckCircle}
        changeBadge={{
          text: `${activeAlertCount} Signals`,
          isPositive: true,
        }}
        meta={`Avg. ${Math.round(orderStats.avgBarsPerTrade || 14)} bars/trade`}
        sparklineTitle="Hit Rate Stability"
        sparklineData={[60, 62, 65, 68, 70, 72, 74, 75, 76, 78]}
        sparklineLabels={['Historical', 'Average', 'Live']}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

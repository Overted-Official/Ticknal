'use client';

import React from 'react';
import { Wallet, TrendingUp, DollarSign, CheckCircle } from '@/components/ui/icon-library';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface PositionsKPIsProps {
  totals: {
    portfolioValue: number;
    unrealized: number;
    realized: number;
    winRate: number;
    openCount: number;
    closedCount: number;
    winningCount: number;
    losingCount: number;
  };
}

export default function PositionsKPIs({ totals }: PositionsKPIsProps) {
  const { isPrivacy } = usePrivacyMode();

  const formatPrice = (p: number) =>
    `${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;

  const formatMoney = (val: number) => {
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    const abs = Math.abs(val);
    return `${sign}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`;
  };

  const unrealizedPct = totals.portfolioValue > 0
    ? ((totals.unrealized / (totals.portfolioValue - totals.unrealized || 1)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="kpi-grid-4 select-none">
      {/* 1. Portfolio Value */}
      <RichSparklineCard
        title="Portfolio Value"
        value={formatPrice(totals.portfolioValue)}
        icon={Wallet}
        changeBadge={{
          text: `${totals.openCount} Open`,
          isPositive: true,
        }}
        meta="Invested capital + floating P/L"
        sparklineTitle="Holding Value Trajectory"
        sparklineData={[10, 11, 12, 14, 15, 15, 16, 16, 17, 18]}
        sparklineLabels={['30D Ago', '15D Ago', 'Present']}
        colorVariant="orange"
        isPrivacy={isPrivacy}
      />

      {/* 2. Unrealized P/L */}
      <RichSparklineCard
        title="Unrealized P/L"
        value={formatMoney(totals.unrealized)}
        icon={TrendingUp}
        changeBadge={{
          text: `${totals.unrealized >= 0 ? '+' : ''}${unrealizedPct}%`,
          isPositive: totals.unrealized >= 0,
        }}
        meta={`${totals.openCount} open position${totals.openCount !== 1 ? 's' : ''}`}
        sparklineTitle="Open Floating Return"
        sparklineData={[0, 4, 2, 8, 12, 11, 15, 18, 20, 22]}
        sparklineLabels={['Entry', 'Holding', 'Present']}
        colorVariant={totals.unrealized >= 0 ? 'profit' : 'risk'}
        isPrivacy={isPrivacy}
      />

      {/* 3. Realized P/L */}
      <RichSparklineCard
        title="Realized P/L"
        value={formatMoney(totals.realized)}
        icon={DollarSign}
        changeBadge={{
          text: `${totals.closedCount} Closed`,
          isPositive: totals.realized >= 0,
          isNeutral: totals.realized === 0,
        }}
        meta={`${totals.winningCount}W · ${totals.losingCount}L closed trades`}
        sparklineTitle="Cumulative Realized Return"
        sparklineData={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45]}
        sparklineLabels={['Start', 'Mid', 'Present']}
        colorVariant={totals.realized >= 0 ? 'profit' : 'risk'}
        isPrivacy={isPrivacy}
      />

      {/* 4. Win Rate */}
      <RichSparklineCard
        title="Strategy Win Rate"
        value={`${totals.winRate.toFixed(1)}%`}
        icon={CheckCircle}
        changeBadge={{
          text: `${totals.winningCount}/${totals.closedCount} Won`,
          isPositive: totals.winRate >= 50,
          isNeutral: totals.closedCount === 0,
        }}
        meta={totals.closedCount > 0 ? 'Based on closed trades' : 'No closed trades yet'}
        sparklineTitle="Historical Hit Rate"
        sparklineData={[50, 55, 60, 65, 70, 75, 80, 85, 90, 95]}
        sparklineLabels={['Start', 'Mid', 'Present']}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

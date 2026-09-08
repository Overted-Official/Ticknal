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

  const unrealizedPct = orderStats.openCostBasis > 0
    ? ((orderStats.unrealized / orderStats.openCostBasis) * 100).toFixed(1)
    : '0.0';
  const history = orderStats.monthlyData ?? [];
  const historyLabels = history.length >= 2
    ? [history[0].month, history[Math.floor(history.length / 2)].month, history[history.length - 1].month]
    : [];
  const marketValueTrend = history.map((point) => point.marketValue ?? 0);
  const unrealizedTrend = history.map((point) => point.unrealizedPl ?? 0);
  const realizedTrend = history.map((point) => point.cumulativeRealizedPl ?? 0);
  const winRateTrend = history.map((point) => point.winRate);
  const closedTradeWinRate = orderStats.closedCount > 0 ? orderStats.winRate : null;
  const hasClosedTrades = closedTradeWinRate !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 select-none">
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
        sparklineTitle="Monthly mark-to-market value"
        sparklineData={marketValueTrend}
        sparklineLabels={historyLabels}
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
        sparklineTitle="Month-end unrealized P/L"
        sparklineData={unrealizedTrend}
        sparklineLabels={historyLabels}
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
        sparklineTitle="Cumulative realized P/L"
        sparklineData={realizedTrend}
        sparklineLabels={historyLabels}
        colorVariant={orderStats.realized >= 0 ? 'profit' : 'risk'}
        isPrivacy={isPrivacy}
      />

      {/* Card 4: Strategy Execution */}
      <RichSparklineCard
        title="System Win Rate"
        value={hasClosedTrades ? `${closedTradeWinRate.toFixed(1)}%` : '—'}
        icon={CheckCircle}
        changeBadge={{
          text: hasClosedTrades ? `${activeAlertCount} Signals` : 'No closed trades',
          isPositive: hasClosedTrades,
          isNeutral: !hasClosedTrades,
        }}
        meta={hasClosedTrades
          ? `Avg. ${orderStats.avgBarsPerTrade !== null ? Math.round(orderStats.avgBarsPerTrade) : '—'} bars/trade`
          : 'Closed-trade performance required'}
        sparklineTitle="Cumulative closed-trade win rate"
        sparklineData={winRateTrend}
        sparklineLabels={historyLabels}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

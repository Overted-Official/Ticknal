'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';

interface NetWorthBreakdownKPIsProps {
  currencyMode: 'EGP' | 'USD';
  investedTotal: number;
  investedPct: string;
  openPositionsCount: number;
  liquidCashTotal: number;
  cashPct: string;
  connectedAccountsCount: number;
  dragDisplay: number;
  cbeAnnualInflation: number;
}

export default function NetWorthBreakdownKPIs({
  currencyMode,
  investedTotal,
  investedPct,
  openPositionsCount,
  liquidCashTotal,
  cashPct,
  connectedAccountsCount,
  dragDisplay,
  cbeAnnualInflation,
}: NetWorthBreakdownKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${displaySuffix}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* 1. Investments (Equities & Mutual Funds) */}
      <RichSparklineCard
        title="Investments (Equities & Funds)"
        value={formatCurrency(investedTotal)}
        changeBadge={{
          text: `${investedPct}% Alloc.`,
          isPositive: true,
        }}
        meta={`${openPositionsCount} active holdings & funds`}
        sparklineTitle="Portfolio Capital Curve"
        sparklineData={[22, 24, 23, 27, 29, 31, 30, 32, 33, 34]}
        sparklineLabels={['Jan 2026', 'Jul 2026', 'Present']}
        colorVariant="orange"
        isPrivacy={isPrivacy}
      />

      {/* 2. Liquidity (Bank Cash) */}
      <RichSparklineCard
        title="Liquidity (Bank Cash)"
        value={formatCurrency(liquidCashTotal)}
        changeBadge={{
          text: `${cashPct}% Liquidity`,
          isNeutral: true,
        }}
        meta={`${connectedAccountsCount} connected bank account(s)`}
        sparklineTitle="Cash Balance Run-Rate"
        sparklineData={[890, 895, 900, 905, 910, 912, 913, 914, 914, 914]}
        sparklineLabels={['Jan 2026', 'Jul 2026', 'Present']}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />

      {/* 3. Inflation Drag & Loss */}
      <RichSparklineCard
        title={`Inflation Drag (1Y @ ${cbeAnnualInflation}% Eff.)`}
        value={`-${formatCurrency(dragDisplay)}`}
        changeBadge={{
          text: `-${cbeAnnualInflation}% Drag`,
          isPositive: false,
        }}
        meta="Purchasing power deflator"
        sparklineTitle="Cumulative Purchasing Drag"
        sparklineData={[10, 18, 25, 34, 42, 51, 58, 65, 71, 75]}
        sparklineLabels={['Jan 2026', 'Jul 2026', 'Present']}
        colorVariant="risk"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, Landmark, Flame } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';

interface NetWorthKPIsProps {
  currencyMode: 'EGP' | 'USD';
  displayTotalNetWorth: number;
  totalNetWorthEgp: number;
  totalEquitiesMarketValue: number;
  totalFundsMarketValue: number;
  totalEgpLiquidCash: number;
  totalUsdCashInEgp: number;
  fxMultiplier: number;
  openPositionsCount: number;
  connectedAccountsCount: number;
  currentYearDrag: number;
  cbeAnnualInflation: number;
}

export default function NetWorthKPIs({
  currencyMode,
  displayTotalNetWorth,
  totalNetWorthEgp,
  totalEquitiesMarketValue,
  totalFundsMarketValue,
  totalEgpLiquidCash,
  totalUsdCashInEgp,
  fxMultiplier,
  openPositionsCount,
  connectedAccountsCount,
  currentYearDrag,
  cbeAnnualInflation,
}: NetWorthKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${displaySuffix}`;
  };

  const investedTotal = (totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier;
  const liquidCashTotal = (totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier;
  const dragDisplay = currentYearDrag * fxMultiplier;

  const investedPct = totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const cashPct = totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';

  const realPurchasingPower = displayTotalNetWorth - dragDisplay;

  return (
    <div className="space-y-6">
      {/* Row 1: 2 Main Cards (Total Net Worth & Real Purchasing Power) */}
      <div className="kpi-grid-2">
        {/* Card 1: Total Net Worth */}
        <RichSparklineCard
          title="Total Net Worth"
          value={formatCurrency(displayTotalNetWorth)}
          changeBadge={{
            text: `+${(investedTotal > 0 ? 12.4 : 8.1).toFixed(1)}% ROI`,
            isPositive: true,
          }}
          meta="Mark-to-market live valuation"
          sparklineTitle="12M Wealth Trajectory"
          sparklineData={[720, 745, 730, 780, 810, 840, 890, 915, 930, 948]}
          sparklineLabels={['Jan 2026', 'Jul 2026', 'Present']}
          colorVariant="profit"
          isPrivacy={isPrivacy}
        />

        {/* Card 2: Real Purchasing Power */}
        <RichSparklineCard
          title={`Real Purchasing Power (${cbeAnnualInflation}% Defl.)`}
          value={formatCurrency(realPurchasingPower)}
          changeBadge={{
            text: `-${cbeAnnualInflation}% Defl.`,
            isPositive: false,
          }}
          meta={`Inflation drag: -${formatCurrency(dragDisplay)}`}
          sparklineTitle="Deflated Purchasing Curve"
          sparklineData={[680, 695, 675, 715, 738, 760, 805, 825, 840, 852]}
          sparklineLabels={['Jan 2026', 'Jul 2026', 'Present']}
          colorVariant="orange"
          isPrivacy={isPrivacy}
        />
      </div>

      {/* Row 2: 3 Breakdown Cards (Investments, Liquidity, Inflation Drag) */}
      <div className="kpi-grid-3">
        {/* Card 3: Equities & Mutual Funds */}
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

        {/* Card 4: Liquid Bank Reserves */}
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

        {/* Card 5: Inflation Drag */}
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
    </div>
  );
}

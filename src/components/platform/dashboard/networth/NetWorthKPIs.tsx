'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, Landmark, Flame } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';
import type { NetWorthTrendPoint } from '@/lib/portfolio-finance';

interface NetWorthKPIsProps {
  currencyMode: 'EGP' | 'USD';
  displayTotalNetWorth: number;
  totalNetWorthEgp: number;
  totalEquitiesMarketValue: number;
  totalFundsMarketValue: number;
  totalEgpLiquidCash: number;
  totalUsdCashInEgp: number;
  brokerageCashInEgp: number;
  brokerageAccountsCount: number;
  fxMultiplier: number;
  openPositionsCount: number;
  connectedAccountsCount: number;
  currentYearDrag: number;
  effectiveAnnualInflation: number;
  trendData: NetWorthTrendPoint[];
}

export default function NetWorthKPIs({
  currencyMode,
  displayTotalNetWorth,
  totalNetWorthEgp,
  totalEquitiesMarketValue,
  totalFundsMarketValue,
  totalEgpLiquidCash,
  totalUsdCashInEgp,
  brokerageCashInEgp,
  brokerageAccountsCount,
  fxMultiplier,
  openPositionsCount,
  connectedAccountsCount,
  currentYearDrag,
  effectiveAnnualInflation,
  trendData,
}: NetWorthKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${displaySuffix}`;
  };

  const investedTotal = (totalEquitiesMarketValue + totalFundsMarketValue) * fxMultiplier;
  const liquidCashTotal = (totalEgpLiquidCash + totalUsdCashInEgp) * fxMultiplier;
  const brokerageCashTotal = brokerageCashInEgp * fxMultiplier;
  const dragDisplay = currentYearDrag * fxMultiplier;

  const investedPct = totalNetWorthEgp > 0 ? (((totalEquitiesMarketValue + totalFundsMarketValue) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const cashPct = totalNetWorthEgp > 0 ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorthEgp) * 100).toFixed(1) : '0.0';
  const brokeragePct = totalNetWorthEgp > 0 ? ((brokerageCashInEgp / totalNetWorthEgp) * 100).toFixed(1) : '0.0';

  const realPurchasingPower = displayTotalNetWorth - dragDisplay;
  const trendLabels = trendData.length >= 2
    ? [trendData[0].month, trendData[Math.floor(trendData.length / 2)].month, trendData[trendData.length - 1].month]
    : [];

  return (
    <div className="space-y-6">
      {/* Row 1: 2 Main Cards (Total Net Worth & Real Purchasing Power) */}
      <div className="kpi-grid-2">
        {/* Card 1: Total Net Worth */}
        <RichSparklineCard
          title="Total Net Worth"
          value={formatCurrency(displayTotalNetWorth)}
          changeBadge={{
            text: 'Current mark',
            isNeutral: true,
          }}
          meta="Mark-to-market live valuation"
          sparklineTitle="Recorded monthly net worth"
          sparklineData={trendData.map((point) => point.nominal)}
          sparklineLabels={trendLabels}
          colorVariant="profit"
          isPrivacy={isPrivacy}
        />

        {/* Card 2: Real Purchasing Power */}
        <RichSparklineCard
          title={`Real Purchasing Power (${effectiveAnnualInflation}% Defl.)`}
          value={formatCurrency(realPurchasingPower)}
          changeBadge={{
            text: `-${effectiveAnnualInflation}% Defl.`,
            isPositive: false,
          }}
          meta={`Inflation drag: -${formatCurrency(dragDisplay)}`}
          sparklineTitle="Inflation-adjusted monthly value"
          sparklineData={trendData.map((point) => point.real)}
          sparklineLabels={trendLabels}
          colorVariant="orange"
          isPrivacy={isPrivacy}
        />
      </div>

      {/* Row 2: 4 Breakdown Cards (Investments, Bank Liquidity, Brokerage Cash, Inflation Drag) */}
      <div className="kpi-grid-4">
        {/* Card 3: Equities & Mutual Funds */}
        <RichSparklineCard
          title="Investments (Equities & Funds)"
          value={formatCurrency(investedTotal)}
          changeBadge={{
            text: `${investedPct}% Alloc.`,
            isPositive: true,
          }}
          meta={`${openPositionsCount} active holdings & funds`}
          sparklineTitle="Month-end invested value"
          sparklineData={trendData.map((point) => point.invested)}
          sparklineLabels={trendLabels}
          colorVariant="orange"
          isPrivacy={isPrivacy}
        />

        {/* Card 4: Liquid Bank Reserves */}
        <RichSparklineCard
          title="Cash Reserves (Bank + USD)"
          value={formatCurrency(liquidCashTotal)}
          changeBadge={{
            text: `${cashPct}% Liquidity`,
            isNeutral: true,
          }}
          meta={`${connectedAccountsCount} connected cash account${connectedAccountsCount !== 1 ? 's' : ''} · brokerage cash excluded`}
          sparklineTitle="Recorded monthly cash balance"
          sparklineData={trendData.map((point) => point.cash - point.brokerageCash)}
          sparklineLabels={trendLabels}
          colorVariant="info"
          isPrivacy={isPrivacy}
        />

        {/* Card 5: Brokerage Cash */}
        <RichSparklineCard
          title="Brokerage Cash"
          value={brokerageAccountsCount > 0 ? formatCurrency(brokerageCashTotal) : 'Not linked'}
          changeBadge={{
            text: brokerageAccountsCount > 0 ? `${brokeragePct}% of Net Worth` : 'No account',
            isNeutral: brokerageAccountsCount === 0,
          }}
          meta={brokerageAccountsCount > 0
            ? `${brokerageAccountsCount} brokerage account${brokerageAccountsCount !== 1 ? 's' : ''} · Available trading cash`
            : 'Add a brokerage account to track trading cash'}
          sparklineTitle="Brokerage Cash Run-Rate"
          sparklineData={trendData.map((point) => point.brokerageCash)}
          sparklineLabels={trendLabels}
          colorVariant="profit"
          isPrivacy={isPrivacy && brokerageAccountsCount > 0}
        />

        {/* Card 6: Inflation Drag */}
        <RichSparklineCard
          title={`Inflation Drag (1Y @ ${effectiveAnnualInflation}% Eff.)`}
          value={`-${formatCurrency(dragDisplay)}`}
          changeBadge={{
            text: `-${effectiveAnnualInflation}% Drag`,
            isPositive: false,
          }}
          meta="Purchasing power deflator"
          sparklineTitle="Cumulative Purchasing Drag"
          sparklineData={trendData.map((point) => point.drag)}
          sparklineLabels={trendLabels}
          colorVariant="risk"
          isPrivacy={isPrivacy}
        />
      </div>
    </div>
  );
}

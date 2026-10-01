'use client';

import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Landmark,
  Wallet,
  Coins,
  Flame,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankAccount } from '@/types/bank';
import { isBrokerageAccount, toEgp, type NetWorthHistoryPoint } from '@/lib/portfolio-finance';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { type OrderStats } from '../../homeInvestmentsTypes';
import KPICard from './KPICard';

interface NetWorthKPIRailProps {
  orderStats: OrderStats;
  accounts?: BankAccount[];
  usdRate?: number;
  cbeInflationRate?: number;
  netWorthHistory?: NetWorthHistoryPoint[];
}

export default function NetWorthKPIRail({
  orderStats,
  accounts = [],
  usdRate = 50.20,
  cbeInflationRate = 14.9,
  netWorthHistory = [],
}: NetWorthKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();

  // Split cash and brokerage accounts (excluding virtual paper trading accounts)
  const realAccounts = accounts.filter((a) => !isVirtualAccount(a));
  const brokerageAccounts = realAccounts.filter(isBrokerageAccount);
  const cashAccounts = realAccounts.filter((account) => !isBrokerageAccount(account));

  // Liquid cash in commercial bank accounts (EGP + USD)
  const totalEgpLiquidCash = cashAccounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const totalUsdLiquidCashRaw = cashAccounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const totalUsdCashInEgp = toEgp(totalUsdLiquidCashRaw, 'USD', usdRate);

  // Brokerage cash reserves (dry powder)
  const totalBrokerageCashInEgp = brokerageAccounts.reduce(
    (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
    0
  );

  // For this dashboard KPI, invested capital is the current mark-to-market
  // value of open holdings. Cost basis remains available in orderStats for
  // return calculations, but it should not be the displayed balance here.
  const totalInvested = orderStats.openMarketValue || 0;

  // Cumulative Net Worth
  const totalNetWorth =
    totalEgpLiquidCash + totalUsdCashInEgp + totalBrokerageCashInEgp + totalInvested;

  // Inflation adjustments
  const effectiveInflation = cbeInflationRate > 0 ? cbeInflationRate : 14.9;
  const inflationLoss = totalNetWorth * (effectiveInflation / 100);
  const realPurchasingPower = Math.max(0, totalNetWorth - inflationLoss);

  const currentYear = new Date().getUTCFullYear().toString();
  const ytdHistory = netWorthHistory.filter((point) => point.yearMonth.startsWith(currentYear));
  const totalNetWorthPoints = ytdHistory.map((point) => point.nominalEgp);
  const investedCapitalPoints = ytdHistory.map((point) => point.investedEgp);
  const liquidBankCashPoints = ytdHistory.map((point) => point.cashEgp - point.brokerageCashEgp);
  const brokerageCashPoints = ytdHistory.map((point) => point.brokerageCashEgp);
  const realPurchasingPowerPoints = totalNetWorthPoints.map((value) => value * (1 - effectiveInflation / 100));
  const inflationLossPoints = totalNetWorthPoints.map((value) => value * (effectiveInflation / 100));

  const trendFor = (points: number[]): 'up' | 'down' | 'neutral' => {
    if (points.length < 2) return 'neutral';
    const delta = points[points.length - 1] - points[0];
    return Math.abs(delta) < 0.01 ? 'neutral' : delta > 0 ? 'up' : 'down';
  };

  const formatMoney = (value: number): string => {
    if (isPrivacy) return '•••••• £';
    if (value === 0) return '0.0 £';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${formatted} £`;
  };

  const cards = [
    {
      id: 'total-net-worth',
      title: 'Total Net Worth',
      shortTitle: 'Net Worth',
      icon: ShieldCheck,
      iconBgClass: 'bg-brand-blue text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalNetWorth),
      metaText: 'Consolidated balance',
      sparklinePoints: totalNetWorthPoints.length > 1 ? totalNetWorthPoints : undefined,
      sparklineTrend: trendFor(totalNetWorthPoints),
      targetId: 'section-my-positions',
    },
    {
      id: 'invested-capital',
      title: 'Invested Capital',
      shortTitle: 'Invested',
      icon: TrendingUp,
      iconBgClass: 'bg-brand-blue text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalInvested),
      metaText: `${orderStats.openOrders.length} active holding${orderStats.openOrders.length !== 1 ? 's' : ''}`,
      sparklinePoints: investedCapitalPoints.length > 1 ? investedCapitalPoints : undefined,
      sparklineTrend: trendFor(investedCapitalPoints),
      targetId: 'section-my-positions',
    },
    {
      id: 'liquid-bank-cash',
      title: 'Liquid Bank Cash',
      shortTitle: 'Bank Cash',
      icon: Landmark,
      iconBgClass: 'bg-profit-num text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalEgpLiquidCash + totalUsdCashInEgp),
      metaText: `${cashAccounts.length} bank account${cashAccounts.length !== 1 ? 's' : ''}`,
      sparklinePoints: liquidBankCashPoints.length > 1 ? liquidBankCashPoints : undefined,
      sparklineTrend: trendFor(liquidBankCashPoints),
      targetId: 'section-my-positions',
    },
    {
      id: 'brokerage-dry-powder',
      title: 'Brokerage Dry Powder',
      shortTitle: 'Brokerage',
      icon: Wallet,
      iconBgClass: 'bg-accent-cyan text-white',
      value: isPrivacy
        ? '••••••••'
        : brokerageAccounts.length > 0
        ? formatMoney(totalBrokerageCashInEgp)
        : '0.0 £',
      metaText: brokerageAccounts.length > 0 ? 'Ready to deploy' : 'No brokerage',
      sparklinePoints: brokerageCashPoints.length > 1 ? brokerageCashPoints : undefined,
      sparklineTrend: trendFor(brokerageCashPoints),
      targetId: 'section-my-positions',
    },
    {
      id: 'real-purchasing-power',
      title: 'Real Purchasing Power',
      shortTitle: 'Real Value',
      icon: Coins,
      iconBgClass: 'bg-accent-amber text-white',
      value: isPrivacy ? '••••••••' : formatMoney(realPurchasingPower),
      metaText: 'Inflation-adjusted',
      sparklinePoints: realPurchasingPowerPoints.length > 1 ? realPurchasingPowerPoints : undefined,
      sparklineTrend: trendFor(realPurchasingPowerPoints),
      targetId: 'section-my-positions',
    },
    {
      id: 'inflation-drag-loss',
      title: 'Inflation Loss (Drag)',
      shortTitle: 'Inflation Drag',
      icon: Flame,
      iconBgClass: 'bg-loss-chart text-white',
      value: isPrivacy ? '••••••••' : `-${formatMoney(inflationLoss)}`,
      metaText: 'Annual purchasing loss',
      sparklinePoints: inflationLossPoints.length > 1 ? inflationLossPoints : undefined,
      sparklineTrend: trendFor(inflationLossPoints),
      targetId: 'section-my-positions',
    },
  ];

  const rail1Cards = cards.slice(0, 3);
  const rail2Cards = cards.slice(3, 6);

  return (
    <div className="w-full space-y-2 sm:space-y-3">
      {/* Rail 1: Core Capital Distribution (3 Cards) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:pb-0">
        {rail1Cards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>

      {/* Rail 2: Dry Powder, Real Value & Inflation Drag (3 Cards) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible lg:pb-0">
        {rail2Cards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start"
          />
        ))}
      </div>
    </div>
  );
}

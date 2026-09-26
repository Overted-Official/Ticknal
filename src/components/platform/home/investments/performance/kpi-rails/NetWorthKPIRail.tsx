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
import { isBrokerageAccount, toEgp } from '@/lib/portfolio-finance';
import { type OrderStats } from '../../homeInvestmentsTypes';
import KPICard from './KPICard';

interface NetWorthKPIRailProps {
  orderStats: OrderStats;
  accounts?: BankAccount[];
  usdRate?: number;
  cbeInflationRate?: number;
}

export default function NetWorthKPIRail({
  orderStats,
  accounts = [],
  usdRate = 50.20,
  cbeInflationRate = 14.9,
}: NetWorthKPIRailProps) {
  const { isPrivacy } = usePrivacyMode();

  // Split cash and brokerage accounts
  const brokerageAccounts = accounts.filter(isBrokerageAccount);
  const cashAccounts = accounts.filter((account) => !isBrokerageAccount(account));

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

  // Total invested in stocks and mutual funds
  const totalInvested = orderStats.openMarketValue || 0;

  // Cumulative Net Worth
  const totalNetWorth =
    totalEgpLiquidCash + totalUsdCashInEgp + totalBrokerageCashInEgp + totalInvested;

  // Inflation adjustments
  const effectiveInflation = cbeInflationRate > 0 ? cbeInflationRate : 14.9;
  const inflationLoss = totalNetWorth * (effectiveInflation / 100);
  const realPurchasingPower = Math.max(0, totalNetWorth - inflationLoss);

  // Percentages
  const investedPct =
    totalNetWorth > 0 ? ((totalInvested / totalNetWorth) * 100).toFixed(1) : '0.0';
  const liquidCashPct =
    totalNetWorth > 0
      ? (((totalEgpLiquidCash + totalUsdCashInEgp) / totalNetWorth) * 100).toFixed(1)
      : '0.0';
  const brokerageCashPct =
    totalNetWorth > 0
      ? ((totalBrokerageCashInEgp / totalNetWorth) * 100).toFixed(1)
      : '0.0';

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
      badgeText: 'Live Mark',
      badgeClass: 'text-emerald-400 font-medium text-[9px]',
      metaText: 'Consolidated balance',
      targetId: 'section-my-positions',
    },
    {
      id: 'invested-capital',
      title: 'Invested Capital',
      shortTitle: 'Invested',
      icon: TrendingUp,
      iconBgClass: 'bg-brand-blue text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalInvested),
      badgeText: `${investedPct}% Alloc.`,
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      metaText: `${orderStats.openOrders.length} active holding${orderStats.openOrders.length !== 1 ? 's' : ''}`,
      targetId: 'section-my-positions',
    },
    {
      id: 'liquid-bank-cash',
      title: 'Liquid Bank Cash',
      shortTitle: 'Bank Cash',
      icon: Landmark,
      iconBgClass: 'bg-profit-num text-white',
      value: isPrivacy ? '••••••••' : formatMoney(totalEgpLiquidCash + totalUsdCashInEgp),
      badgeText: `${liquidCashPct}% Liquidity`,
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      metaText: `${cashAccounts.length} bank account${cashAccounts.length !== 1 ? 's' : ''}`,
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
      badgeText: brokerageAccounts.length > 0 ? `${brokerageCashPct}% Share` : 'None',
      badgeClass: 'text-zinc-400 font-medium text-[9px]',
      metaText: brokerageAccounts.length > 0 ? 'Ready to deploy' : 'No brokerage',
      targetId: 'section-my-positions',
    },
    {
      id: 'real-purchasing-power',
      title: 'Real Purchasing Power',
      shortTitle: 'Real Value',
      icon: Coins,
      iconBgClass: 'bg-accent-amber text-white',
      value: isPrivacy ? '••••••••' : formatMoney(realPurchasingPower),
      badgeText: 'Deflated Mark',
      badgeClass: 'text-amber-400 font-medium text-[9px]',
      metaText: 'Inflation-adjusted',
      targetId: 'section-my-positions',
    },
    {
      id: 'inflation-drag-loss',
      title: 'Inflation Loss (Drag)',
      shortTitle: 'Inflation Drag',
      icon: Flame,
      iconBgClass: 'bg-loss-chart text-white',
      value: isPrivacy ? '••••••••' : `-${formatMoney(inflationLoss)}`,
      badgeText: `-${effectiveInflation.toFixed(1)}% CBE`,
      badgeClass: 'text-rose-400 font-medium text-[9px]',
      metaText: 'Annual purchasing loss',
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

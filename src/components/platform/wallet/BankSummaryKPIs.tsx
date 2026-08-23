'use client';

import React from 'react';
import { type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';
import { Landmark, DollarSign, Wallet } from '@/components/ui/icon-library';

interface BankSummaryKPIsProps {
  accounts: BankAccount[];
  usdRate: number;
}

export default function BankSummaryKPIs({ accounts, usdRate }: BankSummaryKPIsProps) {
  const { isPrivacy } = usePrivacyMode();

  const totalEgpLiquid = accounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquid = accounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalCombinedEgp = totalEgpLiquid + totalUsdLiquid * usdRate;
  const egpCount = accounts.filter((a) => a.currency === 'EGP').length;
  const usdCount = accounts.filter((a) => a.currency === 'USD').length;

  const egpPct = totalCombinedEgp > 0 ? ((totalEgpLiquid / totalCombinedEgp) * 100).toFixed(0) : '0';
  const usdPct = totalCombinedEgp > 0 ? (((totalUsdLiquid * usdRate) / totalCombinedEgp) * 100).toFixed(0) : '0';

  return (
    <div className="kpi-grid-3 select-none">
      {/* 1. Combined Liquid Cash */}
      <RichSparklineCard
        title="Combined Liquid Cash"
        value={`${totalCombinedEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`}
        icon={Wallet}
        changeBadge={{
          text: `${accounts.length} Accounts`,
          isPositive: true,
        }}
        meta="Ready uninvested buying power & savings"
        sparklineTitle="30-Day Liquidity Buffer"
        sparklineData={[880, 890, 895, 902, 910, 912, 914, 914, 914, 914]}
        sparklineLabels={['30D Ago', '15D Ago', 'Present']}
        colorVariant="profit"
        isPrivacy={isPrivacy}
      />

      {/* 2. Total Liquid EGP */}
      <RichSparklineCard
        title="Total Liquid EGP"
        value={`${totalEgpLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`}
        icon={Landmark}
        changeBadge={{
          text: `${egpPct}% of Cash`,
          isNeutral: true,
        }}
        meta={`Across ${egpCount} Egyptian pound account${egpCount !== 1 ? 's' : ''}`}
        sparklineTitle="EGP Cash Run-Rate"
        sparklineData={[380, 385, 390, 392, 394, 395, 396, 396, 396, 396]}
        sparklineLabels={['30D Ago', '15D Ago', 'Present']}
        colorVariant="orange"
        isPrivacy={isPrivacy}
      />

      {/* 3. Foreign Reserves (USD) */}
      <RichSparklineCard
        title="Foreign Reserves (USD)"
        value={`$${totalUsdLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        changeBadge={{
          text: `${usdPct}% FX Hedge`,
          isPositive: true,
        }}
        meta={`≈ ${(totalUsdLiquid * usdRate).toLocaleString('en-US', { maximumFractionDigits: 0 })} £ (@${usdRate.toFixed(2)})`}
        sparklineTitle="USD Reserve Valuation"
        sparklineData={[500, 505, 510, 512, 514, 516, 517, 517, 517, 517]}
        sparklineLabels={['30D Ago', '15D Ago', 'Present']}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

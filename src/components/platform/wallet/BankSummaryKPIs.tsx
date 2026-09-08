'use client';

import React from 'react';
import { type BankAccount } from '@/types/bank';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import RichSparklineCard from '@/components/platform/ui/RichSparklineCard';
import { Landmark, DollarSign, Wallet, TrendingUp } from '@/components/ui/icon-library';
import { type CashTrendPoint, isBrokerageAccount, toEgp } from '@/lib/portfolio-finance';

interface BankSummaryKPIsProps {
  accounts: BankAccount[];
  usdRate: number;
  cashTrend?: CashTrendPoint[];
}

export default function BankSummaryKPIs({ accounts, usdRate, cashTrend = [] }: BankSummaryKPIsProps) {
  const { isPrivacy } = usePrivacyMode();
  const cashAccounts = accounts.filter((account) => !isBrokerageAccount(account));
  const brokerageAccounts = accounts.filter(isBrokerageAccount);

  const totalEgpLiquid = cashAccounts
    .filter((a) => a.currency === 'EGP')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalUsdLiquid = cashAccounts
    .filter((a) => a.currency === 'USD')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalBrokerageCashEgp = brokerageAccounts.reduce(
    (sum, a) => sum + toEgp(Number(a.balance) || 0, a.currency, usdRate),
    0,
  );
  const totalCombinedEgp = accounts.reduce(
    (sum, account) => sum + toEgp(Number(account.balance) || 0, account.currency, usdRate),
    0,
  );
  const egpCount = cashAccounts.filter((a) => a.currency === 'EGP').length;
  const usdCount = cashAccounts.filter((a) => a.currency === 'USD').length;
  const brokerageCount = brokerageAccounts.length;

  const egpPct = totalCombinedEgp > 0 ? ((totalEgpLiquid / totalCombinedEgp) * 100).toFixed(0) : '0';
  const usdPct = totalCombinedEgp > 0 ? (((totalUsdLiquid * usdRate) / totalCombinedEgp) * 100).toFixed(0) : '0';
  const brokeragePct = totalCombinedEgp > 0 ? ((totalBrokerageCashEgp / totalCombinedEgp) * 100).toFixed(0) : '0';

  return (
    <div className="kpi-grid-4 select-none">
      {/* 1. Combined Liquid Cash */}
      <RichSparklineCard
        title="Total Cash Across Accounts"
        value={`${totalCombinedEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`}
        icon={Wallet}
        changeBadge={{
          text: `${accounts.length} Accounts`,
          isPositive: true,
        }}
        meta="Bank + brokerage balances; not invested holdings"
        sparklineTitle="Recorded monthly cash balance"
        sparklineData={cashTrend.map((point) => point.totalEgp)}
        sparklineLabels={cashTrend.length ? [cashTrend[0].month, cashTrend[Math.floor(cashTrend.length / 2)].month, cashTrend[cashTrend.length - 1].month] : []}
        colorVariant="profit"
        isPrivacy={isPrivacy}
      />

      {/* 2. Total Liquid EGP */}
      <RichSparklineCard
        title="Bank Cash (EGP)"
        value={`${totalEgpLiquid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`}
        icon={Landmark}
        changeBadge={{
          text: `${egpPct}% of Cash`,
          isNeutral: true,
        }}
        meta={`Across ${egpCount} Egyptian pound account${egpCount !== 1 ? 's' : ''}`}
        sparklineTitle="EGP Cash Run-Rate"
        sparklineData={cashTrend.map((point) => point.egpCash)}
        sparklineLabels={cashTrend.length ? [cashTrend[0].month, cashTrend[Math.floor(cashTrend.length / 2)].month, cashTrend[cashTrend.length - 1].month] : []}
        colorVariant="orange"
        isPrivacy={isPrivacy}
      />

      {/* 3. Brokerage Cash */}
      <RichSparklineCard
        title="Brokerage Cash"
        value={brokerageCount > 0
          ? `${totalBrokerageCashEgp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} £`
          : 'Not linked'}
        icon={TrendingUp}
        changeBadge={{
          text: brokerageCount > 0 ? `${brokeragePct}% of Cash` : 'No account',
          isNeutral: brokerageCount === 0,
        }}
        meta={brokerageCount > 0
          ? `${brokerageCount} brokerage account${brokerageCount !== 1 ? 's' : ''} · Available trading cash`
          : 'Add a brokerage account to track trading cash'}
        sparklineTitle="Brokerage Cash Run-Rate"
        sparklineData={cashTrend.map((point) => point.brokerageCashEgp)}
        sparklineLabels={cashTrend.length ? [cashTrend[0].month, cashTrend[Math.floor(cashTrend.length / 2)].month, cashTrend[cashTrend.length - 1].month] : []}
        colorVariant="profit"
        isPrivacy={isPrivacy && brokerageCount > 0}
      />

      {/* 4. Foreign Reserves (USD) */}
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
        sparklineData={cashTrend.map((point) => point.usdCash)}
        sparklineLabels={cashTrend.length ? [cashTrend[0].month, cashTrend[Math.floor(cashTrend.length / 2)].month, cashTrend[cashTrend.length - 1].month] : []}
        colorVariant="info"
        isPrivacy={isPrivacy}
      />
    </div>
  );
}

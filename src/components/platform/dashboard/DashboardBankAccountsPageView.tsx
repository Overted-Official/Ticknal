'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import BanksHeader from './banks/BanksHeader';
import BankSummaryKPIs from '@/components/platform/wallet/BankSummaryKPIs';
import BankAccountsScreenerWidget from './banks/BankAccountsScreenerWidget';
import CashFlowSpendingAnalyticsWidget from './banks/CashFlowSpendingAnalyticsWidget';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { buildCashTrend, toEgp } from '@/lib/portfolio-finance';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardBankAccountsPageViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
}

export default function DashboardBankAccountsPageView({
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
}: DashboardBankAccountsPageViewProps) {
  const router = useRouter();

  const { data: accountsData } = useSWR<{ accounts: BankAccount[] }>(
    '/api/banks/accounts',
    fetcher,
    { fallbackData: { accounts: initialAccounts }, refreshInterval: 15000 }
  );

  const { data: txData } = useSWR<{ transactions: BankTransaction[] }>(
    '/api/banks/transactions',
    fetcher,
    { fallbackData: { transactions: initialTransactions }, refreshInterval: 15000 }
  );

  const accounts = accountsData?.accounts ?? initialAccounts;
  const transactions = txData?.transactions ?? initialTransactions;

  const cashTrend = useMemo(
    () => buildCashTrend(accounts, transactions, usdRate),
    [accounts, transactions, usdRate],
  );

  const totalCombinedEgp = useMemo(() => {
    return accounts.reduce(
      (sum, account) => sum + toEgp(Number(account.balance) || 0, account.currency, usdRate),
      0,
    );
  }, [accounts, usdRate]);



  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'banks',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="command-surface-page flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-plt-base text-plt-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="banks"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Banks', value: 'banks', icon: Landmark },
        ]}
      />

      {/* 2. Main Page Scroll Canvas */}
      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y">
        <div className="app-page page-sections-stack pb-28 md:pb-20">
          {/* Header */}
          <BanksHeader />

          {/* SECTION 1: Liquidity Overview */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Liquidity Overview</h2>
              <p className="section-subtitle">Aggregated liquid cash balances, currency allocation, and FX reserve hedging</p>
            </div>

            <BankSummaryKPIs accounts={accounts} usdRate={usdRate} cashTrend={cashTrend} />

            <BankAccountsScreenerWidget
              accounts={accounts}
              transactions={transactions}
              usdRate={usdRate}
            />
          </section>

          {/* SECTION 2: Cash Flow & Spending Distribution */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Cash Flow &amp; Spending Distribution</h2>
              <p className="section-subtitle">Interactive cash movement dynamics, net accumulation, and categorized outflow breakdown</p>
            </div>

            <CashFlowSpendingAnalyticsWidget
              transactions={transactions}
              usdRate={usdRate}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

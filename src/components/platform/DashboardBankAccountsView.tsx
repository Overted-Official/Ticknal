'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ShieldCheck, TrendingUp, Landmark } from '@/components/ui/icon-library';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';
import BanksHeader from './dashboard/banks/BanksHeader';
import BankSummaryKPIs from '@/components/platform/wallet/BankSummaryKPIs';
import CashFlowBarChart from './dashboard/banks/CashFlowBarChart';
import SpendingDonutChart from './dashboard/banks/SpendingDonutChart';
import BankAllocationMatrix from './dashboard/banks/BankAllocationMatrix';
import { type BankAccount, type BankTransaction } from '@/types/bank';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardBankAccountsViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
}

export default function DashboardBankAccountsView({
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
}: DashboardBankAccountsViewProps) {
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

  const totalCombinedEgp = useMemo(() => {
    const egp = accounts.filter((a) => a.currency === 'EGP').reduce((sum, a) => sum + Number(a.balance), 0);
    const usd = accounts.filter((a) => a.currency === 'USD').reduce((sum, a) => sum + Number(a.balance), 0);
    return egp + usd * usdRate;
  }, [accounts, usdRate]);

  // Monthly Cash Flow Aggregation (Inflows vs Outflows)
  const monthlyFlowData = useMemo(() => {
    type MonthFlow = { month: string; rawDate: string; inflows: number; outflows: number; net: number };
    const map = new Map<string, MonthFlow>();

    for (const tx of transactions) {
      const ym = tx.transactionDate.slice(0, 7); // YYYY-MM
      const [year, month] = ym.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${monthNames[Number(month) - 1]} '${year.slice(2)}`;

      if (!map.has(ym)) {
        map.set(ym, { month: label, rawDate: ym, inflows: 0, outflows: 0, net: 0 });
      }

      const entry = map.get(ym)!;
      const amt = Number(tx.amount);
      const isUsd = tx.currency === 'USD';
      const egpVal = isUsd ? amt * usdRate : amt;

      if (tx.type === 'INCOME' || tx.type === 'DEPOSIT' || tx.type === 'BROKER_WITHDRAWAL') {
        entry.inflows += egpVal;
      } else if (tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL' || tx.type === 'BROKER_INJECTION') {
        entry.outflows += egpVal;
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        ...v,
        net: v.inflows - v.outflows,
      }));
  }, [transactions, usdRate]);

  // Spending Splits by Category
  const categorySplits = useMemo(() => {
    const map = new Map<string, number>();
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL' || tx.type === 'BROKER_INJECTION') {
        const amt = Number(tx.amount);
        const egpVal = tx.currency === 'USD' ? amt * usdRate : amt;
        const cat = tx.category || 'Other';
        map.set(cat, (map.get(cat) ?? 0) + egpVal);
        totalExpense += egpVal;
      }
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, usdRate]);

  // Bank-by-Bank Liquidity Distribution
  const bankDistribution = useMemo(() => {
    return accounts.map((acc) => {
      const bal = Number(acc.balance);
      const egpVal = acc.currency === 'USD' ? bal * usdRate : bal;
      return {
        id: acc.id,
        name: acc.accountName,
        bankName: acc.bankName || acc.customBankName || 'Bank',
        currency: acc.currency,
        rawBalance: bal,
        egpVal,
        percentage: totalCombinedEgp > 0 ? (egpVal / totalCombinedEgp) * 100 : 0,
        logoUrl: acc.bankLogoUrl,
      };
    }).sort((a, b) => b.egpVal - a.egpVal);
  }, [accounts, usdRate, totalCombinedEgp]);

  const { swipeHandlers } = useSwipeableTabs({
    tabs: DASHBOARD_TABS,
    activeTab: 'banks',
    onTabChange: (val) => router.push(`/dashboard?tab=${val}`),
  });

  return (
    <div className="flex-1 h-full w-full flex flex-col min-h-0 overflow-hidden bg-tv-base text-tv-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="banks"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
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

            <BankSummaryKPIs accounts={accounts} usdRate={usdRate} />

            <BankAllocationMatrix distribution={bankDistribution} />
          </section>

          {/* SECTION 2: Cash Flow & Spending Distribution */}
          <section className="section-container section-viewport-fit">
            <div className="flex flex-col gap-0.5">
              <h2 className="section-title">Cash Flow & Spending Distribution</h2>
              <p className="section-subtitle">Monthly inflows versus outflows trajectory and category expense allocation</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-stretch flex-1 min-h-0 w-full">
              <div className="lg:col-span-2 w-full">
                <CashFlowBarChart
                  data={monthlyFlowData}
                  transactions={transactions}
                  usdRate={usdRate}
                />
              </div>
              <div className="lg:col-span-1 w-full">
                <SpendingDonutChart
                  splits={categorySplits}
                  transactions={transactions}
                  usdRate={usdRate}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

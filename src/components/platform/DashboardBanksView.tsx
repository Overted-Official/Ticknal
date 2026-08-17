'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Landmark, TrendingUp, ShieldCheck, Wallet } from 'lucide-react';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import { useSwipeableTabs } from '@/hooks/useSwipeableTabs';

const DASHBOARD_TABS = ['net-worth', 'investments', 'banks'] as const;
import BankSummaryKPIs from '@/components/platform/wallet/BankSummaryKPIs';
import CashFlowBarChart from './dashboard/banks/CashFlowBarChart';
import SpendingDonutChart from './dashboard/banks/SpendingDonutChart';
import BankAllocationMatrix from './dashboard/banks/BankAllocationMatrix';
import { type BankAccount, type BankTransaction } from '@/types/bank';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardBanksViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
}

export default function DashboardBanksView({
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
}: DashboardBanksViewProps) {
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
      {/* 1. Mobile / Desktop Top Rail */}
      <SubNavTopRail
        activeTab="banks"
        onChange={(val) => router.push(`/dashboard?tab=${val}`)}
        items={[
          { label: 'Net Worth & Inflation', value: 'net-worth', icon: ShieldCheck },
          { label: 'Investments', value: 'investments', icon: TrendingUp },
          { label: 'Bank Accounts', value: 'banks', icon: Landmark },
        ]}
      />

      <div {...swipeHandlers} className="flex-1 h-full w-full min-h-0 overflow-y-auto p-4 md:p-6 max-w-[1600px] mx-auto space-y-2 pb-20 touch-pan-y">
        {/* 2. Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-plt-orange" />
              <h1 className="text-lg font-medium tracking-[-0.02em] text-white">
                Bank Accounts & Liquidity
              </h1>
            </div>
            <p className="mt-0.5 text-[13px] text-white/30 truncate">
              Multi-currency cash flows & bank liquidity
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <PrivacyToggleButton />
            <button
              type="button"
              onClick={() => router.push('/wallet?tab=banks')}
              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-all flex items-center gap-1.5"
            >
              Manage Accounts in Wallet &rarr;
            </button>
          </div>
        </div>

        {/* 3. Top Summary Stats */}
        <BankSummaryKPIs accounts={accounts} usdRate={usdRate} />

        {/* 4. Cash Flow & Expense Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <CashFlowBarChart data={monthlyFlowData} />
          <SpendingDonutChart splits={categorySplits} />
        </div>

        {/* 5. Bank Allocation Matrix */}
        <BankAllocationMatrix distribution={bankDistribution} />
      </div>
    </div>
  );
}

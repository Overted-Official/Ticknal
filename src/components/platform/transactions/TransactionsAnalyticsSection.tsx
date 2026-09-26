'use client';

import React from 'react';
import CashFlowProgressionChart, { type CashFlowTimeframe } from '@/components/platform/home/investments/performance/charts/CashFlowProgressionChart';
import TransactionsBreakdownChart from '@/components/platform/home/investments/performance/charts/TransactionsBreakdownChart';
import { type BankAccount, type BankTransaction } from '@/types/bank';

interface TransactionsAnalyticsSectionProps {
  transactions: BankTransaction[];
  filteredTransactions: BankTransaction[];
  accounts: BankAccount[];
  usdRate?: number;
  timeframe?: CashFlowTimeframe;
}

export default function TransactionsAnalyticsSection({
  transactions = [],
  filteredTransactions = [],
  accounts = [],
  usdRate = 50.20,
  timeframe = 'All',
}: TransactionsAnalyticsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full">
      {/* 7 Columns on desktop: Monthly In vs Out Progression Bar & Curve */}
      <div className="lg:col-span-7 flex flex-col min-h-0">
        <CashFlowProgressionChart
          transactions={transactions}
          accounts={accounts}
          usdRate={usdRate}
          timeframe={timeframe}
          hideTimeframeSwitcher={true}
        />
      </div>

      {/* 5 Columns on desktop: Category & Activity Distribution Donut + Ranked List */}
      <div className="lg:col-span-5 flex flex-col min-h-0">
        <TransactionsBreakdownChart
          transactions={filteredTransactions}
          usdRate={usdRate}
        />
      </div>
    </div>
  );
}

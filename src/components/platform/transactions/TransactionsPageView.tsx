'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { type ClosedTradeItem, type TransactionsTimeframe } from './types';
import TransactionsHeader from './TransactionsHeader';
import TransactionsFloatingNav from './TransactionsFloatingNav';
import TransactionsOverviewSection from './TransactionsOverviewSection';
import TransactionsLedgerSection from './TransactionsLedgerSection';

interface TransactionsPageViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  closedTrades?: ClosedTradeItem[];
  usdRate?: number;
}

const DEFAULT_CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Dining',
  'Trading & Investments',
  'Salary & Income',
  'Savings',
  'Interest & Yield',
  'Other',
];

function getCutoffDate(timeframe: TransactionsTimeframe, refDate = new Date()): string | null {
  if (timeframe === 'All') return null;
  const d = new Date(refDate);
  if (timeframe === '3M') {
    d.setMonth(d.getMonth() - 3);
  } else if (timeframe === '6M') {
    d.setMonth(d.getMonth() - 6);
  } else if (timeframe === '1Y') {
    d.setFullYear(d.getFullYear() - 1);
  }
  return d.toISOString().split('T')[0];
}

export default function TransactionsPageView({
  initialAccounts = [],
  initialTransactions = [],
  closedTrades = [],
  usdRate = 50.20,
}: TransactionsPageViewProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions);
  const [timeframe, setTimeframe] = useState<TransactionsTimeframe>('All');

  const refreshData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        fetch('/api/banks/accounts'),
        fetch('/api/banks/transactions'),
      ]);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData?.accounts) setAccounts(accData.accounts);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData?.transactions) setTransactions(txData.transactions);
      }
    } catch (err) {
      console.warn('Failed to refresh transactions page:', err);
    }
    router.refresh();
  };

  // Filter Transactions and Trades according to selected Timeframe
  const filteredTransactions = useMemo(() => {
    if (timeframe === 'All') return transactions;
    const cutoff = getCutoffDate(timeframe);
    if (!cutoff) return transactions;
    return transactions.filter((t) => {
      const d = String(t.transactionDate || '').slice(0, 10);
      return d >= cutoff;
    });
  }, [transactions, timeframe]);

  const filteredClosedTrades = useMemo(() => {
    if (timeframe === 'All') return closedTrades;
    const cutoff = getCutoffDate(timeframe);
    if (!cutoff) return closedTrades;
    return closedTrades.filter((t) => {
      const d = String(t.exitDate || t.entryDate || '').slice(0, 10);
      return d >= cutoff;
    });
  }, [closedTrades, timeframe]);

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header & Breadcrumb */}
      <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-plt-base">
        <TransactionsHeader />
      </div>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <TransactionsFloatingNav />

      {/* 3. Main Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-8">
        {/* Section 1: Transactions Overview (Header + KPI Rail + Analytics Charts) */}
        <TransactionsOverviewSection
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          closedTrades={filteredClosedTrades}
          accounts={accounts}
          usdRate={usdRate}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />

        {/* Zone 4: Master Activity & Trades Ledger with Add Transaction action */}
        <TransactionsLedgerSection
          transactions={transactions}
          accounts={accounts}
          closedTrades={closedTrades}
          categories={DEFAULT_CATEGORIES}
          onTransactionsChanged={refreshData}
        />
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { type BankAccount, type BankTransaction, type MonthlyCashflowSummary, type BankItem } from '@/types/bank';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { type ClosedTradeItem, type TransactionsTimeframe } from './types';
import TransactionsHeader from './TransactionsHeader';
import TransactionsFloatingNav from './TransactionsFloatingNav';
import TransactionsOverviewSection from './TransactionsOverviewSection';
import MonthlyCloseoutArchive from './MonthlyCloseoutArchive';
import TransactionsLedgerSection from './TransactionsLedgerSection';
import { Tour, useTour } from '@/components/ui/tour';
import { getTransactionsTourSteps, TRANSACTIONS_TOUR_STORAGE_KEY } from '@/lib/tours/transactions-tour-config';
import { useTranslation } from '@/lib/i18n';

// Dynamic import for modal drawers
const MonthlyCheckInDrawer = dynamic(() => import('./MonthlyCheckInDrawer'), { ssr: false });
const AddAccountDrawer = dynamic(
  () => import('@/components/platform/wallet/AddAccountDrawer'),
  { ssr: false }
);

interface TransactionsPageViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  initialSummaries?: MonthlyCashflowSummary[];
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
  initialSummaries = [],
  closedTrades = [],
  usdRate = 50.20,
}: TransactionsPageViewProps) {
  const router = useRouter();
  const { isRTL } = useTranslation();
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions);
  const [summaries, setSummaries] = useState<MonthlyCashflowSummary[]>(initialSummaries);
  const [availableBanks, setAvailableBanks] = useState<BankItem[]>([]);
  const [timeframe, setTimeframe] = useState<TransactionsTimeframe>('All');

  // Drawers
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  const tour = useTour(TRANSACTIONS_TOUR_STORAGE_KEY);
  const tourSteps = useMemo(() => getTransactionsTourSteps(isRTL), [isRTL]);

  // Load banks list for AddAccountDrawer
  useEffect(() => {
    let isMounted = true;
    fetch('/api/banks/list')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.banks && Array.isArray(d.banks)) {
          setAvailableBanks(d.banks);
        }
      })
      .catch((err) => console.warn('Failed to load banks list:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [accRes, txRes, historyRes] = await Promise.all([
        fetch('/api/banks/accounts'),
        fetch('/api/banks/transactions'),
        fetch('/api/banks/snapshots/history'),
      ]);
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData?.accounts) {
          setAccounts(accData.accounts.filter((a: any) => !isVirtualAccount(a)));
        }
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData?.transactions) {
          setTransactions(txData.transactions);
        }
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData?.summaries && Array.isArray(historyData.summaries)) {
          setSummaries(historyData.summaries);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh transactions page:', err);
    }
    router.refresh();
  }, [router]);

  // Real non-virtual accounts
  const realAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived && !isVirtualAccount(a));
  }, [accounts]);

  // Calculate real-time Total Liquid Cash in EGP across real accounts
  const totalLiquidEgp = useMemo(() => {
    return realAccounts.reduce((acc, a) => {
      const b = Number(a.balance) || 0;
      const egp = a.currency === 'USD' ? b * usdRate : b;
      return acc + egp;
    }, 0);
  }, [realAccounts, usdRate]);

  // Most recent closeout summary
  const latestSummary = useMemo(() => {
    return summaries.length > 0 ? summaries[0] : null;
  }, [summaries]);

  // Inline balance update handler
  const handleBalanceUpdated = useCallback((accountId: number, newBalance: number) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, balance: newBalance } : acc))
    );
  }, []);

  // Check-in completion handler
  const handleCheckInComplete = useCallback((newSummary: MonthlyCashflowSummary) => {
    setSummaries((prev) => {
      const filtered = prev.filter((s) => s.yearMonth !== newSummary.yearMonth);
      return [newSummary, ...filtered].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    });
    refreshData();
  }, [refreshData]);

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
      {/* 1. Header & Actions */}
      <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-plt-base">
        <TransactionsHeader
          onStartTour={tour.start}
          onOpenCheckIn={() => setIsCheckInOpen(true)}
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
        />
      </div>

      {/* 2. Sticky Floating Top Navigation Bar */}
      <TransactionsFloatingNav hasSummaries={summaries.length > 0} />

      {/* 3. Main Sections Stack */}
      <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-8">
        {/* Section 1: Overview (Header + KPI Rail + Accounts Rail + Analytics Charts) */}
        <TransactionsOverviewSection
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          closedTrades={filteredClosedTrades}
          accounts={realAccounts}
          usdRate={usdRate}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          totalLiquidEgp={totalLiquidEgp}
          latestSummary={latestSummary}
          summaries={summaries}
          onBalanceUpdated={handleBalanceUpdated}
          onOpenAddAccount={() => setIsAddAccountOpen(true)}
        />

        {/* Section 2: Monthly Wealth Closeouts & Expense Breakdown Archive (Rendered when summaries exist) */}
        {summaries.length > 0 && (
          <section id="section-closeout-archive" className="section-container">
            <MonthlyCloseoutArchive
              summaries={summaries}
              isArabic={isRTL}
              onOpenCheckIn={() => setIsCheckInOpen(true)}
            />
          </section>
        )}

        {/* Section 3: Master Activity & Trades Ledger for audit & trade settlement tracking */}
        <section id="section-activity-ledger" className="section-container">
          <TransactionsLedgerSection
            transactions={transactions}
            accounts={realAccounts}
            closedTrades={closedTrades}
            categories={DEFAULT_CATEGORIES}
            onTransactionsChanged={refreshData}
          />
        </section>
      </div>

      {/* Monthly Balance Update Drawer */}
      <MonthlyCheckInDrawer
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        accounts={realAccounts}
        availableBanks={availableBanks}
        usdRate={usdRate}
        isArabic={isRTL}
        previousSummary={latestSummary}
        onCheckInComplete={handleCheckInComplete}
        onOpenAddAccount={() => setIsAddAccountOpen(true)}
      />

      {/* Add Account Modal Drawer */}
      <AddAccountDrawer
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        availableBanks={availableBanks}
        onAccountCreated={refreshData}
      />

      {/* In-App Tour Walkthrough Portal */}
      <Tour
        steps={tourSteps}
        open={tour.open}
        onOpenChange={tour.setOpen}
        index={tour.index}
        onIndexChange={tour.setIndex}
        onFinish={tour.markSeen}
        onSkip={tour.markSeen}
        dark
      />
    </div>
  );
}

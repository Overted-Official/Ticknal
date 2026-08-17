'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Landmark, ArrowRightLeft, Plus, Wallet } from 'lucide-react';
import SubNavTopRail from '@/components/navigation/SubNavTopRail';
import BankSummaryKPIs from './wallet/BankSummaryKPIs';
import BankAccountsGrid from './wallet/BankAccountsGrid';
import TransactionLedgerTable from './wallet/TransactionLedgerTable';
import AddAccountDrawer from './wallet/AddAccountDrawer';
import LogTransactionDrawer from './wallet/LogTransactionDrawer';
import { type BankAccount, type BankTransaction, type BankItem } from '@/types/bank';
import { useToast } from '@/context/ToastContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Groceries',
  'Salary & Income',
  'Trading Injection',
  'Trading Withdrawal',
  'Savings & CD',
  'Investments',
  'Subscriptions',
  'Healthcare',
  'Transport',
  'Entertainment',
  'Other',
];

interface BankAccountsLedgerViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
}

export default function BankAccountsLedgerView({
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
}: BankAccountsLedgerViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  // SWR Hooks for live data synchronization
  const { data: accountsData, mutate: mutateAccounts } = useSWR<{ accounts: BankAccount[] }>(
    '/api/banks/accounts',
    fetcher,
    { fallbackData: { accounts: initialAccounts }, refreshInterval: 10000 }
  );

  const { data: txData, mutate: mutateTx } = useSWR<{ transactions: BankTransaction[] }>(
    '/api/banks/transactions',
    fetcher,
    { fallbackData: { transactions: initialTransactions }, refreshInterval: 10000 }
  );

  const { data: banksListData } = useSWR<{ banks: BankItem[] }>('/api/banks/list', fetcher);

  const accounts = accountsData?.accounts ?? initialAccounts;
  const transactions = txData?.transactions ?? initialTransactions;
  const availableBanks = banksListData?.banks ?? [];

  // Drawers state
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isTxDrawerOpen, setIsTxDrawerOpen] = useState(false);

  // Handle Delete Account
  async function handleDeleteAccount(id: number) {
    if (!confirm('Are you sure you want to delete this bank account? All associated transaction records will be removed.')) return;
    try {
      await fetch(`/api/banks/accounts?id=${id}`, { method: 'DELETE' });
      toast.info('Account Deleted', 'Bank account and related entries were removed.');
      mutateAccounts();
      mutateTx();
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error('Deletion Failed', 'Could not delete bank account.');
    }
  }

  // Handle Delete Transaction
  async function handleDeleteTransaction(id: number) {
    if (!confirm('Delete this transaction and reverse its balance impact?')) return;
    try {
      await fetch(`/api/banks/transactions?id=${id}`, { method: 'DELETE' });
      toast.info('Transaction Reverted', 'Balance has been restored.');
      mutateAccounts();
      mutateTx();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      toast.error('Deletion Failed', 'Could not delete transaction.');
    }
  }

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto bg-tv-base text-tv-text select-none">
      {/* 1. Mobile Top Rail */}
      <SubNavTopRail
        activeTab="banks"
        onChange={(val) => router.push(`/wallet?tab=${val}`)}
        items={[
          { label: 'Stock Positions', value: 'positions', icon: Wallet },
          { label: 'Bank Accounts & Ledger', value: 'banks', icon: Landmark, badge: accounts.length },
        ]}
      />

      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6">
        {/* 2. Top Header & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Bank Accounts & Cash Ledger
            </h1>
            <p className="text-xs md:text-sm text-white/40 mt-1">
              Manage multi-currency liquid reserves, log transfers, and track categorical cash flows.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (accounts.length === 0) {
                  toast.warning('No Accounts Found', 'Please add a bank account first before logging transactions.');
                  return;
                }
                setIsTxDrawerOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              <ArrowRightLeft size={14} strokeWidth={2.2} />
              Log Transaction / Transfer
            </button>
            <button
              type="button"
              onClick={() => setIsAccountDrawerOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/10 transition-all flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2} />
              New Account
            </button>
          </div>
        </div>

        {/* 3. Liquid Cash Summary KPIs */}
        <BankSummaryKPIs accounts={accounts} usdRate={usdRate} />

        {/* 4. Bank Accounts Cards Grid */}
        <BankAccountsGrid
          accounts={accounts}
          onOpenAddModal={() => setIsAccountDrawerOpen(true)}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* 5. Transaction Ledger & Cash Flow History */}
        <TransactionLedgerTable
          transactions={transactions}
          accounts={accounts}
          categories={CATEGORIES}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </div>

      {/* Drawers */}
      <AddAccountDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
        availableBanks={availableBanks}
        onAccountCreated={() => mutateAccounts()}
      />

      <LogTransactionDrawer
        isOpen={isTxDrawerOpen}
        onClose={() => setIsTxDrawerOpen(false)}
        accounts={accounts}
        categories={CATEGORIES}
        onTransactionLogged={() => {
          mutateAccounts();
          mutateTx();
        }}
      />
    </div>
  );
}

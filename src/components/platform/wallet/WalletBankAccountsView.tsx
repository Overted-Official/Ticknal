'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import BankSummaryKPIs from './BankSummaryKPIs';
import BankAccountsGrid from './BankAccountsGrid';
import TransactionLedgerTable from './TransactionLedgerTable';
import AddAccountDrawer from './AddAccountDrawer';
import LogTransactionDrawer from './LogTransactionDrawer';
import EditAccountHistoryDrawer from './EditAccountHistoryDrawer';
import WalletBanksHeader from './banks/WalletBanksHeader';
import BankAccountsSkeleton from './BankAccountsSkeleton';
import { type BankAccount, type BankTransaction, type BankItem } from '@/types/bank';
import { useToast } from '@/context/ToastContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Groceries',
  'Smoking',
  'Salary & Income',
  'Interest & Yield',
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

interface WalletBankAccountsViewProps {
  initialAccounts?: BankAccount[];
  initialTransactions?: BankTransaction[];
  usdRate?: number;
}

export default function WalletBankAccountsView({
  initialAccounts = [],
  initialTransactions = [],
  usdRate = 50.20,
}: WalletBankAccountsViewProps) {
  const { toast } = useToast();

  // SWR Hooks for live data synchronization
  const { data: accountsData, mutate: mutateAccounts } = useSWR<{ accounts: BankAccount[] }>(
    '/api/banks/accounts',
    fetcher,
    { fallbackData: initialAccounts.length > 0 ? { accounts: initialAccounts } : undefined, refreshInterval: 10000 }
  );

  const { data: txData, mutate: mutateTx } = useSWR<{ transactions: BankTransaction[] }>(
    '/api/banks/transactions',
    fetcher,
    { fallbackData: initialTransactions.length > 0 ? { transactions: initialTransactions } : undefined, refreshInterval: 10000 }
  );

  const { data: banksListData } = useSWR<{ banks: BankItem[] }>('/api/banks/list', fetcher);

  const accounts = accountsData?.accounts ?? initialAccounts;
  const transactions = txData?.transactions ?? initialTransactions;
  const availableBanks = banksListData?.banks ?? [];
  const isInitialLoading = !accountsData && accounts.length === 0;

  // Drawers state
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isTxDrawerOpen, setIsTxDrawerOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<BankAccount | null>(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<BankTransaction | null>(null);

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
    <div className="flex-1 h-full w-full min-h-0 overflow-y-auto touch-pan-y select-none">
      <div className="app-page page-sections-stack pb-28 md:pb-20">
        {isInitialLoading ? (
          <BankAccountsSkeleton />
        ) : (
          <>
            {/* Header */}
            <WalletBanksHeader
              onLogTransaction={() => {
                if (accounts.length === 0) {
                  toast.warning('No Accounts Found', 'Please add a bank account first before logging transactions.');
                  return;
                }
                setSelectedTxForEdit(null);
                setIsTxDrawerOpen(true);
              }}
              onAddAccount={() => setIsAccountDrawerOpen(true)}
            />

            {/* SECTION 1: Liquidity & Connected Accounts */}
            <section className="section-container section-viewport-fit">
              <div className="flex flex-col gap-0.5">
                <h2 className="section-title">Liquidity & Connected Accounts</h2>
                <p className="section-subtitle">Aggregated cash balances, currency allocation, and institutional accounts</p>
              </div>

              <BankSummaryKPIs accounts={accounts} usdRate={usdRate} />

              <BankAccountsGrid
                accounts={accounts}
                usdRate={usdRate}
                onOpenAddModal={() => setIsAccountDrawerOpen(true)}
                onEditAccount={(acc) => setSelectedAccountForEdit(acc)}
                onDeleteAccount={handleDeleteAccount}
              />
            </section>

            {/* SECTION 2: Transaction Ledger & Activity */}
            <section className="section-container section-viewport-fit">
              <div className="flex flex-col gap-0.5">
                <h2 className="section-title">Transaction Ledger & Activity</h2>
                <p className="section-subtitle">Audited record of multi-currency inflows, expenses, injections, and withdrawals</p>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <TransactionLedgerTable
                  transactions={transactions}
                  accounts={accounts}
                  categories={CATEGORIES}
                  onDeleteTransaction={handleDeleteTransaction}
                  onEditTransaction={(tx) => {
                    setSelectedTxForEdit(tx);
                    setIsTxDrawerOpen(true);
                  }}
                />
              </div>
            </section>
          </>
        )}
      </div>

      {/* Drawers */}
      <AddAccountDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
        availableBanks={availableBanks}
        onAccountCreated={() => mutateAccounts()}
      />

      <EditAccountHistoryDrawer
        isOpen={!!selectedAccountForEdit}
        onClose={() => setSelectedAccountForEdit(null)}
        account={selectedAccountForEdit}
        onAccountUpdated={() => {
          mutateAccounts();
          mutateTx();
        }}
      />

      <LogTransactionDrawer
        isOpen={isTxDrawerOpen}
        onClose={() => {
          setIsTxDrawerOpen(false);
          setSelectedTxForEdit(null);
        }}
        accounts={accounts}
        categories={CATEGORIES}
        transactionToEdit={selectedTxForEdit}
        onTransactionLogged={() => {
          mutateAccounts();
          mutateTx();
        }}
      />
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
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

type BrokeragePosition = {
  accountId?: number | null;
  tickerSymbol: string;
  quantity?: number;
  currentPrice?: number;
};

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
  const { data: positionsData } = useSWR<{ orders: BrokeragePosition[] }>(
    '/api/positions?status=OPEN',
    fetcher,
    { refreshInterval: 10000 },
  );

  const accounts = accountsData?.accounts ?? initialAccounts;
  const transactions = txData?.transactions ?? initialTransactions;
  const availableBanks = banksListData?.banks ?? [];
  const openPositions = positionsData?.orders ?? [];
  const isInitialLoading = !accountsData && accounts.length === 0;

  const brokerageSummaries = useMemo(() => {
    return accounts
      .filter((account) => !account.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType))
      .map((account) => {
        const positions = openPositions.filter((position) => position.accountId === account.id);
        const symbols = Array.from(new Set(positions.map((position) => position.tickerSymbol)));
        const investedValue = positions.reduce(
          (sum, position) => sum + Number(position.quantity || 0) * Number(position.currentPrice || 0),
          0,
        );
        return { account, positions, symbols, investedValue };
      });
  }, [accounts, openPositions]);

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

  // Handle Set Default Expense Account
  async function handleSetDefaultAccount(id: number) {
    try {
      const res = await fetch('/api/banks/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefaultExpense: true }),
      });
      if (res.ok) {
        toast.success('Main Account Set', 'This account is now automatically selected when logging transactions.');
        mutateAccounts();
      } else {
        toast.error('Update Failed', 'Could not set default account.');
      }
    } catch (err) {
      console.error('Failed to set default account:', err);
      toast.error('Error', 'Could not reach server.');
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
                onSetDefaultAccount={handleSetDefaultAccount}
              />

              {brokerageSummaries.length > 0 && (
                <div className="mt-5 rounded-xl bg-plt-card/35 px-4 py-3">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-plt-text">Invested holdings by brokerage</h3>
                      <p className="mt-0.5 text-[11px] text-plt-muted">Open positions linked to each brokerage account. Historical unlinked lots stay outside these totals.</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-plt-muted">Live positions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="account-summary-table-min">
                      <div className="table-layout-account-summary border-b border-plt-border-soft px-2 py-2 text-[9px] font-semibold uppercase tracking-wider text-plt-muted">
                        <span>Brokerage</span><span>Positions</span><span>Tickers</span><span className="text-right">Market value</span>
                      </div>
                      {brokerageSummaries.map(({ account, positions, symbols, investedValue }) => (
                        <div key={account.id} className="table-layout-account-summary items-center border-b border-plt-border-soft px-2 py-2.5 text-xs last:border-b-0">
                          <span className="truncate font-semibold text-plt-text">{account.accountName || account.customBankName || account.bankName || 'Brokerage account'}</span>
                          <span className="text-plt-muted">{positions.length}</span>
                          <span className="text-plt-muted">{symbols.length}</span>
                          <span className="text-right font-semibold text-plt-text">{investedValue.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} {account.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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

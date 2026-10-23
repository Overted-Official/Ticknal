'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Wallet, Landmark, DollarSign, CreditCard } from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import AccountBalanceCard from './AccountBalanceCard';

interface AccountsRailProps {
  accounts: BankAccount[];
  usdRate?: number;
  isArabic?: boolean;
  onBalanceUpdated?: (accountId: number, newBalance: number) => void;
  onOpenAddAccount?: () => void;
}

type AccountFilter = 'ALL' | 'BANKS' | 'WALLETS' | 'BROKERAGE' | 'USD';

export default function AccountsRail({
  accounts = [],
  usdRate = 50.2,
  isArabic = false,
  onBalanceUpdated,
  onOpenAddAccount,
}: AccountsRailProps) {
  const [filter, setFilter] = useState<AccountFilter>('ALL');

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (acc.isArchived) return false;
      const type = (acc.accountType || '').toUpperCase();
      const isUsd = acc.currency === 'USD';

      if (filter === 'USD') return isUsd;
      if (filter === 'BANKS') return !isUsd && (type === 'CURRENT' || type === 'SAVINGS' || type === 'CD_TIME_DEPOSIT');
      if (filter === 'WALLETS') return type.includes('WALLET') || type.includes('CASH');
      if (filter === 'BROKERAGE') return type.includes('BROKER');
      return true;
    });
  }, [accounts, filter]);

  return (
    <div className="space-y-3 font-sans">
      {/* Subheader & Filter Segments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {isArabic ? 'الحسابات والمحافظ' : 'Accounts & Liquidity'}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-text-muted">
            {filteredAccounts.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              filter === 'ALL'
                ? 'bg-surface-active text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {isArabic ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('BANKS')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              filter === 'BANKS'
                ? 'bg-surface-active text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <Landmark className="w-3 h-3" />
            <span>{isArabic ? 'بنوك' : 'Banks'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('WALLETS')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              filter === 'WALLETS'
                ? 'bg-surface-active text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <Wallet className="w-3 h-3" />
            <span>{isArabic ? 'محافظ ونقد' : 'Wallets & Cash'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('BROKERAGE')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              filter === 'BROKERAGE'
                ? 'bg-surface-active text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>{isArabic ? 'شركات التداول' : 'Brokerage Cash'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('USD')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              filter === 'USD'
                ? 'bg-surface-active text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span>USD</span>
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredAccounts.map((account) => (
          <AccountBalanceCard
            key={account.id}
            account={account}
            usdRate={usdRate}
            isArabic={isArabic}
            onBalanceUpdated={onBalanceUpdated}
          />
        ))}

        {/* Add Account Card */}
        {onOpenAddAccount && (
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="p-4 rounded-xl border border-dashed border-white/15 hover:border-brand-blue/50 bg-transparent hover:bg-brand-blue/[0.02] transition-all flex flex-col items-center justify-center gap-2 min-h-[130px] cursor-pointer group text-text-muted hover:text-brand-blue select-none"
          >
            <div className="w-8 h-8 rounded-full border border-dashed border-white/20 group-hover:border-brand-blue flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">
              {isArabic ? '+ إضافة حساب جديد' : '+ Add New Account'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Plus, ChevronRight, ChevronLeft } from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (acc.isArchived || isVirtualAccount(acc)) return false;
      const type = (acc.accountType || '').toUpperCase();
      const isUsd = acc.currency === 'USD';

      if (filter === 'USD') return isUsd;
      if (filter === 'BANKS') return !isUsd && (type === 'CURRENT' || type === 'SAVINGS' || type === 'CD_TIME_DEPOSIT');
      if (filter === 'WALLETS') return type.includes('WALLET') || type.includes('CASH');
      if (filter === 'BROKERAGE') return type.includes('BROKER');
      return true;
    });
  }, [accounts, filter]);

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: isArabic ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: isArabic ? 220 : -220,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      {/* Subheader & Normal Platform Filter Switch (No Icons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-semibold text-text-primary tracking-tight">
            {isArabic ? 'الحسابات والسيولة' : 'Accounts & Liquidity'}
          </h3>
          <span className="badge-count">
            {filteredAccounts.length}
          </span>
        </div>

        {/* Normal platform switch matching markets page */}
        <div className="seg-control self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`seg-control-btn ${filter === 'ALL' ? 'seg-control-btn-active' : ''}`}
          >
            {isArabic ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('BANKS')}
            className={`seg-control-btn ${filter === 'BANKS' ? 'seg-control-btn-active' : ''}`}
          >
            {isArabic ? 'البنوك' : 'Banks'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('WALLETS')}
            className={`seg-control-btn ${filter === 'WALLETS' ? 'seg-control-btn-active' : ''}`}
          >
            {isArabic ? 'محافظ ونقد' : 'Wallets & Cash'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('BROKERAGE')}
            className={`seg-control-btn ${filter === 'BROKERAGE' ? 'seg-control-btn-active' : ''}`}
          >
            {isArabic ? 'شركات التداول' : 'Brokerage Cash'}
          </button>
          <button
            type="button"
            onClick={() => setFilter('USD')}
            className={`seg-control-btn ${filter === 'USD' ? 'seg-control-btn-active' : ''}`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Selectable Account Pills Row (Modeled 1-to-1 after Major Indices section) */}
      <div className="flex items-center justify-between gap-2 relative">
        {/* Horizontal Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar select-none flex-1"
        >
          {filteredAccounts.map((account) => (
            <AccountBalanceCard
              key={account.id}
              account={account}
              usdRate={usdRate}
              isArabic={isArabic}
              onBalanceUpdated={onBalanceUpdated}
            />
          ))}

          {filteredAccounts.length === 0 && (
            <p className="text-xs text-text-muted py-1.5">
              {isArabic ? 'لا توجد حسابات مسجلة في هذا التصنيف' : 'No accounts in this category'}
            </p>
          )}

          {/* Add Account Pill */}
          {onOpenAddAccount && (
            <button
              type="button"
              onClick={onOpenAddAccount}
              className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-dashed border-border-subtle hover:border-border-default hover:bg-white/[0.04] transition-all shrink-0 cursor-pointer text-text-muted hover:text-text-primary"
            >
              <div className="w-7 h-7 rounded-full border border-dashed border-border-subtle group-hover:border-border-default flex items-center justify-center shrink-0 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">
                {isArabic ? 'إضافة حساب' : 'Add Account'}
              </span>
            </button>
          )}
        </div>

        {/* Carousel Arrow Buttons */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={scrollLeft}
            className="w-7 h-7 rounded-full bg-black hover:bg-surface-raised border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title={isArabic ? 'السابق' : 'Previous'}
          >
            <ChevronLeft size={14} className={isArabic ? 'rotate-180' : ''} />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="w-7 h-7 rounded-full bg-black hover:bg-surface-raised border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title={isArabic ? 'التالي' : 'Next'}
          >
            <ChevronRight size={14} className={isArabic ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}

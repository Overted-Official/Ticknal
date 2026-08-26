'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark,
  Trash2,
  History,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
  List,
  Building2,
  CreditCard,
  Plus,
} from '@/components/ui/icon-library';
import { type BankAccount } from '@/types/bank';
import { maskAccountNumber } from '@/lib/masking';

interface BankAccountsGridProps {
  accounts: BankAccount[];
  usdRate?: number;
  onOpenAddModal: () => void;
  onEditAccount: (account: BankAccount) => void;
  onDeleteAccount: (id: number) => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CURRENT: 'Current',
  SAVINGS: 'Savings',
  CD_TIME_DEPOSIT: 'Certificates (CD)',
  BROKER_CASH: 'Brokerage Cash',
  WALLET: 'Digital Wallet',
};

export default function BankAccountsGrid({
  accounts,
  usdRate = 50.20,
  onOpenAddModal,
  onEditAccount,
  onDeleteAccount,
}: BankAccountsGridProps) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Group accounts by Financial Institution / Bank
  const groupedBanks = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        logoUrl?: string | null;
        accounts: BankAccount[];
        totalEgp: number;
        totalUsd: number;
        totalCombinedEgp: number;
      }
    >();

    for (const acc of accounts) {
      const bankKey = acc.bankId ? `bank-${acc.bankId}` : `custom-${acc.customBankName || acc.accountName}`;
      const bankName = acc.bankName || acc.customBankName || 'Other Institution';
      const bankLogo = acc.bankLogoUrl;

      if (!map.has(bankKey)) {
        map.set(bankKey, {
          key: bankKey,
          name: bankName,
          logoUrl: bankLogo,
          accounts: [],
          totalEgp: 0,
          totalUsd: 0,
          totalCombinedEgp: 0,
        });
      }

      const group = map.get(bankKey)!;
      group.accounts.push(acc);

      const bal = Number(acc.balance) || 0;
      if (acc.currency === 'USD') {
        group.totalUsd += bal;
      } else {
        group.totalEgp += bal;
      }
      group.totalCombinedEgp = group.totalEgp + group.totalUsd * usdRate;
    }

    return Array.from(map.values()).sort((a, b) => b.totalCombinedEgp - a.totalCombinedEgp);
  }, [accounts, usdRate]);

  // Default collapsed
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set()
  );

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedKeys.size === groupedBanks.length) {
      setExpandedKeys(new Set());
    } else {
      setExpandedKeys(new Set(groupedBanks.map((g) => g.key)));
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="glass-panel text-center flex flex-col items-center justify-center space-y-2">
        <Landmark size={40} className="text-plt-faint" />
        <p className="text-sm text-plt-subtle">No bank accounts added yet.</p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-medium text-xs transition font-semibold"
        >
          + Add Your First Bank Account
        </button>
      </div>
    );
  }

  return (
    <div className="widget-stack">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-1 select-none">
        <div className="flex items-center gap-2">
          <h2 className="section-title">
            Connected Institutions ({groupedBanks.length} Banks · {accounts.length} Accounts)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'table' && groupedBanks.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="btn-token btn-secondary btn-compact font-sans text-xs"
            >
              {expandedKeys.size === groupedBanks.length ? 'Collapse All' : 'Expand All'}
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="pill-switch">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`pill-switch-btn p-1.5 ${
                viewMode === 'table' ? 'pill-switch-btn-active' : ''
              }`}
              title="Grouped Table View"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`pill-switch-btn p-1.5 ${
                viewMode === 'grid' ? 'pill-switch-btn-active' : ''
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* TABLE / COLLAPSIBLE GROUPED VIEW */}
      {viewMode === 'table' && (
        <div className="border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.08] select-none">
          {groupedBanks.map((group) => {
            const isExpanded = expandedKeys.has(group.key);
            const hasMultipleAccounts = group.accounts.length > 1;
            const hasBothCurrencies = group.totalEgp > 0 && group.totalUsd > 0;

            return (
              <div key={group.key} className="transition-colors">
                {/* Master Bank Row Header */}
                <div
                  onClick={() => toggleExpand(group.key)}
                  className="p-4 flex items-center justify-between cursor-pointer bg-transparent hover:bg-white/[0.04] select-none transition-colors"
                >
                  {/* Left: Bank Logo + Name + Account Badges */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden relative">
                      {group.logoUrl ? (
                        <Image
                          src={group.logoUrl}
                          alt={group.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-contain p-1.5 rounded-full"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={18} className="text-plt-muted" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-plt-text tracking-tight truncate font-sans">{group.name}</h3>
                        <span className="badge badge-muted font-sans">
                          {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                        </span>
                        {group.totalEgp > 0 && (
                          <span className="badge badge-profit font-sans">
                            EGP
                          </span>
                        )}
                        {group.totalUsd > 0 && (
                          <span className="badge badge-info font-sans">
                            USD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-plt-muted truncate max-w-md mt-0.5 font-sans">
                        {group.accounts.map((a) => a.accountName).join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* Right: Total Balance & Accordion Trigger */}
                  <div className="flex items-center gap-3 shrink-0 pl-4">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-plt-muted font-sans">
                        {hasMultipleAccounts ? 'Total Bank Holdings' : 'Account Balance'}
                      </div>
                      <div className="text-sm md:text-base font-bold font-sans tabular-nums text-plt-text tracking-tight">
                        {hasBothCurrencies ? (
                          <span>
                            {group.totalCombinedEgp.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-xs font-normal text-plt-muted font-sans">£</span>
                          </span>
                        ) : group.totalUsd > 0 ? (
                          <span className="text-plt-info">
                            ${group.totalUsd.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-plt-text">
                            {group.totalEgp.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-xs font-normal text-plt-muted font-sans">£</span>
                          </span>
                        )}
                      </div>
                      {hasBothCurrencies && (
                        <div className="text-[10px] font-sans tabular-nums text-plt-muted mt-0.5">
                          {group.totalEgp.toLocaleString('en-US', { maximumFractionDigits: 0 })} £ + $
                          {group.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-plt-muted group-hover:text-plt-text">
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-plt-text' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-Accounts Collapsible Body */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden bg-transparent border-t border-white/[0.06]"
                    >
                      <div className="divide-y divide-white/[0.04]">
                        {group.accounts.map((acc) => {
                          const bal = Number(acc.balance) || 0;
                          const isUsd = acc.currency === 'USD';
                          const typeLabel = ACCOUNT_TYPE_LABELS[acc.accountType] || acc.accountType;

                          return (
                            <div
                              key={acc.id}
                              className="px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 bg-transparent hover:bg-white/[0.04] transition-colors"
                            >
                              {/* Account Info */}
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-plt-text tracking-tight truncate font-sans">
                                      {acc.accountName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium tabular-nums bg-white/[0.04] text-plt-muted border border-white/[0.06] font-sans">
                                      {typeLabel}
                                    </span>
                                    {acc.accountNumber && (
                                      <span className="text-mini tabular-nums text-plt-faint hidden sm:inline font-sans">
                                        • {maskAccountNumber(acc.accountNumber)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Balance & Actions */}
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right tabular-nums font-sans">
                                  <span
                                    className={`text-xs md:text-sm font-semibold ${
                                      isUsd ? 'text-plt-info' : 'text-plt-profit'
                                    }`}
                                  >
                                    {isUsd ? '$' : ''}
                                    {bal.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                    {!isUsd ? ' EGP' : ''}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onEditAccount(acc)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-white text-plt-muted text-xs font-medium transition flex items-center gap-1.5 border border-white/[0.08] cursor-pointer"
                                    title="Edit & Monthly Balance History"
                                  >
                                    <History size={14} />
                                    <span>History / Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteAccount(acc.id)}
                                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk hover:border-plt-risk/30 transition border border-white/[0.08] cursor-pointer"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* GRID CARDS VIEW */}
      {viewMode === 'grid' && (
        <div className="widget-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const bal = Number(acc.balance);
            const isUsd = acc.currency === 'USD';

            return (
              <div
                key={acc.id}
                className="glass-panel flex flex-col justify-between group hover:border-plt-border-strong transition-all relative overflow-hidden cursor-pointer"
                onClick={() => onEditAccount(acc)}
              >
                {/* Header: Bank Logo + Name + Account Type */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-plt-hover border border-plt-border flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {acc.bankLogoUrl ? (
                        <Image
                          src={acc.bankLogoUrl}
                          alt={acc.bankName || acc.accountName}
                          width={36}
                          height={36}
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={24} className="text-plt-muted" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-plt-text tracking-tight line-clamp-2 group-hover:text-plt-profit transition-colors">
                        {acc.accountName}
                      </h3>
                      <p className="text-caption text-plt-muted line-clamp-2">
                        {acc.bankName || acc.customBankName || 'Egyptian Bank'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-compact tabular-nums px-2 py-2 rounded-xl font-medium tracking-wider ${
                      isUsd
                        ? 'bg-plt-info/10 text-plt-info border border-plt-info/20'
                        : 'bg-plt-profit/10 text-plt-profit border border-plt-profit/20'
                    }`}
                  >
                    {acc.currency}
                  </span>
                </div>

                {/* Balance & Actions */}
                <div className="mt-4 pt-4 border-t border-plt-border-soft flex items-baseline justify-between">
                  <div>
                    <div className="text-mini text-plt-muted font-medium ">Balance</div>
                    <div className="text-lg md:text-xl font-medium tabular-nums text-plt-text tracking-tight">
                      {isUsd ? '$' : ''}
                      {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {!isUsd ? ' EGP' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAccount(acc);
                      }}
                      className="px-2 py-2 rounded-xl bg-plt-hover hover:bg-plt-profit/20 text-plt-subtle hover:text-plt-profit text-caption font-medium transition flex items-center gap-2 border border-plt-border"
                      title="Edit & Monthly History"
                    >
                      <History size={16} />
                      <span>History</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAccount(acc.id);
                      }}
                      className="p-2 rounded-xl bg-plt-hover hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition"
                      title="Delete Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
} from 'lucide-react';
import { type BankAccount } from '@/types/bank';

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

  // Initially expand all banks
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(groupedBanks.map((g) => g.key))
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
      <div className="glass-panel rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3">
        <Landmark size={36} className="text-white/20" />
        <p className="text-sm text-white/60">No bank accounts added yet.</p>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition shadow-lg shadow-emerald-500/10"
        >
          + Add Your First Bank Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
            Connected Institutions ({groupedBanks.length} Banks · {accounts.length} Accounts)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'table' && groupedBanks.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] text-white/40 hover:text-white transition px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08]"
            >
              {expandedKeys.size === groupedBanks.length ? 'Collapse All' : 'Expand All'}
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center bg-black border border-white/[0.08] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'table' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/40 hover:text-white'
              }`}
              title="Grouped Table View"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === 'grid' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/40 hover:text-white'
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
        <div className="border border-white/[0.08] rounded-xl bg-black overflow-hidden divide-y divide-white/[0.06]">
          {groupedBanks.map((group) => {
            const isExpanded = expandedKeys.has(group.key);
            const hasMultipleAccounts = group.accounts.length > 1;
            const hasBothCurrencies = group.totalEgp > 0 && group.totalUsd > 0;

            return (
              <div key={group.key} className="transition-colors">
                {/* Master Bank Row Header */}
                <div
                  onClick={() => toggleExpand(group.key)}
                  className="p-3.5 md:p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] select-none transition-colors"
                >
                  {/* Left: Bank Logo + Name + Account Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden relative">
                      {group.logoUrl ? (
                        <Image
                          src={group.logoUrl}
                          alt={group.name}
                          width={30}
                          height={30}
                          className="object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={18} className="text-white/40" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight truncate">{group.name}</h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-white/70 border border-white/[0.06]">
                          {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                        </span>
                        {group.totalEgp > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            EGP
                          </span>
                        )}
                        {group.totalUsd > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            USD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        {group.accounts.map((a) => a.accountName).join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* Right: Total Balance & Accordion Trigger */}
                  <div className="flex items-center gap-4 shrink-0 pl-3">
                    <div className="text-right">
                      <div className="text-[10px] text-white/40 font-medium uppercase">
                        {hasMultipleAccounts ? 'Total Bank Holdings' : 'Account Balance'}
                      </div>
                      <div className="text-sm md:text-base font-bold font-mono text-white tracking-tight">
                        {hasBothCurrencies ? (
                          <span>
                            {group.totalCombinedEgp.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-xs font-normal text-white/40">EGP</span>
                          </span>
                        ) : group.totalUsd > 0 ? (
                          <span className="text-sky-400">
                            ${group.totalUsd.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {group.totalEgp.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-xs font-normal text-emerald-400/60">EGP</span>
                          </span>
                        )}
                      </div>
                      {hasBothCurrencies && (
                        <div className="text-[10px] font-mono text-white/40 mt-0.5">
                          {group.totalEgp.toLocaleString('en-US', { maximumFractionDigits: 0 })} EGP + $
                          {group.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 group-hover:text-white">
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : ''}`}
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
                      className="overflow-hidden bg-white/[0.015] border-t border-white/[0.04]"
                    >
                      <div className="divide-y divide-white/[0.04]">
                        {group.accounts.map((acc) => {
                          const bal = Number(acc.balance) || 0;
                          const isUsd = acc.currency === 'USD';
                          const typeLabel = ACCOUNT_TYPE_LABELS[acc.accountType] || acc.accountType;

                          return (
                            <div
                              key={acc.id}
                              className="px-4 md:px-6 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                            >
                              {/* Account Info */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-white/20 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white tracking-tight truncate">
                                      {acc.accountName}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.06] text-white/60">
                                      {typeLabel}
                                    </span>
                                    {acc.accountNumber && (
                                      <span className="text-[10px] font-mono text-white/30 hidden sm:inline">
                                        • {acc.accountNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Balance & Actions */}
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right font-mono">
                                  <span
                                    className={`text-xs md:text-sm font-bold ${
                                      isUsd ? 'text-sky-400' : 'text-emerald-400'
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

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onEditAccount(acc)}
                                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-emerald-500/20 text-white/70 hover:text-emerald-400 text-[11px] font-medium transition flex items-center gap-1 border border-white/[0.08]"
                                    title="Edit & Monthly Balance History"
                                  >
                                    <History size={12} />
                                    <span>History / Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteAccount(acc.id)}
                                    className="p-1.5 rounded-md bg-white/[0.04] hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition"
                                    title="Delete Account"
                                  >
                                    <Trash2 size={13} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {accounts.map((acc) => {
            const bal = Number(acc.balance);
            const isUsd = acc.currency === 'USD';

            return (
              <div
                key={acc.id}
                className="glass-panel rounded-xl p-4 flex flex-col justify-between group hover:border-white/20 transition-all relative overflow-hidden cursor-pointer"
                onClick={() => onEditAccount(acc)}
              >
                {/* Header: Bank Logo + Name + Account Type */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {acc.bankLogoUrl ? (
                        <Image
                          src={acc.bankLogoUrl}
                          alt={acc.bankName || acc.accountName}
                          width={36}
                          height={36}
                          className="object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Landmark size={20} className="text-white/40" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
                        {acc.accountName}
                      </h3>
                      <p className="text-[11px] text-white/40 line-clamp-1">
                        {acc.bankName || acc.customBankName || 'Egyptian Bank'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isUsd
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {acc.currency}
                  </span>
                </div>

                {/* Balance & Actions */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] text-white/40 font-medium uppercase">Balance</div>
                    <div className="text-lg md:text-xl font-bold font-mono text-white tracking-tight">
                      {isUsd ? '$' : ''}
                      {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {!isUsd ? ' EGP' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAccount(acc);
                      }}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-emerald-500/20 text-white/70 hover:text-emerald-400 text-[11px] font-medium transition flex items-center gap-1 border border-white/10"
                      title="Edit & Monthly History"
                    >
                      <History size={12} />
                      <span>History</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAccount(acc.id);
                      }}
                      className="p-1.5 rounded bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition"
                      title="Delete Account"
                    >
                      <Trash2 size={13} />
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

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Trash2,
  ChevronDown,
  Check,
  X,
  Edit2,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Landmark,
  Calendar,
  DollarSign,
  FileText,
} from '@/components/ui/icon-library';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { formatUiLabel } from '@/lib/format-ui-label';
import { formatCleanAccountTitle } from '@/lib/format-bank-name';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

type LedgerTab = 'ALL' | 'EXPENSES' | 'INFLOWS' | 'TRANSFERS' | 'TRADING';

interface TransactionLedgerTableProps {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  categories: string[];
  onDeleteTransaction: (id: number) => void;
  onEditTransaction?: (tx: BankTransaction) => void;
  onLogTransaction?: () => void;
}

export default function TransactionLedgerTable({
  transactions,
  accounts,
  categories,
  onDeleteTransaction,
  onEditTransaction,
  onLogTransaction,
}: TransactionLedgerTableProps) {
  const { isPrivacy } = usePrivacyMode();
  const [activeTab, setActiveTab] = useState<LedgerTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [selectedTxForDrawer, setSelectedTxForDrawer] = useState<BankTransaction | null>(null);

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const accountOptions = useMemo(() => [
    { id: 'ALL', label: 'All Accounts' },
    ...accounts.map((a) => {
      const meta = formatCleanAccountTitle(a);
      return {
        id: String(a.id),
        label: `${meta.bankShort} (${meta.subName})`,
      };
    }),
  ], [accounts]);

  const activeAccountLabel = useMemo(() => {
    if (selectedAccountFilter === 'ALL') return 'All Accounts';
    const match = accountOptions.find((a) => a.id === selectedAccountFilter);
    return match ? match.label : 'Account';
  }, [selectedAccountFilter, accountOptions]);

  // Tab Filtering logic
  const isExpenseType = (type: string) =>
    type === 'EXPENSE' || type === 'WITHDRAWAL';
  const isInflowType = (type: string) =>
    type === 'INCOME' || type === 'DEPOSIT' || type === 'INTEREST' || type === 'YIELD';
  const isTransferType = (type: string) =>
    type === 'TRANSFER';
  const isTradingType = (type: string) =>
    type === 'BROKERAGE_BUY' ||
    type === 'BROKERAGE_SELL' ||
    type === 'BROKER_INJECTION' ||
    type === 'BROKER_WITHDRAWAL';

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Tab Category filter
      if (activeTab === 'EXPENSES' && !isExpenseType(tx.type)) return false;
      if (activeTab === 'INFLOWS' && !isInflowType(tx.type)) return false;
      if (activeTab === 'TRANSFERS' && !isTransferType(tx.type)) return false;
      if (activeTab === 'TRADING' && !isTradingType(tx.type)) return false;

      // Account filter
      if (selectedAccountFilter !== 'ALL' && String(tx.accountId) !== selectedAccountFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const notesMatch = tx.notes && tx.notes.toLowerCase().includes(q);
        const catMatch = tx.category && tx.category.toLowerCase().includes(q);
        const accMatch = tx.accountName && tx.accountName.toLowerCase().includes(q);
        const typeMatch = tx.type && tx.type.toLowerCase().includes(q);
        if (!notesMatch && !catMatch && !accMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [transactions, activeTab, selectedAccountFilter, searchQuery]);

  const formatMoney = (amount: number, currency: string = 'EGP', showSign: boolean = false): string => {
    if (isPrivacy) {
      const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
      return `${sign}•••••• ${currency === 'USD' ? '$' : '£'}`;
    }
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : '';
    return `${sign}${currency === 'USD' ? '$' : ''}${formatted}${currency !== 'USD' ? ' £' : ''}`;
  };

  return (
    <div className="w-full flex flex-col bg-[#000000] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl select-none">
      {/* 1. Screener-style Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 px-3 py-2 bg-[#141414] border-b border-[#2e2e2e]">
        {/* Left: Quick Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0 py-0.5">
          <div className="p-1 rounded text-[#8c8c8c] shrink-0 mr-0.5">
            <ArrowRightLeft size={14} />
          </div>

          {(
            [
              { id: 'ALL', label: 'All Activity' },
              { id: 'EXPENSES', label: 'Expenses' },
              { id: 'INFLOWS', label: 'Inflows' },
              { id: 'TRANSFERS', label: 'Transfers' },
              { id: 'TRADING', label: 'Trading & Brokerage' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#2e2e2e] text-white border border-[#3d3d3d] font-semibold'
                  : 'text-[#8c8c8c] hover:text-white font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Search + Account Selector + Log Transaction CTA */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Table Search Input */}
          <div className="relative flex items-center flex-1 sm:flex-none">
            <Search size={13} className="absolute left-2.5 text-[#8c8c8c] pointer-events-none" />
            <input
              type="text"
              placeholder="Filter notes, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full sm:w-44 bg-[#1f1f1f] border border-[#3d3d3d] rounded pl-7 pr-6 text-xs text-[#dbdbdb] placeholder:text-[#8c8c8c] focus:outline-none focus:border-[#2962ff]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 text-[#8c8c8c] hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Account Filter Dropdown */}
          <div className="relative" ref={accountDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
              className={`h-7 px-2.5 rounded bg-[#1f1f1f] border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedAccountFilter !== 'ALL'
                  ? 'border-[#2962ff] text-white font-medium'
                  : 'border-[#3d3d3d] text-[#8c8c8c] hover:text-white'
              }`}
            >
              <span className="truncate max-w-[120px]">{activeAccountLabel}</span>
              <ChevronDown size={12} className={`text-[#8c8c8c] transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAccountDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 max-h-56 overflow-y-auto rounded-lg bg-[#27272a] border border-[#3f3f46] p-1 shadow-2xl z-50 flex flex-col gap-0.5 custom-scrollbar">
                {accountOptions.map((opt) => {
                  const isSelected = selectedAccountFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountFilter(opt.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded text-left text-xs transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#2962ff]/20 text-white font-semibold'
                          : 'text-[#d1d4dc] hover:text-white hover:bg-[#3f3f46]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check size={12} className="text-[#089981] shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* + Log Transaction CTA Button */}
          {onLogTransaction && (
            <button
              type="button"
              onClick={onLogTransaction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2962ff] text-white hover:bg-[#1e53e5] transition-all shadow-xs cursor-pointer shrink-0"
              title="Log Transaction / Transfer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Desktop Screener Table (Hidden on Mobile) */}
      <div className="hidden sm:block w-full min-w-0 flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header: Exactly 44px height, uppercase muted labels with counts */}
          <thead className="sticky top-0 z-10 bg-[#000000] border-b border-[#2e2e2e] text-[#8c8c8c] font-normal text-[11px]">
            <tr className="h-[44px]">
              {/* Date & Count */}
              <th className="py-1 px-3 select-none min-w-[110px]">
                <div className="flex flex-col leading-tight">
                  <span className="text-[#8c8c8c]">Date</span>
                  <span className="text-[10px] text-[#707070] font-normal">
                    {filteredTransactions.length} entries
                  </span>
                </div>
              </th>

              {/* Account */}
              <th className="py-1 px-3 min-w-[150px]">
                <span>Account</span>
              </th>

              {/* Type */}
              <th className="py-1 px-3 min-w-[110px]">
                <span>Type</span>
              </th>

              {/* Category */}
              <th className="py-1 px-3 min-w-[140px]">
                <span>Category</span>
              </th>

              {/* Amount */}
              <th className="py-1 px-3 text-right min-w-[120px]">
                <span>Amount</span>
              </th>

              {/* Notes */}
              <th className="py-1 px-3 min-w-[180px]">
                <span>Notes &amp; Details</span>
              </th>

              {/* Actions */}
              <th className="py-1 px-3 text-right min-w-[80px]">
                <span>Action</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1f1f1f]">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-[#8c8c8c]">
                  No transactions found matching your filters.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const amt = Number(tx.amount);
                const isPositive = isInflowType(tx.type);
                const isTransfer = isTransferType(tx.type);
                const isUsd = tx.currency === 'USD';

                return (
                  <tr
                    key={tx.id}
                    className="h-[46px] hover:bg-[#1f1f1f]/80 transition-colors group select-none"
                  >
                    {/* Date */}
                    <td className="py-1.5 px-3 font-mono text-xs text-[#8c8c8c] whitespace-nowrap">
                      {tx.transactionDate}
                    </td>

                    {/* Account */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      {tx.accountName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white">
                            {formatCleanAccountTitle({ accountName: tx.accountName }).bankShort}
                          </span>
                          <span className="text-[11px] text-[#8c8c8c] truncate max-w-[130px]">
                            {formatCleanAccountTitle({ accountName: tx.accountName }).subName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#8c8c8c] text-xs">Account</span>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold tracking-wider ${
                          isTransfer
                            ? 'bg-[#2962ff]/15 text-[#5b9cf6] border border-[#2962ff]/30'
                            : isPositive
                            ? 'bg-[#22ab94]/15 text-[#22ab94] border border-[#22ab94]/30'
                            : 'bg-[#f7525f]/15 text-[#f7525f] border border-[#f7525f]/30'
                        }`}
                      >
                        {formatUiLabel(tx.type)}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-1.5 px-3 text-[#d1d4dc] text-xs font-medium whitespace-nowrap">
                      {tx.category || 'General'}
                    </td>

                    {/* Amount */}
                    <td className="py-1.5 px-3 text-right font-mono text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          isPositive
                            ? 'text-[#22ab94]'
                            : isTransfer
                            ? 'text-[#5b9cf6]'
                            : 'text-[#f7525f]'
                        }
                      >
                        {isPositive ? '+' : isTransfer ? '' : '-'}
                        {isUsd ? '$' : ''}
                        {isPrivacy ? '••••••' : amt.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        {!isUsd ? ' £' : ''}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="py-1.5 px-3 text-[#8c8c8c] text-xs truncate max-w-xs">
                      {tx.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditTransaction && (
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 rounded bg-[#2e2e2e] hover:bg-[#3d3d3d] text-[#8c8c8c] hover:text-white transition-all cursor-pointer"
                            title="Edit transaction details"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 rounded bg-[#2e2e2e] hover:bg-[#f7525f]/20 text-[#8c8c8c] hover:text-[#f7525f] transition-all cursor-pointer"
                          title="Delete entry & revert balance"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Mobile Simplified View (Phone-first 56px rows) */}
      <div className="block sm:hidden divide-y divide-[#1f1f1f]">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8c8c8c]">
            No transactions found matching your filters.
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const amt = Number(tx.amount);
            const isPositive = isInflowType(tx.type);
            const isTransfer = isTransferType(tx.type);
            const isUsd = tx.currency === 'USD';
            const cleanAcc = tx.accountName
              ? formatCleanAccountTitle({ accountName: tx.accountName })
              : { bankShort: 'Acc', subName: '' };

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTxForDrawer(tx)}
                className="h-[56px] px-3 flex items-center justify-between hover:bg-[#1f1f1f] active:bg-[#2e2e2e] transition-colors cursor-pointer select-none"
              >
                {/* Left: Indicator Square + Icon/Badge + Category/Account */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {/* Status Indicator Marker */}
                  <div
                    className={`w-1.5 h-4 rounded-[2px] mr-0.5 shrink-0 ${
                      isTransfer
                        ? 'bg-[#2962ff]'
                        : isPositive
                        ? 'bg-[#22ab94]'
                        : 'bg-[#f7525f]'
                    }`}
                  />

                  <div className="w-7 h-7 rounded-full bg-[#1f1f1f] border border-[#2e2e2e] shrink-0 flex items-center justify-center text-[10px] font-bold font-mono text-white/90">
                    {cleanAcc.bankShort.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-xs font-semibold text-white truncate">
                      {tx.category || 'Transaction'}
                    </span>
                    <span className="text-[10px] text-[#8c8c8c] truncate">
                      {cleanAcc.bankShort} · {tx.transactionDate}
                    </span>
                  </div>
                </div>

                {/* Right: Amount & Chevron */}
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <div className="flex flex-col items-end leading-tight">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isPositive
                          ? 'text-[#22ab94]'
                          : isTransfer
                          ? 'text-[#5b9cf6]'
                          : 'text-[#f7525f]'
                      }`}
                    >
                      {isPositive ? '+' : isTransfer ? '' : '-'}
                      {isUsd ? '$' : ''}
                      {isPrivacy ? '••••••' : amt.toLocaleString('en-US', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}
                      {!isUsd ? ' £' : ''}
                    </span>
                    <span className="text-[9px] text-[#707070] font-mono uppercase">
                      {formatUiLabel(tx.type)}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-[#707070]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Slide-Up Mobile Detail Drawer */}
      <AnimatePresence>
        {selectedTxForDrawer && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setSelectedTxForDrawer(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex flex-col rounded-t-2xl border-t border-[#2e2e2e] bg-[#141414] shadow-2xl max-h-[85dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-[#3d3d3d]" />
              </div>

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e] shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-4 rounded-[2px] ${
                      isTransferType(selectedTxForDrawer.type)
                        ? 'bg-[#2962ff]'
                        : isInflowType(selectedTxForDrawer.type)
                        ? 'bg-[#22ab94]'
                        : 'bg-[#f7525f]'
                    }`}
                  />
                  <span className="text-sm font-bold text-white">Transaction Details</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTxForDrawer(null)}
                  className="p-1 rounded-full text-[#8c8c8c] hover:text-white hover:bg-[#2e2e2e] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Amount Banner */}
              <div className="px-5 py-4 border-b border-[#2e2e2e] bg-[#000000]/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[#8c8c8c]">
                    Recorded Cash Impact
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tracking-tight mt-0.5 ${
                      isInflowType(selectedTxForDrawer.type)
                        ? 'text-[#22ab94]'
                        : isTransferType(selectedTxForDrawer.type)
                        ? 'text-[#5b9cf6]'
                        : 'text-[#f7525f]'
                    }`}
                  >
                    {isInflowType(selectedTxForDrawer.type) ? '+' : isTransferType(selectedTxForDrawer.type) ? '' : '-'}
                    {selectedTxForDrawer.currency === 'USD' ? '$' : ''}
                    {isPrivacy ? '••••••••' : Number(selectedTxForDrawer.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    {selectedTxForDrawer.currency !== 'USD' ? ' £' : ''}
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-mono font-semibold tracking-wider ${
                    isTransferType(selectedTxForDrawer.type)
                      ? 'bg-[#2962ff]/15 text-[#5b9cf6] border border-[#2962ff]/30'
                      : isInflowType(selectedTxForDrawer.type)
                      ? 'bg-[#22ab94]/15 text-[#22ab94] border border-[#22ab94]/30'
                      : 'bg-[#f7525f]/15 text-[#f7525f] border border-[#f7525f]/30'
                  }`}
                >
                  {formatUiLabel(selectedTxForDrawer.type)}
                </span>
              </div>

              {/* Details List */}
              <div className="flex flex-col divide-y divide-[#1f1f1f] px-5 py-2 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[#8c8c8c]">Category</span>
                  <span className="font-semibold text-white">{selectedTxForDrawer.category || 'General'}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[#8c8c8c]">Account</span>
                  <span className="font-semibold text-white">{selectedTxForDrawer.accountName || 'Connected Bank'}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[#8c8c8c]">Transaction Date</span>
                  <span className="font-mono text-white">{selectedTxForDrawer.transactionDate}</span>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[#8c8c8c]">Currency</span>
                  <span className="font-mono text-white">{selectedTxForDrawer.currency || 'EGP'}</span>
                </div>

                {selectedTxForDrawer.notes && (
                  <div className="py-2.5 flex flex-col gap-1">
                    <span className="text-[#8c8c8c]">Notes &amp; Description</span>
                    <p className="text-[#d1d4dc] bg-[#1f1f1f] p-2.5 rounded-lg border border-[#2e2e2e] leading-relaxed">
                      {selectedTxForDrawer.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Drawer Actions Footer */}
              <div className="px-5 py-4 border-t border-[#2e2e2e] flex items-center gap-2.5 shrink-0 bg-[#141414]">
                {onEditTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      const tx = selectedTxForDrawer;
                      setSelectedTxForDrawer(null);
                      onEditTransaction(tx);
                    }}
                    className="flex-1 h-10 rounded-lg bg-[#2962ff] text-white hover:bg-[#1e53e5] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 size={14} />
                    <span>Edit Transaction</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const id = selectedTxForDrawer.id;
                    setSelectedTxForDrawer(null);
                    onDeleteTransaction(id);
                  }}
                  className="h-10 px-4 rounded-lg bg-[#2e2e2e] hover:bg-[#f7525f]/20 text-[#8c8c8c] hover:text-[#f7525f] border border-[#3d3d3d] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

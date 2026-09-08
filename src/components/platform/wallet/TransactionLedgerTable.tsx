'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Search, Trash2, ChevronDown, Check, X, Filter, Edit2 } from '@/components/ui/icon-library';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { formatUiLabel } from '@/lib/format-ui-label';
import { formatCleanAccountTitle } from '@/lib/format-bank-name';

interface TransactionLedgerTableProps {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  categories: string[];
  onDeleteTransaction: (id: number) => void;
  onEditTransaction?: (tx: BankTransaction) => void;
}

// Custom Dropdown Popover Component
function LedgerFilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);
  const isFiltered = value !== 'ALL';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-sans transition-all cursor-pointer select-none ${
          isFiltered
            ? 'bg-white/[0.08] border-white/20 text-white font-medium shadow-sm'
            : 'bg-plt-card border-plt-border-soft hover:border-plt-border text-plt-text hover:bg-plt-hover'
        }`}
      >
        <span className="truncate max-w-[140px] font-sans">
          {selectedOption ? selectedOption.label : label}
        </span>
        <ChevronDown
          size={13}
          className={`text-plt-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-plt-text' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 min-w-[180px] max-h-60 overflow-y-auto bg-plt-base border border-plt-border rounded-xl shadow-2xl z-50 p-1 divide-y divide-plt-border-soft/40 custom-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-sans cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                  }`}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-plt-profit shrink-0" />}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TransactionLedgerTable({
  transactions,
  accounts,
  categories,
  onDeleteTransaction,
  onEditTransaction,
}: TransactionLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');

  const categoryOptions = [
    { id: 'ALL', label: 'All Categories' },
    ...categories.map((c) => ({ id: c, label: c })),
  ];

  const accountOptions = [
    { id: 'ALL', label: 'All Accounts' },
    ...accounts.map((a) => {
      const meta = formatCleanAccountTitle(a);
      return {
        id: String(a.id),
        label: `${meta.bankShort} (${meta.subName})`,
      };
    }),
  ];

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategoryFilter !== 'ALL' || selectedAccountFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('ALL');
    setSelectedAccountFilter('ALL');
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchQuery === '' ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.accountName && tx.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === 'ALL' || tx.category === selectedCategoryFilter;

    const matchesAccount =
      selectedAccountFilter === 'ALL' || String(tx.accountId) === selectedAccountFilter;

    return matchesSearch && matchesCategory && matchesAccount;
  });

  return (
    <div className="card-widget space-y-3 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-plt-border-soft">
        <div className="flex items-center gap-2">
          <h2 className="section-title">
            Transaction History & Cash Flow Ledger
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-plt-card border border-plt-border-soft text-plt-muted font-mono">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-plt-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes, categories, accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 w-48 sm:w-60 rounded-xl bg-plt-card border border-plt-border-soft hover:border-plt-border focus:border-plt-border-active focus:outline-none text-[11px] font-sans text-plt-text placeholder:text-plt-muted placeholder:text-[11px] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-plt-muted hover:text-plt-text rounded transition cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Custom Category Dropdown */}
          <LedgerFilterDropdown
            label="All Categories"
            value={selectedCategoryFilter}
            options={categoryOptions}
            onChange={setSelectedCategoryFilter}
          />

          {/* Custom Account Dropdown */}
          <LedgerFilterDropdown
            label="All Accounts"
            value={selectedAccountFilter}
            options={accountOptions}
            onChange={setSelectedAccountFilter}
          />

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 px-2.5 rounded-xl border border-plt-border-soft hover:border-plt-risk/30 hover:bg-plt-risk/10 text-plt-muted hover:text-plt-risk text-xs font-sans flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset all filters"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <div className="py-12 text-center text-xs text-plt-muted font-sans">
          No transaction entries found matching your filters.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto h-[380px] custom-scrollbar pt-1">
          <table className="w-full text-left text-xs border-separate border-spacing-y-1 font-sans">
            <thead className="sticky top-0 z-10 bg-plt-surface text-plt-muted font-sans font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3.5 first:rounded-l-lg">Date</th>
                <th className="py-2 px-3.5">Account</th>
                <th className="py-2 px-3.5">Type</th>
                <th className="py-2 px-3.5">Category</th>
                <th className="py-2 px-3.5 text-right">Amount</th>
                <th className="py-2 px-3.5">Notes</th>
                <th className="py-2 px-3.5 text-right last:rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const amt = Number(tx.amount);
                const isPositive = tx.type === 'INCOME' || tx.type === 'DEPOSIT' || tx.type === 'BROKER_WITHDRAWAL';
                const isTransfer = tx.type === 'TRANSFER';
                const isUsd = tx.currency === 'USD';

                return (
                  <tr key={tx.id} className="hover:bg-plt-hover/60 transition-colors group">
                    <td className="py-2.5 px-3.5 tabular-nums text-plt-subtle whitespace-nowrap first:rounded-l-xl">
                      {tx.transactionDate}
                    </td>
                    <td className="py-2.5 px-3.5 text-plt-text font-medium whitespace-nowrap">
                      {tx.accountName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-plt-text">
                            {formatCleanAccountTitle({ accountName: tx.accountName }).bankShort}
                          </span>
                          <span className="text-[11px] text-plt-muted truncate max-w-[130px]">
                            {formatCleanAccountTitle({ accountName: tx.accountName }).subName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-plt-muted text-xs">Account</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums font-semibold ${
                          isTransfer
                            ? 'bg-plt-info/10 text-plt-info'
                            : isPositive
                            ? 'bg-plt-profit/10 text-plt-profit'
                            : 'bg-plt-risk/10 text-plt-risk'
                        }`}
                      >
                        {formatUiLabel(tx.type)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-plt-muted whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums font-semibold whitespace-nowrap">
                      <span className={isPositive ? 'text-plt-profit' : isTransfer ? 'text-plt-info' : 'text-plt-risk'}>
                        {isPositive ? '+' : isTransfer ? '' : '-'}
                        {isUsd ? '$' : ''}
                        {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {!isUsd ? ' £' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-plt-muted text-[11px] truncate max-w-xs">
                      {tx.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right last:rounded-r-xl">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEditTransaction && (
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 rounded-md bg-plt-hover hover:bg-plt-info/20 text-plt-muted hover:text-plt-info transition-all cursor-pointer"
                            title="Edit transaction details"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 rounded-md bg-plt-hover hover:bg-plt-risk/20 text-plt-muted hover:text-plt-risk transition-all cursor-pointer"
                          title="Delete entry & revert balance"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

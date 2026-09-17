'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Search, Trash2, ChevronDown, Check, X, Filter, Edit2, SlidersHorizontal } from '@/components/ui/icon-library';
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
  options: { id: string; label: string }[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find((opt) => opt.id === value);

  return (
    <div className="relative font-sans text-xs" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer select-none ${
          value !== 'ALL'
            ? 'bg-plt-card border-plt-border-active text-plt-text font-medium shadow-xs'
            : 'bg-plt-card border-plt-border-soft text-plt-muted hover:text-plt-text hover:border-plt-border'
        }`}
      >
        <span className="truncate max-w-[130px]">
          {activeOption ? (value === 'ALL' ? label : activeOption.label) : label}
        </span>
        <ChevronDown size={12} className={`text-plt-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-48 max-h-60 overflow-y-auto rounded-xl bg-plt-card/95 border border-plt-border-strong p-1 shadow-2xl backdrop-blur-md z-50 flex flex-col gap-0.5 custom-scrollbar">
          {options.map((option) => {
            const isSelected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-plt-hover text-plt-text font-semibold'
                    : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover/60'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={12} className="text-plt-profit shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

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

        {/* Desktop Filters Toolbar (sm and up) */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
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

        {/* Mobile Search + Filters Split Pill (below sm) */}
        <div className="flex sm:hidden flex-col gap-2 w-full">
          <div className="flex items-stretch h-9 rounded-xl overflow-hidden border border-plt-border bg-plt-raised">
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-0 pl-3 flex items-center pointer-events-none text-plt-muted">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full bg-transparent pl-9 pr-3 text-[12px] text-plt-text placeholder:text-plt-muted focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 pr-3 flex items-center text-plt-muted hover:text-plt-text"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="w-px bg-plt-border shrink-0" />

            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="relative flex items-center gap-1.5 px-3.5 text-[12px] font-medium text-plt-muted hover:text-plt-text transition-colors shrink-0"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {(selectedCategoryFilter !== 'ALL' || selectedAccountFilter !== 'ALL') && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-plt-profit" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Filters Bottom Drawer */}
        {isMobileFiltersOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden animate-in fade-in duration-200"
            style={{ backgroundColor: 'var(--plt-overlay, rgba(0,0,0,0.7))' }}
            onClick={() => setIsMobileFiltersOpen(false)}
          >
            <div
              className="flex flex-col rounded-t-2xl border-t border-plt-border-strong bg-plt-surface shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[80dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-plt-border-strong" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-plt-border/40 shrink-0">
                <span className="text-sm font-bold text-plt-text">Transaction Filters</span>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1.5 rounded-full text-plt-muted hover:text-plt-text hover:bg-white/[0.08] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 px-5 py-4">
                {/* Category Filter */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2">
                    Category
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions.map((opt) => {
                      const isSelected = selectedCategoryFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(opt.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                            isSelected
                              ? 'bg-white/[0.15] text-white border-plt-border-strong font-semibold'
                              : 'text-plt-muted border-plt-border hover:text-plt-text hover:bg-white/[0.04]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Filter */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-plt-muted mb-2">
                    Account
                  </div>
                  <div className="flex flex-col gap-1">
                    {accountOptions.map((opt) => {
                      const isSelected = selectedAccountFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedAccountFilter(opt.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between cursor-pointer border ${
                            isSelected
                              ? 'bg-white/[0.12] text-white border-plt-border-strong font-semibold'
                              : 'text-plt-muted border-plt-border hover:text-plt-text hover:bg-white/[0.04]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} className="text-plt-profit shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-6 pt-2 flex items-center gap-2.5 shrink-0">
                {(selectedCategoryFilter !== 'ALL' || selectedAccountFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('ALL');
                      setSelectedAccountFilter('ALL');
                    }}
                    className="flex-1 h-11 rounded-xl bg-plt-card border border-plt-border text-xs font-semibold text-plt-muted hover:text-plt-text transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-plt-raised border border-plt-border-strong text-xs font-semibold text-plt-text hover:bg-plt-hover transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
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

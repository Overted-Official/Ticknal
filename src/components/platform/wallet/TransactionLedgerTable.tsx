'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Search, Trash2 } from 'lucide-react';
import { type BankAccount, type BankTransaction } from '@/types/bank';

interface TransactionLedgerTableProps {
  transactions: BankTransaction[];
  accounts: BankAccount[];
  categories: string[];
  onDeleteTransaction: (id: number) => void;
}

export default function TransactionLedgerTable({
  transactions,
  accounts,
  categories,
  onDeleteTransaction,
}: TransactionLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');

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
    <div className="glass-panel rounded-xl p-4 md:p-5 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
          Transaction History & Cash Flow Ledger
        </h2>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 w-36 sm:w-48"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL" className="bg-[#111]">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[#111]">{c}</option>
            ))}
          </select>

          {/* Account Filter */}
          <select
            value={selectedAccountFilter}
            onChange={(e) => setSelectedAccountFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL" className="bg-[#111]">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)} className="bg-[#111]">
                {a.accountName} ({a.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <div className="py-8 text-center text-xs text-white/40">
          No transaction entries found matching your filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-white/40 font-medium">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTransactions.map((tx) => {
                const amt = Number(tx.amount);
                const isPositive = tx.type === 'INCOME' || tx.type === 'DEPOSIT' || tx.type === 'BROKER_WITHDRAWAL';
                const isTransfer = tx.type === 'TRANSFER';
                const isUsd = tx.currency === 'USD';

                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-2.5 px-3 font-mono text-white/60 whitespace-nowrap">
                      {tx.transactionDate}
                    </td>
                    <td className="py-2.5 px-3 text-white font-medium whitespace-nowrap">
                      {tx.accountName || 'Bank Account'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                          isTransfer
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white/70 whitespace-nowrap">
                      {tx.category}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          isTransfer
                            ? 'text-sky-400'
                            : isPositive
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {isTransfer ? '↔ ' : isPositive ? '+ ' : '- '}
                        {isUsd ? '$' : ''}
                        {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {!isUsd ? ' EGP' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white/40 max-w-xs truncate">
                      {tx.notes || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1 rounded text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Delete Transaction"
                      >
                        <Trash2 size={12} />
                      </button>
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

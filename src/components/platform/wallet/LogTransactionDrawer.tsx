'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, X, Check } from 'lucide-react';
import { type BankAccount } from '@/types/bank';
import { useToast } from '@/context/ToastContext';

interface LogTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  categories: string[];
  onTransactionLogged: () => void;
}

export default function LogTransactionDrawer({
  isOpen,
  onClose,
  accounts,
  categories,
  onTransactionLogged,
}: LogTransactionDrawerProps) {
  const { toast } = useToast();
  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0].id) : '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'EGP');
  const [category, setCategory] = useState(categories[0] || 'Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !amount || Number(amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a positive transaction amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/banks/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: Number(accountId),
          toAccountId: txMode === 'TRANSFER' && toAccountId ? Number(toAccountId) : null,
          type: txMode,
          amount: Number(amount),
          currency,
          category: txMode === 'TRANSFER' ? 'Internal Transfer' : category,
          transactionDate,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success(
          'Transaction Recorded',
          `${txMode === 'TRANSFER' ? 'Transfer' : txMode} of ${Number(amount).toLocaleString()} ${currency} completed.`
        );
        onTransactionLogged();
        onClose();
        setAmount('');
        setNotes('');
      } else {
        toast.error('Transaction Failed', 'Could not record the transaction. Please try again.');
      }
    } catch (err) {
      console.error('Failed to log transaction:', err);
      toast.error('Network Error', 'Could not reach server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Sliding Sheet / Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-[#0e0e0e] border-l border-white/10 shadow-2xl flex flex-col h-full z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Log Transaction</h3>
                  <p className="text-[11px] text-white/40">Record transfers, expenses, income & cash flows</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="p-4 border-b border-white/10 bg-white/[0.01]">
              <div className="grid grid-cols-4 gap-1.5 bg-white/5 p-1 rounded-lg text-xs font-semibold text-center">
                <button
                  type="button"
                  onClick={() => setTxMode('EXPENSE')}
                  className={`py-1.5 rounded-md transition ${
                    txMode === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('INCOME')}
                  className={`py-1.5 rounded-md transition ${
                    txMode === 'INCOME'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('TRANSFER')}
                  className={`py-1.5 rounded-md transition ${
                    txMode === 'TRANSFER'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('BROKER_INJECTION')}
                  className={`py-1.5 rounded-md transition ${
                    txMode === 'BROKER_INJECTION'
                      ? 'bg-plt-orange text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  To Stocks
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Account Selection */}
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">
                  {txMode === 'TRANSFER' ? 'From Account (Source)' : 'Bank Account'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    const sel = accounts.find((a) => String(a.id) === e.target.value);
                    if (sel) setCurrency(sel.currency);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)} className="bg-[#111]">
                      {a.accountName} ({a.currency}) - Bal: {Number(a.balance).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account (Transfers only) */}
              {txMode === 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">To Account (Destination)</label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-[#111]">-- Select Destination Account --</option>
                    {accounts
                      .filter((a) => String(a.id) !== accountId)
                      .map((a) => (
                        <option key={a.id} value={String(a.id)} className="bg-[#111]">
                          {a.accountName} ({a.currency})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Date</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Category (if not transfer) */}
              {txMode !== 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#111]">{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Salary wire, Monthly rent, Grocery trip"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <Check size={15} strokeWidth={2.5} />
                  {isSubmitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

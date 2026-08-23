'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, X, Check } from '@/components/ui/icon-library';
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
            className="fixed inset-0 bg-plt-base/75 backdrop-blur-sm"
          />

          {/* Sliding Sheet / Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-plt-base border-l border-plt-border-soft shadow-2xl flex flex-col h-full z-10 select-none"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">Log Transaction</h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Record transfers, expenses, income & cash flows</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                title="Close drawer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-4 py-2.5 bg-plt-card/50 border-b border-plt-border-soft shrink-0">
              <div className="pill-switch w-full">
                <button
                  type="button"
                  onClick={() => setTxMode('EXPENSE')}
                  className={`pill-switch-btn flex-1 ${
                    txMode === 'EXPENSE' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('INCOME')}
                  className={`pill-switch-btn flex-1 ${
                    txMode === 'INCOME' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('TRANSFER')}
                  className={`pill-switch-btn flex-1 ${
                    txMode === 'TRANSFER' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('BROKER_INJECTION')}
                  className={`pill-switch-btn flex-1 ${
                    txMode === 'BROKER_INJECTION' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  To Stocks
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {/* Account Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">
                  {txMode === 'TRANSFER' ? 'From Account (Source)' : 'Bank Account'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    const sel = accounts.find((a) => String(a.id) === e.target.value);
                    if (sel) setCurrency(sel.currency);
                  }}
                  className="select-token"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.accountName} ({a.currency}) - Bal: {Number(a.balance).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account (Transfers only) */}
              {txMode === 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">To Account (Destination)</label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="select-token"
                  >
                    <option value="">-- Select Destination Account --</option>
                    {accounts
                      .filter((a) => String(a.id) !== accountId)
                      .map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.accountName} ({a.currency})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-token"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Date</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="date-token"
                  />
                </div>
              </div>

              {/* Category (if not transfer) */}
              {txMode !== 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="select-token"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Salary wire, Monthly rent, Grocery trip"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-token"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-plt-border-soft flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-token btn-secondary btn-compact font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-token btn-primary btn-compact font-sans"
                >
                  <Check size={14} strokeWidth={2.5} />
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

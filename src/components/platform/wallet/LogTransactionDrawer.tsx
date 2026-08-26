'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, X, Check } from '@/components/ui/icon-library';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { useToast } from '@/context/ToastContext';
import AccountSelectDropdown from './AccountSelectDropdown';

interface LogTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  categories: string[];
  onTransactionLogged: () => void;
  transactionToEdit?: BankTransaction | null;
}

export default function LogTransactionDrawer({
  isOpen,
  onClose,
  accounts,
  categories,
  onTransactionLogged,
  transactionToEdit,
}: LogTransactionDrawerProps) {
  const { toast } = useToast();
  const isEditMode = Boolean(transactionToEdit);

  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0].id) : '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'EGP');
  const [category, setCategory] = useState(categories[0] || 'Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    if (transactionToEdit) {
      setTxMode((transactionToEdit.type as any) || 'EXPENSE');
      setAccountId(String(transactionToEdit.accountId));
      setToAccountId(transactionToEdit.toAccountId ? String(transactionToEdit.toAccountId) : '');
      setAmount(String(transactionToEdit.amount));
      setCurrency(transactionToEdit.currency || 'EGP');
      setCategory(transactionToEdit.category || categories[0] || 'Living & Bills');
      setTransactionDate(transactionToEdit.transactionDate || new Date().toISOString().split('T')[0]);
      setNotes(transactionToEdit.notes || '');
    } else {
      setTxMode('EXPENSE');
      setAccountId(accounts[0] ? String(accounts[0].id) : '');
      setToAccountId('');
      setAmount('');
      setCurrency(accounts[0]?.currency || 'EGP');
      setCategory(categories[0] || 'Living & Bills');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, transactionToEdit, accounts, categories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !amount || Number(amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a positive transaction amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/banks/transactions', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditMode && transactionToEdit ? { id: transactionToEdit.id } : {}),
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
          isEditMode ? 'Transaction Updated' : 'Transaction Recorded',
          `${txMode === 'TRANSFER' ? 'Transfer' : txMode} of ${Number(amount).toLocaleString()} ${currency} ${isEditMode ? 'updated' : 'completed'}.`
        );
        onTransactionLogged();
        onClose();
        setAmount('');
        setNotes('');
      } else {
        toast.error('Transaction Failed', 'Could not save the transaction. Please try again.');
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
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">
                  {isEditMode ? 'Edit Transaction' : 'Log Transaction'}
                </h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">
                  {isEditMode ? 'Modify transaction details & recalculate balances' : 'Record transfers, expenses, income & cash flows'}
                </p>
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
                <AccountSelectDropdown
                  accounts={accounts}
                  selectedAccountId={accountId}
                  onSelectAccount={(accId) => {
                    setAccountId(accId);
                    const sel = accounts.find((a) => String(a.id) === accId);
                    if (sel) setCurrency(sel.currency);
                  }}
                  placeholder="Select source bank account..."
                />
              </div>

              {/* Destination Account (Transfers only) */}
              {txMode === 'TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">To Account (Destination)</label>
                  <AccountSelectDropdown
                    accounts={accounts}
                    selectedAccountId={toAccountId}
                    onSelectAccount={setToAccountId}
                    excludeAccountId={accountId}
                    placeholder="Select destination bank account..."
                  />
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
                  {isSubmitting ? (isEditMode ? 'Saving...' : 'Recording...') : (isEditMode ? 'Save Changes' : 'Record Transaction')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

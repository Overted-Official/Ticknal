'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, X, Check, ChevronDown } from '@/components/ui/icon-library';
import { type BankAccount, type BankTransaction } from '@/types/bank';
import { useToast } from '@/context/ToastContext';
import useSWR from 'swr';
import AccountSelectDropdown from './AccountSelectDropdown';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LogTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts?: BankAccount[];
  categories?: string[];
  onTransactionLogged: () => void;
  transactionToEdit?: BankTransaction | null;
}

const modeDescriptions: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'Outflow from the selected account for living, bills, or operational costs.',
  INCOME: 'Inflow adding liquid cash to your selected bank or treasury balance.',
  TRANSFER: 'Move capital between two accounts without altering overall net worth.',
  BROKER_INJECTION: 'Inject funds directly into your brokerage account to back stock purchases.',
};

export default function LogTransactionDrawer({
  isOpen,
  onClose,
  accounts = [],
  categories = ['Living & Bills'],
  onTransactionLogged,
  transactionToEdit,
}: LogTransactionDrawerProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fallback to fetch accounts dynamically if not provided by parent
  const { data: fetchedAccountsData } = useSWR<{ accounts: BankAccount[] }>(
    isOpen && (!accounts || accounts.length === 0) ? '/api/banks/accounts' : null,
    fetcher
  );
  const resolvedAccounts = accounts && accounts.length > 0 ? accounts : (fetchedAccountsData?.accounts ?? []);

  const isEditMode = Boolean(transactionToEdit);
  const defaultAccount = resolvedAccounts.find((a) => a.isDefaultExpense) || resolvedAccounts[0];

  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>(defaultAccount ? String(defaultAccount.id) : '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultAccount?.currency || 'EGP');
  const [category, setCategory] = useState(categories[0] || 'Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
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
      const defAcc = resolvedAccounts.find((a) => a.isDefaultExpense) || resolvedAccounts[0];
      setTxMode('EXPENSE');
      if (defAcc) {
        setAccountId(String(defAcc.id));
        setCurrency(defAcc.currency || 'EGP');
      }
      setToAccountId('');
      setAmount('');
      setCategory(categories[0] || 'Living & Bills');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, transactionToEdit, resolvedAccounts, categories]);

  // Handle case where resolvedAccounts arrives after drawer opens
  useEffect(() => {
    if (isOpen && !transactionToEdit && resolvedAccounts.length > 0 && !accountId) {
      const defAcc = resolvedAccounts.find((a) => a.isDefaultExpense) || resolvedAccounts[0];
      if (defAcc) {
        setAccountId(String(defAcc.id));
        setCurrency(defAcc.currency || 'EGP');
      }
    }
  }, [isOpen, transactionToEdit, resolvedAccounts, accountId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !amount || Number(amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a positive transaction amount.');
      return;
    }

    if (txMode === 'TRANSFER' && (!toAccountId || toAccountId === accountId)) {
      toast.warning('Invalid Destination', 'Please select a different destination account for transfers.');
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
          `${txMode === 'TRANSFER' ? 'Transfer' : txMode === 'BROKER_INJECTION' ? 'Broker Transfer' : txMode} of ${Number(amount).toLocaleString()} ${currency} ${isEditMode ? 'updated' : 'completed'}.`
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="log-transaction-drawer-overlay" className="drawer-overlay">
          {/* Backdrop */}
          <motion.div
            key="log-transaction-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="drawer-backdrop"
            aria-label="Close drawer overlay"
          />

          {/* Drawer Sheet */}
          <motion.div
            key="log-transaction-drawer-sheet"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="drawer-sheet-form"
          >
            {/* Top Brand Accent Hairline */}
            <div className="drawer-brand-hairline" />

            {/* Header */}
            <div className="drawer-header">
              {/* Mobile Drag Pill */}
              <div
                className="drawer-drag-pill-container"
                onClick={onClose}
                aria-label="Drag handle to close"
              >
                <div className="drawer-drag-pill" />
              </div>

              {/* Main Header Row */}
              <div className="drawer-header-row">
                <div className="drawer-header-brand">
                  <div className="drawer-header-icon-box">
                    <ArrowRightLeft className="drawer-header-icon" />
                  </div>
                  <div className="drawer-header-titles">
                    <h2 className="drawer-title">
                      {isEditMode ? 'Edit Transaction' : 'Log Transaction'}
                    </h2>
                    <p className="drawer-subtitle">
                      {isEditMode
                        ? 'Modify transaction details & recalculate account balances'
                        : 'Record transfers, expenses, income & cash flows'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="drawer-close-btn"
                  aria-label="Close drawer"
                  title="Close drawer"
                >
                  <X className="drawer-close-icon" />
                </button>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="drawer-mode-bar">
              <div className="pill-switch pill-switch-full">
                <button
                  type="button"
                  onClick={() => setTxMode('EXPENSE')}
                  className={`pill-switch-btn ${txMode === 'EXPENSE' ? 'pill-switch-btn-active' : ''}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('INCOME')}
                  className={`pill-switch-btn ${txMode === 'INCOME' ? 'pill-switch-btn-active' : ''}`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('TRANSFER')}
                  className={`pill-switch-btn ${txMode === 'TRANSFER' ? 'pill-switch-btn-active' : ''}`}
                >
                  Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setTxMode('BROKER_INJECTION')}
                  className={`pill-switch-btn ${txMode === 'BROKER_INJECTION' ? 'pill-switch-btn-active' : ''}`}
                >
                  To Stocks
                </button>
              </div>
            </div>

            {/* Form wrapping body and sticky footer */}
            <form onSubmit={handleSubmit} className="drawer-form">
              <div className="drawer-body custom-scrollbar drawer-form-fields">
                {/* Mode Hint Info Card */}
                <div className="drawer-info-card">
                  <div className="drawer-info-dot" />
                  <p className="drawer-info-text">{modeDescriptions[txMode]}</p>
                </div>

                {/* Source Account Selection */}
                <div className="drawer-form-field">
                  <label className="field-label">
                    {txMode === 'TRANSFER' ? 'From Account (Source) *' : 'Account *'}
                  </label>
                  <AccountSelectDropdown
                    accounts={resolvedAccounts}
                    selectedAccountId={accountId}
                    onSelectAccount={(accId) => {
                      setAccountId(accId);
                      const sel = resolvedAccounts.find((a) => String(a.id) === accId);
                      if (sel) setCurrency(sel.currency);
                    }}
                    placeholder="Select source bank account..."
                  />
                </div>

                {/* Destination Account Selection (Transfers only) */}
                {txMode === 'TRANSFER' && (
                  <div className="drawer-form-field">
                    <label className="field-label">To Account (Destination) *</label>
                    <AccountSelectDropdown
                      accounts={resolvedAccounts}
                      selectedAccountId={toAccountId}
                      onSelectAccount={setToAccountId}
                      excludeAccountId={accountId}
                      placeholder="Select destination bank account..."
                    />
                  </div>
                )}

                {/* Amount & Date 2-Column Grid */}
                <div className="drawer-form-grid-2">
                  <div className="drawer-form-field">
                    <label className="field-label">Amount ({currency}) *</label>
                    <div className="field-group">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="field-input"
                      />
                      <span className="field-suffix">{currency}</span>
                    </div>
                  </div>

                  <div className="drawer-form-field">
                    <label className="field-label">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="field-date-input"
                    />
                  </div>
                </div>

                {/* Category (Non-transfers) */}
                {txMode !== 'TRANSFER' && (
                  <div className="drawer-form-field">
                    <label className="field-label">Category</label>
                    <div className="field-select-wrapper">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="field-select-input"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c} className="field-select-option">
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="field-select-chevron" />
                    </div>
                  </div>
                )}

                {/* Notes / Description */}
                <div className="drawer-form-field">
                  <label className="field-label">Notes / Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Salary wire, Monthly rent, Grocery trip"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="field-text-input"
                  />
                </div>
              </div>

              {/* Drawer Footer with standardized buttons */}
              <div className="drawer-footer">
                <button
                  type="button"
                  onClick={onClose}
                  className="drawer-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="drawer-confirm-btn"
                >
                  <Check className="drawer-btn-icon" strokeWidth={2.5} />
                  <span>
                    {isSubmitting
                      ? isEditMode ? 'Saving...' : 'Recording...'
                      : isEditMode
                      ? 'Save Changes'
                      : txMode === 'TRANSFER'
                      ? 'Transfer Funds'
                      : 'Record Transaction'}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  TrendingUp,
  Search,
  Check,
  ChevronDown,
} from '@/components/ui/icon-library';
import { useToast } from '@/context/ToastContext';
import { type BankAccount } from '@/types/bank';
import AccountSelectDropdown from './wallet/AccountSelectDropdown';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Dining',
  'Salary & Income',
  'Interest & Yield',
  'Trading Injection',
  'Trading Withdrawal',
  'Savings & CD',
  'Investments',
  'Subscriptions',
  'Healthcare',
  'Transport',
  'Entertainment',
  'Other',
];

const modeDescriptions: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'Outflow from selected bank account for living, bills, or operational costs.',
  INCOME: 'Inflow adding liquid cash to your selected bank or treasury balance.',
  TRANSFER: 'Move capital between two accounts without altering overall net worth.',
  BROKER_INJECTION: 'Inject funds directly into your brokerage account to back stock purchases.',
};

type Ticker = {
  symbol: string;
  companyName: string;
  sector?: string;
  logoUrl?: string | null;
};

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickAddDrawer({ isOpen, onClose, onSuccess }: QuickAddDrawerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Active Tab Switch: 'transaction' | 'position'
  const [activeSwitch, setActiveSwitch] = useState<'transaction' | 'position'>('transaction');

  // --- 1. Transaction Form State ---
  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [category, setCategory] = useState('Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // --- 2. Position Form State ---
  const [positionSymbol, setPositionSymbol] = useState('');
  const [positionDate, setPositionDate] = useState(new Date().toISOString().split('T')[0]);
  const [positionPrice, setPositionPrice] = useState('');
  const [positionQty, setPositionQty] = useState('100');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  const [isTickerDropdownOpen, setIsTickerDropdownOpen] = useState(false);
  const tickerSearchRef = useRef<HTMLDivElement>(null);

  // SWR: Bank Accounts
  const { data: accountsData, mutate: mutateAccounts } = useSWR<{ accounts: BankAccount[] }>(
    isOpen ? '/api/banks/accounts' : null,
    fetcher
  );
  const accounts = accountsData?.accounts ?? [];

  // SWR: Tickers
  const { data: tickersData } = useSWR<Ticker[]>(isOpen ? '/api/tickers' : null, fetcher);
  const tickers = Array.isArray(tickersData) ? tickersData : [];

  // Setup mounted and responsive listener
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const def = accounts.find((a) => a.isDefaultExpense) || accounts[0];
      if (def) {
        setAccountId(String(def.id));
        setCurrency(def.currency || 'EGP');
      }
    }
  }, [accounts, accountId]);

  // Sync currency when account changes
  const handleAccountChange = (accIdStr: string) => {
    setAccountId(accIdStr);
    const selected = accounts.find((a) => String(a.id) === accIdStr);
    if (selected) {
      setCurrency(selected.currency || 'EGP');
    }
  };

  // Close ticker dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tickerSearchRef.current && !tickerSearchRef.current.contains(event.target as Node)) {
        setIsTickerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tickers for search
  const filteredTickers = (tickers || [])
    .filter(
      (t) =>
        t.symbol.toLowerCase().includes(positionSymbol.toLowerCase()) ||
        t.companyName.toLowerCase().includes(positionSymbol.toLowerCase())
    )
    .slice(0, 30);

  // --- Submit Handlers ---

  // 1. Submit Bank Transaction
  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) {
      toast.warning('Select Account', 'Please select a bank account.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a positive transaction amount.');
      return;
    }
    if (txMode === 'TRANSFER' && (!toAccountId || toAccountId === accountId)) {
      toast.warning('Invalid Destination', 'Please select a different destination account for transfers.');
      return;
    }

    setIsSubmittingTx(true);
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
          category:
            txMode === 'TRANSFER'
              ? 'Internal Transfer'
              : txMode === 'BROKER_INJECTION'
              ? 'Trading Injection'
              : category,
          transactionDate,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success(
          'Transaction Logged',
          `${txMode === 'INCOME' ? '+' : txMode === 'EXPENSE' ? '-' : ''}${Number(amount).toLocaleString()} ${currency} recorded.`
        );
        mutateAccounts();
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
        // Reset form
        setAmount('');
        setNotes('');
      } else {
        const data = await res.json();
        toast.error('Logging Failed', data.error || 'Failed to log transaction.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection Error', 'Failed to reach server.');
    } finally {
      setIsSubmittingTx(false);
    }
  }

  // 2. Submit Investment Position
  async function handlePositionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!positionSymbol.trim()) {
      toast.warning('Ticker Required', 'Please select or enter an EGX ticker symbol.');
      return;
    }
    if (!positionPrice || Number(positionPrice) <= 0) {
      toast.warning('Invalid Price', 'Please enter a valid entry price.');
      return;
    }
    if (!positionQty || Number(positionQty) <= 0) {
      toast.warning('Invalid Quantity', 'Please enter a valid share quantity.');
      return;
    }

    setIsSubmittingPos(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: positionSymbol.trim().toUpperCase(),
          entryDate: positionDate,
          entryPrice: Number(positionPrice),
          quantity: Number(positionQty),
        }),
      });

      if (res.ok) {
        toast.success(
          'Position Created',
          `Added ${positionQty} shares of ${positionSymbol.toUpperCase()} at ${Number(positionPrice).toFixed(2)} EGP.`
        );
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
        // Reset form
        setPositionSymbol('');
        setPositionPrice('');
        setPositionQty('100');
      } else {
        toast.error('Position Failed', 'Failed to add position.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error', 'Error adding position.');
    } finally {
      setIsSubmittingPos(false);
    }
  }

  const positionTotalVal = (Number(positionPrice) || 0) * (Number(positionQty) || 0);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="quick-add-drawer-overlay" className="drawer-overlay">
          {/* Backdrop */}
          <motion.div
            key="quick-add-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="drawer-backdrop"
            aria-label="Close quick action drawer overlay"
          />

          {/* Drawer Sheet (Desktop: Right-to-Left | Mobile: Bottom-to-Top) */}
          <motion.div
            key="quick-add-drawer-sheet"
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
                    {activeSwitch === 'transaction' ? (
                      <ArrowRightLeft className="drawer-header-icon" />
                    ) : (
                      <TrendingUp className="drawer-header-icon" />
                    )}
                  </div>
                  <div className="drawer-header-titles">
                    <h2 className="drawer-title">
                      {activeSwitch === 'transaction' ? 'Quick Ledger Transaction' : 'Quick Stock Position'}
                    </h2>
                    <p className="drawer-subtitle">
                      {activeSwitch === 'transaction'
                        ? 'Record banking expenses, inflows, transfers & cashflows'
                        : 'Log buy execution for an EGX stock position'}
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

            {/* 2-Way Tab Switcher */}
            <div className="drawer-mode-bar">
              <div className="pill-switch pill-switch-full">
                <button
                  type="button"
                  onClick={() => setActiveSwitch('transaction')}
                  className={`pill-switch-btn flex items-center justify-center gap-1.5 ${
                    activeSwitch === 'transaction' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Add Transaction</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSwitch('position')}
                  className={`pill-switch-btn flex items-center justify-center gap-1.5 ${
                    activeSwitch === 'position' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Add Position</span>
                </button>
              </div>
            </div>

            {/* TAB 1: BANK TRANSACTION */}
            {activeSwitch === 'transaction' && (
              <form onSubmit={handleTransactionSubmit} className="drawer-form">
                <div className="drawer-body custom-scrollbar drawer-form-fields">
                  {/* Mode Hint Info Card */}
                  <div className="drawer-info-card">
                    <div className="drawer-info-dot" />
                    <p className="drawer-info-text">{modeDescriptions[txMode]}</p>
                  </div>

                  {/* Transaction Type Segmented Control */}
                  <div className="drawer-form-field">
                    <label className="field-label">Transaction Type</label>
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

                  {/* Account Selection */}
                  <div className="drawer-form-field">
                    <label className="field-label">
                      {txMode === 'TRANSFER' ? 'From Account (Source) *' : 'Account *'}
                    </label>
                    {accounts.length === 0 ? (
                      <div className="drawer-info-card">
                        <div className="drawer-info-dot" />
                        <p className="drawer-info-text">No accounts found. Please add a bank account first.</p>
                      </div>
                    ) : (
                      <AccountSelectDropdown
                        accounts={accounts}
                        selectedAccountId={accountId}
                        onSelectAccount={handleAccountChange}
                        placeholder="Select bank account..."
                      />
                    )}
                  </div>

                  {/* Destination Account (If Transfer) */}
                  {txMode === 'TRANSFER' && (
                    <div className="drawer-form-field">
                      <label className="field-label">To Account (Destination) *</label>
                      <AccountSelectDropdown
                        accounts={accounts}
                        selectedAccountId={toAccountId}
                        onSelectAccount={setToAccountId}
                        excludeAccountId={accountId}
                        placeholder="Select destination bank account..."
                      />
                    </div>
                  )}

                  {/* Amount & Date Grid */}
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
                      <label className="field-label">Date *</label>
                      <input
                        type="date"
                        required
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="field-date-input"
                      />
                    </div>
                  </div>

                  {/* Category (if not transfer) */}
                  {txMode !== 'TRANSFER' && (
                    <div className="drawer-form-field">
                      <label className="field-label">Category</label>
                      <div className="field-select-wrapper">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="field-select-input"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c} className="field-select-option">
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="field-select-chevron w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Notes / Description */}
                  <div className="drawer-form-field">
                    <label className="field-label">Notes & Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Salary wire, Monthly rent, Grocery trip"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="field-text-input"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
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
                    disabled={isSubmittingTx}
                    className="drawer-confirm-btn"
                  >
                    <Check className="drawer-btn-icon" />
                    <span>{isSubmittingTx ? 'Recording...' : 'Record Transaction'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: POSITION FORM */}
            {activeSwitch === 'position' && (
              <form onSubmit={handlePositionSubmit} className="drawer-form">
                <div className="drawer-body custom-scrollbar drawer-form-fields">
                  {/* Position Info Card */}
                  <div className="drawer-info-card">
                    <div className="drawer-info-dot" />
                    <p className="drawer-info-text">
                      Enter execution details for your stock buy. Position will immediately reflect in your portfolio.
                    </p>
                  </div>

                  {/* EGX Ticker Search */}
                  <div className="drawer-form-field relative" ref={tickerSearchRef}>
                    <label className="field-label">EGX Ticker Symbol *</label>
                    <div className="field-group relative">
                      <Search className="w-3.5 h-3.5 text-text-muted shrink-0 mr-2" />
                      <input
                        type="text"
                        required
                        placeholder="Search ticker (e.g. COMI, ABUK, HRHO)..."
                        value={positionSymbol}
                        onChange={(e) => {
                          setPositionSymbol(e.target.value.toUpperCase());
                          setIsTickerDropdownOpen(true);
                        }}
                        onFocus={() => setIsTickerDropdownOpen(true)}
                        className="field-input uppercase"
                      />
                    </div>

                    {/* Auto-suggest Dropdown */}
                    {isTickerDropdownOpen && filteredTickers.length > 0 && (
                      <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-48 overflow-y-auto bg-black border border-white/10 rounded-xl shadow-2xl z-50 divide-y divide-white/[0.06] custom-scrollbar">
                        {filteredTickers.map((t) => (
                          <button
                            key={t.symbol}
                            type="button"
                            onClick={() => {
                              setPositionSymbol(t.symbol);
                              setIsTickerDropdownOpen(false);
                            }}
                            className="w-full p-2.5 hover:bg-white/[0.04] flex items-center justify-between transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-text-primary text-xs font-sans">
                                {t.symbol}
                              </span>
                              <span className="text-text-muted text-[11px] truncate max-w-[180px] font-sans">
                                {t.companyName}
                              </span>
                            </div>
                            {t.sector && (
                              <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 font-sans shrink-0">
                                {t.sector}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price & Quantity Grid */}
                  <div className="drawer-form-grid-2">
                    <div className="drawer-form-field">
                      <label className="field-label">Entry Price (EGP) *</label>
                      <div className="field-group">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="0.00"
                          value={positionPrice}
                          onChange={(e) => setPositionPrice(e.target.value)}
                          className="field-input"
                        />
                        <span className="field-suffix">EGP</span>
                      </div>
                    </div>

                    <div className="drawer-form-field">
                      <label className="field-label">Quantity (Shares) *</label>
                      <div className="field-group">
                        <input
                          type="number"
                          step="1"
                          required
                          placeholder="100"
                          value={positionQty}
                          onChange={(e) => setPositionQty(e.target.value)}
                          className="field-input"
                        />
                        <span className="field-suffix">Shares</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Position Value Preview Card */}
                  {positionTotalVal > 0 && (
                    <div className="field-card">
                      <span className="field-label">Estimated Position Value</span>
                      <span className="text-sm font-bold text-text-primary tabular-nums font-sans">
                        {positionTotalVal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        EGP
                      </span>
                    </div>
                  )}

                  {/* Entry Date */}
                  <div className="drawer-form-field">
                    <label className="field-label">Entry Date *</label>
                    <input
                      type="date"
                      required
                      value={positionDate}
                      onChange={(e) => setPositionDate(e.target.value)}
                      className="field-date-input"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
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
                    disabled={isSubmittingPos}
                    className="drawer-confirm-btn"
                  >
                    <TrendingUp className="drawer-btn-icon" />
                    <span>{isSubmittingPos ? 'Creating...' : 'Create Stock Position'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

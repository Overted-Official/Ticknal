'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Landmark,
  Search,
  Check,
  Calendar,
  DollarSign,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
} from '@/components/ui/icon-library';
import { useToast } from '@/context/ToastContext';
import { type BankAccount } from '@/types/bank';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CATEGORIES = [
  'Living & Bills',
  'Housing & Rent',
  'Food & Groceries',
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

type Ticker = { symbol: string; companyName: string; sector?: string; logoUrl?: string | null };

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickAddDrawer({ isOpen, onClose, onSuccess }: QuickAddDrawerProps) {
  const { toast } = useToast();
  const router = useRouter();

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

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(String(accounts[0].id));
      setCurrency(accounts[0].currency || 'EGP');
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
    .slice(0, 40);

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
          category: txMode === 'TRANSFER' ? 'Internal Transfer' : category,
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

  const selectedAccount = accounts.find((a) => String(a.id) === accountId);
  const positionTotalVal = (Number(positionPrice) || 0) * (Number(positionQty) || 0);

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

          {/* Slide-over Drawer / Sheet */}
          <motion.div
            initial={{ y: '100%', md: { x: '100%', y: 0 } } as any}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', md: { x: '100%', y: 0 } } as any}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full max-w-lg bg-plt-base border-t md:border-t-0 md:border-l border-plt-border-soft shadow-2xl flex flex-col max-h-drawer-mobile md:max-h-full h-full z-10 select-none mt-auto md:mt-0"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">Quick Action</h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Record a ledger entry or buy new stock shares</p>
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

            {/* 2-WAY SWITCHER TABS */}
            <div className="px-4 py-2.5 bg-plt-card/50 border-b border-plt-border-soft shrink-0">
              <div className="pill-switch w-full">
                <button
                  type="button"
                  onClick={() => setActiveSwitch('transaction')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeSwitch === 'transaction' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <ArrowRightLeft size={14} />
                  <span>Add Transaction</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSwitch('position')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeSwitch === 'position' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>Add Position</span>
                </button>
              </div>
            </div>

            {/* CONTENT BODY */}
            <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4 custom-scrollbar">
              {/* TAB 1: BANK TRANSACTION */}
              {activeSwitch === 'transaction' && (
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  {/* Transaction Type Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Transaction Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTxMode('EXPENSE')}
                        className={`h-8 rounded-xl font-medium flex items-center justify-center gap-1.5 transition text-xs font-sans ${
                          txMode === 'EXPENSE'
                            ? 'bg-plt-risk/15 border border-plt-risk/30 text-plt-risk font-semibold'
                            : 'bg-plt-card border border-plt-border-soft text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                        <ArrowUpRight size={14} />
                        <span>Expense</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTxMode('INCOME')}
                        className={`h-8 rounded-xl font-medium flex items-center justify-center gap-1.5 transition text-xs font-sans ${
                          txMode === 'INCOME'
                            ? 'bg-plt-profit/15 border border-plt-profit/30 text-plt-profit font-semibold'
                            : 'bg-plt-card border border-plt-border-soft text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                        <ArrowDownLeft size={14} />
                        <span>Income</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTxMode('TRANSFER')}
                        className={`h-8 rounded-xl font-medium flex items-center justify-center gap-1.5 transition text-xs font-sans ${
                          txMode === 'TRANSFER'
                            ? 'bg-plt-info/15 border border-plt-info/30 text-plt-info font-semibold'
                            : 'bg-plt-card border border-plt-border-soft text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                        }`}
                      >
                        <ArrowRightLeft size={14} />
                        <span>Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">
                      {txMode === 'TRANSFER' ? 'From Bank Account' : 'Bank Account'} *
                    </label>
                    {accounts.length === 0 ? (
                      <div className="p-3 rounded-xl bg-plt-warning/10 border border-plt-warning/20 text-plt-warning text-xs font-sans">
                        No accounts found. Please add a bank account first.
                      </div>
                    ) : (
                      <select
                        required
                        value={accountId}
                        onChange={(e) => handleAccountChange(e.target.value)}
                        className="select-token"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountName} ({acc.bankName || 'Bank'}) — {Number(acc.balance).toLocaleString()} {acc.currency}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Destination Account (If Transfer) */}
                  {txMode === 'TRANSFER' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">To Destination Account *</label>
                      <select
                        required
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="select-token"
                      >
                        <option value="">Select Destination Account...</option>
                        {accounts
                          .filter((a) => String(a.id) !== accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.accountName} ({acc.bankName || 'Bank'}) — {Number(acc.balance).toLocaleString()} {acc.currency}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Amount & Currency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Amount *</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input-token flex-1"
                      />
                      <div className="h-8 px-3 flex items-center justify-center rounded-xl bg-plt-card border border-plt-border-soft text-xs font-sans text-plt-muted">
                        {currency}
                      </div>
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
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Date</label>
                      <input
                        type="date"
                        required
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="date-token"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Notes / Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Salary wire, Monthly rent, Grocery trip"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-token"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-plt-border-soft">
                    <button
                      type="submit"
                      disabled={isSubmittingTx}
                      className="btn-token btn-primary w-full h-9 flex items-center justify-center gap-2 font-sans"
                    >
                      <Check size={14} strokeWidth={2.5} />
                      <span>{isSubmittingTx ? 'Recording Transaction...' : 'Record Transaction'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------- 2. POSITION FORM ---------------- */}
              {activeSwitch === 'position' && (
                <form onSubmit={handlePositionSubmit} className="space-y-4">
                  {/* Ticker Search & Select */}
                  <div className="space-y-1.5 relative" ref={tickerSearchRef}>
                    <label className="text-xs font-semibold text-plt-muted font-sans">EGX Ticker Symbol *</label>
                    <div className="relative">
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
                        className="input-token pl-8"
                      />
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-plt-muted" />
                    </div>

                    {/* Dropdown Results */}
                    {isTickerDropdownOpen && filteredTickers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#121216] border border-white/[0.14] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 divide-y divide-white/[0.08] custom-scrollbar">
                        {filteredTickers.map((t) => (
                          <div
                            key={t.symbol}
                            onClick={() => {
                              setPositionSymbol(t.symbol);
                              setIsTickerDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-plt-hover cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-plt-text text-xs font-sans">{t.symbol}</span>
                              <span className="text-plt-muted text-[11px] truncate max-w-50 font-sans">{t.companyName}</span>
                            </div>
                            {t.sector && (
                              <span className="text-[10px] text-plt-muted px-1.5 py-0.5 rounded bg-plt-base border border-plt-border-soft font-sans">
                                {t.sector}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price & Quantity Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Entry Price (EGP) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={positionPrice}
                        onChange={(e) => setPositionPrice(e.target.value)}
                        className="input-token"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Quantity (Shares) *</label>
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="100"
                        value={positionQty}
                        onChange={(e) => setPositionQty(e.target.value)}
                        className="input-token"
                      />
                    </div>
                  </div>

                  {/* Position Total Market Value Preview */}
                  {positionTotalVal > 0 && (
                    <div className="card-widget-compact flex items-center justify-between">
                      <div className="kpi-title">Total Position Value</div>
                      <div className="kpi-value text-plt-text font-bold">
                        {positionTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                      </div>
                    </div>
                  )}

                  {/* Entry Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Entry Date</label>
                    <input
                      type="date"
                      required
                      value={positionDate}
                      onChange={(e) => setPositionDate(e.target.value)}
                      className="date-token"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-plt-border-soft">
                    <button
                      type="submit"
                      disabled={isSubmittingPos}
                      className="btn-token btn-primary w-full h-9 flex items-center justify-center gap-2 font-sans"
                    >
                      <TrendingUp size={14} />
                      <span>{isSubmittingPos ? 'Creating Position...' : 'Create Stock Position'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

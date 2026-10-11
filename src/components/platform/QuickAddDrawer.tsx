'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Plus,
  Minus,
  ExternalLink,
  RefreshCw,
} from '@/components/ui/icon-library';
import { useToast } from '@/context/ToastContext';
import { type BankAccount } from '@/types/bank';
import AccountSelectDropdown from './wallet/AccountSelectDropdown';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { useTranslation } from '@/lib/i18n';
import { getThndrTradeUrl } from '@/lib/thndr';

interface AddedPositionSummary {
  symbol: string;
  price: number;
  quantity: number;
  totalValue: number;
  date: string;
  accountName: string;
  isVirtual: boolean;
  thndrUrl: string;
}

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

const CATEGORIES_MAP_AR: Record<string, string> = {
  'Living & Bills': 'المعيشة والفواتير',
  'Housing & Rent': 'السكن والإيجار',
  'Food & Dining': 'الطعام والمطاعم',
  'Salary & Income': 'الراتب والدخل',
  'Interest & Yield': 'الفوائد والعوائد',
  'Trading Injection': 'إيداع للتداول',
  'Trading Withdrawal': 'سحب من التداول',
  'Savings & CD': 'المدخرات والشهادات',
  'Investments': 'الاستثمارات',
  'Subscriptions': 'الاشتراكات والخدمات',
  'Healthcare': 'الرعاية الصحية',
  'Transport': 'المواصلات والانتقالات',
  'Entertainment': 'الترفيه',
  'Other': 'أخرى',
};

const modeDescriptions: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'Outflow from selected bank account for living, bills, or operational costs.',
  INCOME: 'Inflow adding liquid cash to your selected bank or treasury balance.',
  TRANSFER: 'Move capital between two accounts without altering overall net worth.',
  BROKER_INJECTION: 'Inject funds directly into your brokerage account to back stock purchases.',
};

const modeDescriptionsAr: Record<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION', string> = {
  EXPENSE: 'خصم من الحساب البنكي المختار لمصاريف المعيشة والفواتير والتكاليف التشغيلية.',
  INCOME: 'إيداع سيولة نقدية في رصيد الحساب البنكي أو الخزينة المحددة.',
  TRANSFER: 'تحويل رأس المال بين حسابين دون التأثير على إجمالي صافي الثروة.',
  BROKER_INJECTION: 'تحويل أموال مباشرة إلى حساب الوساطة لتمويل شراء الأسهم.',
};

type Ticker = {
  symbol: string;
  companyName: string;
  sector?: string;
  logoUrl?: string | null;
  currency?: string;
  price?: number;
  change?: number;
  changePct?: number;
};

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'transaction' | 'position';
}

export default function QuickAddDrawer({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'transaction',
}: QuickAddDrawerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Active Tab Switch: 'transaction' | 'position'
  const [activeSwitch, setActiveSwitch] = useState<'transaction' | 'position'>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setActiveSwitch(initialMode);
    } else {
      setShowSuccessModal(false);
      setAddedPosition(null);
      setIsTickerSelected(false);
    }
  }, [isOpen, initialMode]);

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
  const [positionAccountId, setPositionAccountId] = useState<string>('');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  const [isTickerDropdownOpen, setIsTickerDropdownOpen] = useState(false);
  const [isTickerSelected, setIsTickerSelected] = useState(false);
  const tickerSearchRef = useRef<HTMLDivElement>(null);

  // Success Modal State (with Thndr Order Redirect)
  const [addedPosition, setAddedPosition] = useState<AddedPositionSummary | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Stepper adjustments for Price and Quantity
  const adjustPrice = (delta: number) => {
    const current = parseFloat(positionPrice) || 0;
    const next = Math.max(0.01, current + delta);
    setPositionPrice(next.toFixed(2));
  };

  const adjustQty = (delta: number) => {
    const current = parseInt(positionQty, 10) || 0;
    const next = Math.max(1, current + delta);
    setPositionQty(String(next));
  };

  const addQtyPreset = (amount: number) => {
    const current = parseInt(positionQty, 10) || 0;
    setPositionQty(String(Math.max(1, current + amount)));
  };


  // SWR: Bank Accounts
  const { data: accountsData, mutate: mutateAccounts } = useSWR<{ accounts: BankAccount[] }>(
    isOpen ? '/api/banks/accounts' : null,
    fetcher
  );
  const accounts: BankAccount[] = accountsData?.accounts ?? [];

  // Filter for brokerage accounts
  const brokerageAccounts = useMemo(() => {
    return accounts.filter(
      (a: BankAccount) => !a.isArchived && ['BROKERAGE', 'BROKER_CASH'].includes(a.accountType)
    );
  }, [accounts]);

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
      const def = accounts.find((a: BankAccount) => a.isDefaultExpense) || accounts[0];
      if (def) {
        setAccountId(String(def.id));
        setCurrency(def.currency || 'EGP');
      }
    }
  }, [accounts, accountId]);

  // Set default brokerage account for stock positions
  useEffect(() => {
    if (brokerageAccounts.length > 0 && !positionAccountId) {
      const def = brokerageAccounts.find((a: BankAccount) => a.isDefaultExpense) || brokerageAccounts[0];
      if (def) {
        setPositionAccountId(String(def.id));
      }
    }
  }, [brokerageAccounts, positionAccountId]);

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

  // Selected Ticker Details
  const selectedTicker = useMemo(() => {
    if (!positionSymbol.trim()) return null;
    const clean = positionSymbol.trim().toUpperCase();
    return (
      (tickers || []).find((t) => {
        const symClean = t.symbol.replace('.CA', '').toUpperCase();
        return symClean === clean || t.symbol.toUpperCase() === clean;
      }) || null
    );
  }, [tickers, positionSymbol]);

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
    if (!positionAccountId) {
      toast.warning('Brokerage Account Required', 'Please select a funded brokerage account.');
      return;
    }

    const selectedAccount = brokerageAccounts.find((a: BankAccount) => String(a.id) === positionAccountId);
    const isVirtual = selectedAccount ? isVirtualAccount(selectedAccount) : false;
    const requiredAmount = Number(positionPrice) * Number(positionQty);
    if (selectedAccount && !isVirtual && Number(selectedAccount.balance) < requiredAmount) {
      toast.error(
        'Insufficient Cash',
        `Account has ${Number(selectedAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${selectedAccount.currency || 'EGP'} available, but ${requiredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} is required.`
      );
      return;
    }

    setIsSubmittingPos(true);
    try {
      const res = await fetch('/api/portfolio/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUY',
          accountId: Number(positionAccountId),
          symbol: positionSymbol.trim().toUpperCase(),
          date: positionDate,
          price: Number(positionPrice),
          quantity: Number(positionQty),
          entrySource: 'CHART',
        }),
      });

      if (res.ok) {
        toast.success(
          isVirtual ? 'Virtual Position Opened' : 'Live Position Opened',
          isVirtual
            ? `Tracked ${positionQty} shares of ${positionSymbol.toUpperCase()} at ${Number(positionPrice).toFixed(2)} EGP with Virtual Account. Automated sell alerts active.`
            : `Bought ${positionQty} shares of ${positionSymbol.toUpperCase()} at ${Number(positionPrice).toFixed(2)} EGP. Brokerage balance debited.`
        );
        mutateAccounts();
        if (onSuccess) onSuccess();
        router.refresh();

        const cleanSym = positionSymbol.trim().toUpperCase();
        const priceNum = Number(positionPrice);
        const qtyNum = Number(positionQty);
        const { url: thndrUrl } = getThndrTradeUrl(cleanSym, locale as 'ar' | 'en');

        setAddedPosition({
          symbol: cleanSym,
          price: priceNum,
          quantity: qtyNum,
          totalValue: priceNum * qtyNum,
          date: positionDate,
          accountName: selectedAccount
            ? (selectedAccount.accountName || selectedAccount.customBankName || selectedAccount.bankName || (locale === 'ar' ? `حساب ${selectedAccount.id}` : `Account ${selectedAccount.id}`))
            : (locale === 'ar' ? 'حساب الوساطة' : 'Brokerage Account'),
          isVirtual,
          thndrUrl,
        });
        setShowSuccessModal(true);

        // Reset form
        setPositionSymbol('');
        setPositionPrice('');
        setPositionQty('100');
        setIsTickerSelected(false);
      } else {
        const data = await res.json().catch(() => null);
        toast.error('Position Failed', data?.error || 'Failed to add position.');
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
    <>
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
            initial={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: isRTL ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`drawer-sheet-form ${!isMobile ? 'drawer-sheet-viewport-safe' : ''} rtl:border-l-0 rtl:border-r`}
          >
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
                      {activeSwitch === 'transaction'
                        ? (locale === 'ar' ? 'معاملة دفتر الأستاذ السريعة' : 'Quick Ledger Transaction')
                        : (locale === 'ar' ? 'تسجيل صفقة سريعة' : 'Quick Stock Position')}
                    </h2>
                    <p className="drawer-subtitle">
                      {activeSwitch === 'transaction'
                        ? (locale === 'ar' ? 'تسجيل المصروفات، الإيداعات، التحويلات والتدفقات النقدية' : 'Record banking expenses, inflows, transfers & cashflows')
                        : (locale === 'ar' ? 'تسجيل تنفيذ شراء لصفقة في البورصة المصرية' : 'Log buy execution for an EGX stock position')}
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
            <div className="px-4 sm:px-6 py-2 border-b border-white/10 shrink-0 bg-black">
              <div className="w-full grid grid-cols-2 p-0.5 bg-white/[0.04] border border-white/10 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSwitch('transaction')}
                  className={`h-7.5 px-3 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeSwitch === 'transaction'
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{locale === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSwitch('position')}
                  className={`h-7.5 px-3 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeSwitch === 'position'
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{locale === 'ar' ? 'إضافة صفقة' : 'Add Position'}</span>
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
                    <p className="drawer-info-text">{locale === 'ar' ? modeDescriptionsAr[txMode] : modeDescriptions[txMode]}</p>
                  </div>

                  {/* Transaction Type Segmented Control */}
                  <div className="drawer-form-field">
                    <label className="field-label">{locale === 'ar' ? 'نوع المعاملة' : 'Transaction Type'}</label>
                    <div className="w-full grid grid-cols-4 p-0.5 bg-white/[0.04] border border-white/10 rounded-lg gap-0.5">
                      <button
                        type="button"
                        onClick={() => setTxMode('EXPENSE')}
                        className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer text-center flex items-center justify-center ${
                          txMode === 'EXPENSE'
                            ? 'bg-white/15 text-white font-semibold shadow-sm'
                            : 'text-text-muted hover:text-white hover:bg-white/[0.04] font-medium'
                        }`}
                      >
                        {locale === 'ar' ? 'مصروف' : 'Expense'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('INCOME')}
                        className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer text-center flex items-center justify-center ${
                          txMode === 'INCOME'
                            ? 'bg-white/15 text-white font-semibold shadow-sm'
                            : 'text-text-muted hover:text-white hover:bg-white/[0.04] font-medium'
                        }`}
                      >
                        {locale === 'ar' ? 'دخل' : 'Income'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('TRANSFER')}
                        className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer text-center flex items-center justify-center ${
                          txMode === 'TRANSFER'
                            ? 'bg-white/15 text-white font-semibold shadow-sm'
                            : 'text-text-muted hover:text-white hover:bg-white/[0.04] font-medium'
                        }`}
                      >
                        {locale === 'ar' ? 'تحويل' : 'Transfer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('BROKER_INJECTION')}
                        className={`h-7 px-1.5 rounded-md text-[11px] transition-all cursor-pointer text-center flex items-center justify-center ${
                          txMode === 'BROKER_INJECTION'
                            ? 'bg-white/15 text-white font-semibold shadow-sm'
                            : 'text-text-muted hover:text-white hover:bg-white/[0.04] font-medium'
                        }`}
                      >
                        {locale === 'ar' ? 'إلى الأسهم' : 'To Stocks'}
                      </button>
                    </div>
                  </div>

                  {/* Account Selection */}
                  <div className="drawer-form-field">
                    <label className="field-label">
                      {txMode === 'TRANSFER'
                        ? (locale === 'ar' ? 'من حساب (المصدر) *' : 'From Account (Source) *')
                        : (locale === 'ar' ? 'الحساب *' : 'Account *')}
                    </label>
                    {accounts.length === 0 ? (
                      <div className="drawer-info-card">
                        <div className="drawer-info-dot" />
                        <p className="drawer-info-text">
                          {locale === 'ar' ? 'لم يتم العثور على حسابات. يرجى إضافة حساب بنكي أولاً.' : 'No accounts found. Please add a bank account first.'}
                        </p>
                      </div>
                    ) : (
                      <AccountSelectDropdown
                        accounts={accounts}
                        selectedAccountId={accountId}
                        onSelectAccount={handleAccountChange}
                        placeholder={locale === 'ar' ? 'اختر حساب بنكي...' : 'Select bank account...'}
                      />
                    )}
                  </div>

                  {/* Destination Account (If Transfer) */}
                  {txMode === 'TRANSFER' && (
                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'إلى حساب (الوجهة) *' : 'To Account (Destination) *'}</label>
                      <AccountSelectDropdown
                        accounts={accounts}
                        selectedAccountId={toAccountId}
                        onSelectAccount={setToAccountId}
                        excludeAccountId={accountId}
                        placeholder={locale === 'ar' ? 'اختر حساب بنكي مستلم...' : 'Select destination bank account...'}
                      />
                    </div>
                  )}

                  {/* Amount & Date Grid */}
                  <div className="drawer-form-grid-2">
                    <div className="drawer-form-field">
                      <label className="field-label">
                        {locale === 'ar' ? `المبلغ (${currency === 'EGP' ? 'ج.م' : currency}) *` : `Amount (${currency}) *`}
                      </label>
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
                        <span className="field-suffix">{currency === 'EGP' && locale === 'ar' ? 'ج.م' : currency}</span>
                      </div>
                    </div>

                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'التاريخ *' : 'Date *'}</label>
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
                      <label className="field-label">{locale === 'ar' ? 'التصنيف' : 'Category'}</label>
                      <div className="field-select-wrapper">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="field-select-input"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c} className="field-select-option">
                              {locale === 'ar' ? (CATEGORIES_MAP_AR[c] || c) : c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="field-select-chevron w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Notes / Description */}
                  <div className="drawer-form-field">
                    <label className="field-label">{locale === 'ar' ? 'ملاحظات ووصف' : 'Notes & Description'}</label>
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'مثال: راتب شهري، إيجار، مشتريات' : 'e.g. Salary wire, Monthly rent, Grocery trip'}
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
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTx}
                    className="drawer-confirm-btn"
                  >
                    <Check className="drawer-btn-icon" />
                    <span>{isSubmittingTx ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (locale === 'ar' ? 'تسجيل المعاملة' : 'Record Transaction')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: POSITION FORM */}
            {activeSwitch === 'position' && (
              <form onSubmit={handlePositionSubmit} className="drawer-form">
                <div className="drawer-body custom-scrollbar drawer-form-fields">
                  {/* EGX Ticker Search or Selected Card */}
                  <div className="drawer-form-field relative" ref={tickerSearchRef}>
                    <label className="field-label">{locale === 'ar' ? 'سهم البورصة المصرية *' : 'EGX Ticker *'}</label>

                    {isTickerSelected && (selectedTicker || positionSymbol) ? (
                      /* Rich Selected Ticker View: Logo, Full Name, Symbol, Price & Change Action */
                      <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Profile Image / Avatar */}
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            {selectedTicker?.logoUrl ? (
                              <img
                                src={selectedTicker.logoUrl}
                                alt={positionSymbol}
                                className="w-full h-full object-contain rounded-full"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-[11px] font-bold text-white font-sans tabular-nums">
                                {positionSymbol.slice(0, 2)}
                              </span>
                            )}
                          </div>

                          {/* Company Name, Symbol Badge & Sector / Price */}
                          <div className="min-w-0 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="font-semibold text-white text-xs sm:text-sm truncate font-sans leading-tight"
                                title={selectedTicker?.companyName || positionSymbol}
                              >
                                {selectedTicker?.companyName || positionSymbol}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-white/10 border border-white/15 tabular-nums font-sans shrink-0 leading-tight">
                                {positionSymbol}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 min-w-0 text-[11px] text-text-muted font-sans">
                              {selectedTicker?.sector && (
                                <span className="truncate">{selectedTicker.sector}</span>
                              )}
                              {selectedTicker?.price !== undefined && selectedTicker.price > 0 && (
                                <>
                                  {selectedTicker?.sector && <span className="text-white/30">•</span>}
                                  <span className="tabular-nums font-medium text-white/80">
                                    {Number(selectedTicker.price).toFixed(2)}{' '}
                                    <span className="text-[10px] text-white/40">
                                      {selectedTicker.currency === 'EGP' && locale === 'ar' ? 'ج.م' : selectedTicker.currency || 'EGP'}
                                    </span>
                                  </span>
                                  {selectedTicker.changePct !== undefined && selectedTicker.changePct !== 0 && (
                                    <span
                                      className={`tabular-nums font-medium ${
                                        selectedTicker.changePct > 0 ? 'text-profit-num' : 'text-loss-num'
                                      }`}
                                    >
                                      {selectedTicker.changePct > 0 ? '+' : ''}
                                      {Number(selectedTicker.changePct).toFixed(2)}%
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Change Ticker Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsTickerSelected(false);
                            setIsTickerDropdownOpen(true);
                          }}
                          className="h-7 px-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          title={locale === 'ar' ? 'تغيير السهم' : 'Change ticker'}
                        >
                          <RefreshCw className="w-3 h-3 text-white/60" />
                          <span>{locale === 'ar' ? 'تغيير' : 'Change'}</span>
                        </button>
                      </div>
                    ) : (
                      /* Search Input + Dropdown */
                      <>
                        <div className="field-group relative">
                          <Search className="w-3.5 h-3.5 text-text-muted shrink-0 me-2" />
                          <input
                            type="text"
                            required
                            placeholder={locale === 'ar' ? 'ابحث عن سهم (مثل COMI، ABUK، HRHO)...' : 'Search ticker (e.g. COMI, ABUK, HRHO)...'}
                            value={positionSymbol}
                            onChange={(e) => {
                              setPositionSymbol(e.target.value.toUpperCase());
                              setIsTickerDropdownOpen(true);
                            }}
                            onFocus={() => setIsTickerDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredTickers.length > 0) {
                                  const top = filteredTickers[0];
                                  const clean = top.symbol.replace('.CA', '').toUpperCase();
                                  setPositionSymbol(clean);
                                  if (top.price && top.price > 0 && !positionPrice) {
                                    setPositionPrice(String(top.price));
                                  }
                                  setIsTickerSelected(true);
                                  setIsTickerDropdownOpen(false);
                                } else if (positionSymbol.trim()) {
                                  setIsTickerSelected(true);
                                  setIsTickerDropdownOpen(false);
                                }
                              }
                            }}
                            className="field-input uppercase"
                          />
                          {positionSymbol && (
                            <button
                              type="button"
                              onClick={() => {
                                setPositionSymbol('');
                                setIsTickerDropdownOpen(false);
                              }}
                              className="p-1 text-white/40 hover:text-white transition-colors"
                              title={locale === 'ar' ? 'مسح' : 'Clear'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Auto-suggest Dropdown */}
                        {isTickerDropdownOpen && filteredTickers.length > 0 && (
                          <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-60 overflow-y-auto bg-black border border-white/10 rounded-xl shadow-2xl z-50 divide-y divide-white/[0.04] custom-scrollbar p-1">
                            {filteredTickers.map((t) => {
                              const clean = t.symbol.replace('.CA', '').toUpperCase();
                              const priceNum = t.price || 0;
                              return (
                                <button
                                  key={t.symbol}
                                  type="button"
                                  onClick={() => {
                                    setPositionSymbol(clean);
                                    if (priceNum > 0 && !positionPrice) {
                                      setPositionPrice(String(priceNum));
                                    }
                                    setIsTickerSelected(true);
                                    setIsTickerDropdownOpen(false);
                                  }}
                                  className="w-full px-2.5 py-2 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-lg flex items-center justify-between transition-colors text-left rtl:text-right cursor-pointer gap-2.5"
                                >
                                  {/* Left: small logo + 2-row text info */}
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                      {t.logoUrl ? (
                                        <img
                                          src={t.logoUrl}
                                          alt={clean}
                                          className="w-full h-full object-contain rounded-full"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <span className="text-[10px] font-bold text-white/80 font-sans">
                                          {clean.slice(0, 2)}
                                        </span>
                                      )}
                                    </div>

                                    <div className="min-w-0 flex flex-col flex-1">
                                      <span className="font-medium text-white text-xs truncate font-sans leading-tight" title={t.companyName}>
                                        {t.companyName || clean}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white bg-white/10 border border-white/15 tabular-nums font-sans shrink-0 leading-tight">
                                          {clean}
                                        </span>
                                        {t.sector && (
                                          <>
                                            <span className="text-[10px] text-white/30 shrink-0">•</span>
                                            <span className="text-[10px] text-white/50 truncate font-sans">
                                              {t.sector}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Latest price + optional change % */}
                                  <div className="flex flex-col items-end shrink-0 pl-2 rtl:pl-0 rtl:pr-2 font-sans tabular-nums text-right rtl:text-left">
                                    {priceNum > 0 ? (
                                      <>
                                        <span className="text-xs font-semibold text-white">
                                          {priceNum.toFixed(2)}{' '}
                                          <span className="text-[10px] text-white/40 font-normal">
                                            {t.currency === 'EGP' && locale === 'ar' ? 'ج.م' : t.currency || 'EGP'}
                                          </span>
                                        </span>
                                        {t.changePct !== undefined && t.changePct !== 0 && (
                                          <span
                                            className={`text-[10px] font-medium ${
                                              t.changePct > 0 ? 'text-profit-num' : 'text-loss-num'
                                            }`}
                                          >
                                            {t.changePct > 0 ? '+' : ''}{Number(t.changePct).toFixed(2)}%
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs text-white/30 font-medium">—</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Brokerage Account Selection */}
                  <div className="drawer-form-field">
                    <label className="field-label">{locale === 'ar' ? 'حساب التداول والوساطة *' : 'Brokerage Account *'}</label>
                    {brokerageAccounts.length === 0 ? (
                      <div className="drawer-info-card">
                        <div className="drawer-info-dot" />
                        <p className="drawer-info-text">
                          {locale === 'ar' ? (
                            <>
                              لم يتم العثور على حساب تداول. يرجى إضافة حساب تداول بالجنيه في{' '}
                              <a href="/wallet?tab=transactions" className="underline font-semibold">
                                السيولة والمعاملات
                              </a>{' '}
                              أولاً.
                            </>
                          ) : (
                            <>
                              No brokerage account found. Please add an EGP brokerage account in{' '}
                              <a href="/wallet?tab=transactions" className="underline font-semibold">
                                Cash &amp; Transactions
                              </a>{' '}
                              first.
                            </>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="field-select-wrapper">
                        <select
                          required
                          value={positionAccountId}
                          onChange={(e) => setPositionAccountId(e.target.value)}
                          className="field-select-input"
                        >
                          {brokerageAccounts.map((b: BankAccount) => (
                            <option key={b.id} value={b.id} className="field-select-option">
                              {isVirtualAccount(b)
                                ? `✨ ${locale === 'ar' ? 'حساب افتراضي (تداول تجريبي)' : 'Virtual Account (Paper Trading)'} · ${Number(b.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${b.currency === 'EGP' && locale === 'ar' ? 'ج.م' : b.currency || 'EGP'} ${locale === 'ar' ? 'رصيد تجريبي' : 'paper cash'}`
                                : `${b.accountName || b.customBankName || b.bankName || (locale === 'ar' ? `حساب ${b.id}` : `Account ${b.id}`)} · ${Number(b.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${b.currency === 'EGP' && locale === 'ar' ? 'ج.م' : b.currency || 'EGP'} ${locale === 'ar' ? 'متاح' : 'available'}`}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="field-select-chevron w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Entry Date (Positioned right after Brokerage Account) */}
                  <div className="drawer-form-field">
                    <label className="field-label">{locale === 'ar' ? 'تاريخ الدخول *' : 'Entry Date *'}</label>
                    <input
                      type="date"
                      required
                      value={positionDate}
                      onChange={(e) => setPositionDate(e.target.value)}
                      className="field-date-input"
                    />
                  </div>

                  {/* Price & Quantity Grid with Incremental Steppers */}
                  <div className="drawer-form-grid-2">
                    {/* Entry Price */}
                    <div className="drawer-form-field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="field-label mb-0">{locale === 'ar' ? 'سعر الدخول (ج.م) *' : 'Entry Price (EGP) *'}</label>
                        <span className="text-[10px] text-text-muted font-sans tabular-nums">
                          {locale === 'ar' ? 'خطوة: 0.10' : 'Step: 0.10'}
                        </span>
                      </div>
                      <div className="flex items-center rounded-lg border border-white/10 bg-black overflow-hidden focus-within:border-white/25 transition-colors">
                        <button
                          type="button"
                          onClick={() => adjustPrice(-0.1)}
                          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors shrink-0 cursor-pointer border-r border-white/10 rtl:border-r-0 rtl:border-l"
                          title={locale === 'ar' ? 'إنقاص السعر 0.10' : 'Decrease price by 0.10'}
                          aria-label="Decrease price"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={positionPrice}
                          onChange={(e) => setPositionPrice(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-center font-sans font-semibold text-sm text-white px-2 py-2 focus:outline-none tabular-nums"
                        />
                        <span className="text-[11px] font-medium text-text-muted px-1 shrink-0 font-sans select-none">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustPrice(0.1)}
                          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors shrink-0 cursor-pointer border-l border-white/10 rtl:border-l-0 rtl:border-r"
                          title={locale === 'ar' ? 'زيادة السعر 0.10' : 'Increase price by 0.10'}
                          aria-label="Increase price"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="drawer-form-field">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="field-label mb-0">{locale === 'ar' ? 'الكمية (أسهم) *' : 'Quantity (Shares) *'}</label>
                        <span className="text-[10px] text-text-muted font-sans tabular-nums">
                          {locale === 'ar' ? 'خطوة: 10' : 'Step: 10'}
                        </span>
                      </div>
                      <div className="flex items-center rounded-lg border border-white/10 bg-black overflow-hidden focus-within:border-white/25 transition-colors">
                        <button
                          type="button"
                          onClick={() => adjustQty(-10)}
                          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors shrink-0 cursor-pointer border-r border-white/10 rtl:border-r-0 rtl:border-l"
                          title={locale === 'ar' ? 'إنقاص الكمية 10' : 'Decrease shares by 10'}
                          aria-label="Decrease shares"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          placeholder="100"
                          value={positionQty}
                          onChange={(e) => setPositionQty(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-center font-sans font-semibold text-sm text-white px-2 py-2 focus:outline-none tabular-nums"
                        />
                        <span className="text-[11px] font-medium text-text-muted px-1 shrink-0 font-sans select-none">
                          {locale === 'ar' ? 'سهم' : 'Shares'}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQty(10)}
                          className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors shrink-0 cursor-pointer border-l border-white/10 rtl:border-l-0 rtl:border-r"
                          title={locale === 'ar' ? 'زيادة الكمية 10' : 'Increase shares by 10'}
                          aria-label="Increase shares"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Quick lot preset chips */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {[10, 50, 100, 500].map((lot) => (
                          <button
                            key={lot}
                            type="button"
                            onClick={() => addQtyPreset(lot)}
                            className="flex-1 py-1 px-1.5 text-[10px] font-semibold text-text-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.08] rounded transition-all tabular-nums font-sans cursor-pointer text-center"
                          >
                            +{lot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Total Position Value Preview Card */}
                  {positionTotalVal > 0 && (
                    <div className="field-card">
                      <span className="field-label">{locale === 'ar' ? 'القيمة المقدرة للصفقة' : 'Estimated Position Value'}</span>
                      <span className="text-sm font-bold text-text-primary tabular-nums font-sans">
                        {positionTotalVal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                <div className="drawer-footer">
                  <button
                    type="button"
                    onClick={onClose}
                    className="drawer-cancel-btn"
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPos}
                    className="drawer-confirm-btn"
                  >
                    <TrendingUp className="drawer-btn-icon" />
                    <span>
                      {isSubmittingPos
                        ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...')
                        : positionAccountId && isVirtualAccount(brokerageAccounts.find((b) => String(b.id) === positionAccountId))
                        ? (locale === 'ar' ? 'تتبع صفقة افتراضية' : 'Track Virtual Position')
                        : (locale === 'ar' ? 'تتبع الصفقة' : 'Track Position')}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Position Added Success Modal (with Thndr Redirect CTA) */}
    <AnimatePresence>
      {showSuccessModal && addedPosition && (
        <div
          key="thndr-position-success-overlay"
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => {
            setShowSuccessModal(false);
            onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-black border border-white/15 rounded-2xl p-6 text-center shadow-2xl overflow-hidden"
          >
            {/* Subtle Thndr yellow top accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#FFE500]/60 blur-sm rounded-full" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                onClose();
              }}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Success Icon */}
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-base font-bold text-white mb-1 font-sans">
              {locale === 'ar' ? 'تمت إضافة الصفقة بنجاح' : 'Position Added'}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed mb-5 font-sans">
              {locale === 'ar'
                ? `تم تسجيل صفقة ${addedPosition.symbol} في محفظتك. يمكنك الآن الانتقال لتنفيذ الأمر عبر ثاندر.`
                : `Your position for ${addedPosition.symbol} has been recorded in your portfolio. You can now place the order on Thndr.`}
            </p>

            {/* Position Details Card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 mb-5 text-start font-sans">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-white/10 border border-white/15 tabular-nums">
                    {addedPosition.symbol}
                  </span>
                  <span className="text-xs text-text-muted truncate max-w-[140px]">
                    {addedPosition.accountName}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted tabular-nums">
                  {addedPosition.date}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-[10px] text-text-muted mb-0.5">
                    {locale === 'ar' ? 'السعر' : 'Price'}
                  </span>
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {addedPosition.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted mb-0.5">
                    {locale === 'ar' ? 'الكمية' : 'Shares'}
                  </span>
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {addedPosition.quantity.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted mb-0.5">
                    {locale === 'ar' ? 'الإجمالي' : 'Total'}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">
                    {addedPosition.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              {/* Primary CTA: Yellow Thndr Button with Thndr Bolt Icon */}
              <a
                href={addedPosition.thndrUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#FFE500] hover:bg-[#F2D900] active:scale-[0.98] text-black font-bold rounded-xl transition-all text-xs tracking-tight shadow-lg shadow-[#FFE500]/20 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 fill-black shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>
                  {locale === 'ar' ? 'الانتقال إلى ثاندر لتنفيذ الأمر' : 'Go to Thndr to place order'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] text-black/70 shrink-0" />
              </a>

              {/* Secondary CTA: Stay in Ticknal */}
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="w-full py-2.5 px-4 text-xs font-medium text-text-muted hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer border border-transparent hover:border-white/10"
              >
                {locale === 'ar' ? 'البقاء في تكنال' : 'Stay in Ticknal'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>,
  document.body
);
}

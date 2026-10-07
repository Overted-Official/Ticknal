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
} from '@/components/ui/icon-library';
import { useToast } from '@/context/ToastContext';
import { type BankAccount } from '@/types/bank';
import AccountSelectDropdown from './wallet/AccountSelectDropdown';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import { useTranslation } from '@/lib/i18n';

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
  const tickerSearchRef = useRef<HTMLDivElement>(null);

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
        onClose();
        // Reset form
        setPositionSymbol('');
        setPositionPrice('');
        setPositionQty('100');
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
                  <span>{locale === 'ar' ? 'إضافة معاملة' : 'Add Transaction'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSwitch('position')}
                  className={`pill-switch-btn flex items-center justify-center gap-1.5 ${
                    activeSwitch === 'position' ? 'pill-switch-btn-active font-semibold' : ''
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
                    <div className="pill-switch pill-switch-full">
                      <button
                        type="button"
                        onClick={() => setTxMode('EXPENSE')}
                        className={`pill-switch-btn ${txMode === 'EXPENSE' ? 'pill-switch-btn-active' : ''}`}
                      >
                        {locale === 'ar' ? 'مصروف' : 'Expense'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('INCOME')}
                        className={`pill-switch-btn ${txMode === 'INCOME' ? 'pill-switch-btn-active' : ''}`}
                      >
                        {locale === 'ar' ? 'دخل' : 'Income'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('TRANSFER')}
                        className={`pill-switch-btn ${txMode === 'TRANSFER' ? 'pill-switch-btn-active' : ''}`}
                      >
                        {locale === 'ar' ? 'تحويل' : 'Transfer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('BROKER_INJECTION')}
                        className={`pill-switch-btn ${txMode === 'BROKER_INJECTION' ? 'pill-switch-btn-active' : ''}`}
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
                  {/* Position Info Card */}
                  <div className="drawer-info-card">
                    <div className="drawer-info-dot" />
                    <p className="drawer-info-text">
                      {locale === 'ar'
                        ? 'أدخل تفاصيل تنفيذ شراء السهم. ستنعكس الصفقة فوراً في محفظتك الاستثمارية.'
                        : 'Enter execution details for your stock buy. Position will immediately reflect in your portfolio.'}
                    </p>
                  </div>

                  {/* EGX Ticker Search */}
                  <div className="drawer-form-field relative" ref={tickerSearchRef}>
                    <label className="field-label">{locale === 'ar' ? 'رمز سهم البورصة المصرية *' : 'EGX Ticker Symbol *'}</label>
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
                        className="field-input uppercase"
                      />
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
                                if (priceNum > 0) {
                                  setPositionPrice(String(priceNum));
                                }
                                setIsTickerDropdownOpen(false);
                              }}
                              className="w-full px-2.5 py-2 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-lg flex items-center justify-between transition-colors text-left cursor-pointer gap-2.5"
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
                              <div className="flex flex-col items-end shrink-0 pl-2 font-sans tabular-nums text-right">
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
                    {positionAccountId && isVirtualAccount(brokerageAccounts.find((b) => String(b.id) === positionAccountId)) && (
                      <div className="drawer-info-card mt-2">
                        <div className="drawer-info-dot" />
                        <p className="drawer-info-text">
                          {locale === 'ar'
                            ? '💡 حساب افتراضي: لا يتطلب أي بيانات بنكية. يتتبع الصفقة على الرسم البياني مع الأرباح والخسائر اللحظية وتنبيهات الخروج الآلية.'
                            : '💡 Virtual Account: Zero personal bank credentials required. Tracks on charts with live P&L and automated strategy sell notifications.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Price & Quantity Grid */}
                  <div className="drawer-form-grid-2">
                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'سعر الدخول (ج.م) *' : 'Entry Price (EGP) *'}</label>
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
                        <span className="field-suffix">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                    </div>

                    <div className="drawer-form-field">
                      <label className="field-label">{locale === 'ar' ? 'الكمية (أسهم) *' : 'Quantity (Shares) *'}</label>
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
                        <span className="field-suffix">{locale === 'ar' ? 'سهم' : 'Shares'}</span>
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

                  {/* Entry Date */}
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
                        ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                        : positionAccountId && isVirtualAccount(brokerageAccounts.find((b) => String(b.id) === positionAccountId))
                        ? (locale === 'ar' ? 'تتبع صفقة افتراضية' : 'Track Virtual Position')
                        : (locale === 'ar' ? 'إنشاء صفقة أسهم' : 'Create Stock Position')}
                    </span>
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

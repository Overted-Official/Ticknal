'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
} from '@/components/ui/icon-library';
import { type BankAccount, type MonthlyCashflowSummary, type BankItem } from '@/types/bank';
import { isVirtualAccount } from '@/lib/banks/virtual-account-constants';
import {
  calculateMonthlySpendAndSavingsRate,
  type ExpenseAllocationResultItem,
} from '@/lib/banks/cashflow-math';
import { formatCleanAccountTitle } from '@/lib/utils/format-bank-name';
import { toast } from '@/components/ui/sonner';
import ExpenseAllocationSlider from './ExpenseAllocationSlider';

interface MonthlyCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  availableBanks?: BankItem[];
  usdRate?: number;
  isArabic?: boolean;
  previousSummary?: MonthlyCashflowSummary | null;
  onCheckInComplete?: (summary: MonthlyCashflowSummary) => void;
  onOpenAddAccount?: () => void;
}

function getAccountBadge(bankShort: string): string {
  const clean = (bankShort || '').trim();
  if (!clean) return 'ACC';
  if (clean.length <= 3) return clean.toUpperCase();
  const upper = clean.toUpperCase();
  if (upper.includes('MISR')) return 'BM';
  if (upper.includes('AHLI') || upper.includes('NBE') || upper.includes('NATIONAL BANK')) return 'NBE';
  if (upper.includes('CAIRO') || upper.includes('BDC')) return 'BDC';
  if (upper.includes('COMMERCIAL') || upper.includes('CIB')) return 'CIB';
  if (upper.includes('THNDR')) return 'TH';
  if (upper.includes('VODAFONE')) return 'VF';
  if (upper.includes('INSTAPAY')) return 'IP';
  if (upper.includes('ETISALAT')) return 'ET';
  if (upper.includes('ORANGE')) return 'OG';
  if (upper.includes('CASH')) return 'CSH';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function resolveBankLogoUrl(
  acc: BankAccount,
  availableBanks: BankItem[] = []
): string | null {
  // 1. Direct on account object
  if (acc.bankLogoUrl) return acc.bankLogoUrl;

  // 2. Match by bankId in availableBanks
  if (acc.bankId && availableBanks.length > 0) {
    const match = availableBanks.find((b) => b.id === acc.bankId);
    if (match?.logoUrl) return match.logoUrl;
  }

  // 3. Match by name or slug in availableBanks
  const raw = `${acc.bankName || ''} ${acc.customBankName || ''} ${acc.accountName || ''}`.toLowerCase().trim();
  if (availableBanks.length > 0) {
    const match = availableBanks.find((b) => {
      const bName = b.name.toLowerCase();
      const bSlug = (b.slug || '').toLowerCase();
      return (
        raw.includes(bName) ||
        bName.includes(raw) ||
        (bSlug && raw.includes(bSlug))
      );
    });
    if (match?.logoUrl) return match.logoUrl;
  }

  // 4. Institutional canonical Egyptian bank/fintech logo assets
  if (raw.includes('cib') || raw.includes('commercial international')) {
    return 'https://s3-symbol-logo.tradingview.com/commercial-international-bank-egypt.svg';
  }
  if (raw.includes('misr') || raw.includes('banque misr')) {
    return 'https://s3-symbol-logo.tradingview.com/banque-misr.svg';
  }
  if (raw.includes('nbe') || raw.includes('national bank') || raw.includes('ahli')) {
    return 'https://s3-symbol-logo.tradingview.com/national-bank-of-egypt.svg';
  }
  if (raw.includes('hsbc')) {
    return 'https://s3-symbol-logo.tradingview.com/hsbc.svg';
  }
  if (raw.includes('thndr')) {
    return 'https://web.thndr.app/favicon.ico';
  }
  if (raw.includes('cairo') || raw.includes('bdc')) {
    return 'https://s3-symbol-logo.tradingview.com/banque-du-caire.svg';
  }
  if (raw.includes('qnb')) {
    return 'https://s3-symbol-logo.tradingview.com/qatar-national-bank-alahli.svg';
  }
  if (raw.includes('faisal') || raw.includes('faib')) {
    return 'https://s3-symbol-logo.tradingview.com/faisal-islamic-bank-of-egypt.svg';
  }
  if (raw.includes('adib') || raw.includes('abu dhabi')) {
    return 'https://s3-symbol-logo.tradingview.com/abu-dhabi-islamic-bank-egypt.svg';
  }
  if (raw.includes('alex') || raw.includes('alexandria')) {
    return 'https://s3-symbol-logo.tradingview.com/bank-of-alexandria.svg';
  }
  if (raw.includes('vodafone')) {
    return 'https://s3-symbol-logo.tradingview.com/vodafone.svg';
  }

  return null;
}

export default function MonthlyCheckInDrawer({
  isOpen,
  onClose,
  accounts = [],
  availableBanks = [],
  usdRate = 50.2,
  isArabic = false,
  previousSummary = null,
  onCheckInComplete,
  onOpenAddAccount,
}: MonthlyCheckInDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Month Key: default to current YYYY-MM
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState<string>(currentMonthKey);

  // Balances state: accountId -> balance string
  const [accountBalances, setAccountBalances] = useState<Record<number, string>>({});
  // Logo image loading error fallback state
  const [failedLogos, setFailedLogos] = useState<Record<number, boolean>>({});
  // Income state
  const [incomeInput, setIncomeInput] = useState<string>('');
  // Expense breakdown state
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseAllocationResultItem[]>([]);
  // Optional user notes
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Real liquid accounts only (exclude virtual paper trading)
  const realAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived && !isVirtualAccount(a));
  }, [accounts]);

  useEffect(() => {
    if (isOpen) {
      const initialMap: Record<number, string> = {};
      realAccounts.forEach((acc) => {
        initialMap[acc.id] = String(acc.balance ?? '0');
      });
      setAccountBalances(initialMap);

      if (previousSummary?.totalIncome) {
        setIncomeInput(String(previousSummary.totalIncome));
      } else {
        setIncomeInput('');
      }

      setFailedLogos({});
      setExpenseCategories([]);
      setShowExpenseBreakdown(false);
      setNotes('');
    }
  }, [isOpen, realAccounts, previousSummary]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute Starting Cash in EGP
  const startingCashEgp = useMemo(() => {
    if (previousSummary?.endingCashEgp) {
      return Number(previousSummary.endingCashEgp);
    }
    // Fallback: sum of current active real accounts before edits
    return realAccounts.reduce((acc, a) => {
      const b = Number(a.balance) || 0;
      const egp = a.currency === 'USD' ? b * usdRate : b;
      return acc + egp;
    }, 0);
  }, [previousSummary, realAccounts, usdRate]);

  // Compute Ending Cash in EGP based on user input
  const endingCashEgp = useMemo(() => {
    return realAccounts.reduce((acc, a) => {
      const enteredStr = accountBalances[a.id] ?? String(a.balance ?? '0');
      const b = Number(enteredStr) || 0;
      const egp = a.currency === 'USD' ? b * usdRate : b;
      return acc + egp;
    }, 0);
  }, [realAccounts, accountBalances, usdRate]);

  // Derived Monthly Cashflow Math
  const cashflowMath = useMemo(() => {
    const inc = Number(incomeInput) || 0;
    return calculateMonthlySpendAndSavingsRate(startingCashEgp, endingCashEgp, inc);
  }, [startingCashEgp, endingCashEgp, incomeInput]);

  const handleBalanceChange = (accountId: number, val: string) => {
    setAccountBalances((prev) => ({
      ...prev,
      [accountId]: val,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedBalances = Object.entries(accountBalances).map(([accId, val]) => ({
        accountId: Number(accId),
        balance: Number(val) || 0,
      }));

      const payload = {
        yearMonth,
        accountBalances: formattedBalances,
        totalIncome: Number(incomeInput) || 0,
        startingCashEgp,
        endingCashEgp,
        calculatedSpendEgp: cashflowMath.spend,
        savingsRatePct: cashflowMath.savingsRatePct,
        expenseBreakdown: expenseCategories,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/banks/snapshots/closeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit balance update');
      }

      const resData = await res.json();
      toast.success(
        isArabic ? 'تم حفظ تحديث الأرصدة بنجاح' : 'Balance update saved successfully',
        isArabic
          ? `تم تحديث أرصدة ومصروفات شهر ${yearMonth}`
          : `Saved balances & cashflow for ${yearMonth}`
      );

      if (onCheckInComplete && resData.summary) {
        onCheckInComplete(resData.summary);
      }
      onClose();
    } catch (err: any) {
      console.error('Balance update error:', err);
      toast.error(
        isArabic ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving balance update',
        err.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="monthly-balance-update-overlay" className="drawer-overlay z-[80]">
          {/* Backdrop */}
          <motion.div
            key="monthly-balance-update-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-backdrop"
            onClick={onClose}
            aria-label="Close drawer overlay"
          />

          {/* Drawer Sheet */}
          <motion.div
            key="monthly-balance-update-sheet"
            initial={isMobile ? { y: '100%' } : { x: isArabic ? '-100%' : '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: isArabic ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`drawer-sheet text-text-primary rounded-none border-l border-border-subtle ${
              !isMobile ? 'drawer-sheet-viewport-safe w-full max-w-xl lg:max-w-2xl' : 'max-h-[92vh]'
            } flex flex-col font-sans select-none`}
          >
            {/* Header: Platform canonical drawer header */}
            <div className="drawer-header">
              {/* Mobile Drag Indicator */}
              <div
                className="drawer-drag-pill-container"
                onClick={onClose}
                aria-label={isArabic ? 'سحب للإغلاق' : 'Drag handle to close'}
              >
                <div className="drawer-drag-pill" />
              </div>

              {/* Header Row */}
              <div className="drawer-header-row">
                <div className="drawer-header-brand">
                  <div className="drawer-header-icon-box">
                    <Calendar className="drawer-header-icon" />
                  </div>
                  <div className="drawer-header-titles">
                    <h2 className="drawer-title">
                      {isArabic ? 'تحديث الأرصدة' : 'Balance Update'}
                    </h2>
                    <p className="drawer-subtitle">
                      {isArabic
                        ? 'تحديث أرصدة الحسابات لحساب صافي المصروفات ومعدل الادخار'
                        : 'Update balances to calculate monthly spend & savings'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={yearMonth}
                    onChange={(e) => setYearMonth(e.target.value)}
                    className="input-control-compact font-sans tabular-nums text-xs"
                    title={isArabic ? 'اختر الشهر' : 'Select Month'}
                  />
                  <button
                    type="button"
                    onClick={onClose}
                    className="drawer-close-btn"
                    aria-label="Close"
                  >
                    <X className="drawer-close-icon" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form wrapping body and sticky footer */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="drawer-body custom-scrollbar space-y-5">
                {/* 1. Liquidity Summary Ribbon */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-surface-raised border border-border-subtle">
                  <div>
                    <span className="text-[11px] text-text-muted block">
                      {isArabic ? 'رصيد البداية' : 'Starting Cash'}
                    </span>
                    <span className="text-sm sm:text-base font-bold tabular-nums text-text-primary">
                      {Math.round(startingCashEgp).toLocaleString()}{' '}
                      <span className="text-[10px] text-text-muted font-normal">EGP</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted block">
                      {isArabic ? 'رصيد النهاية' : 'Ending Cash'}
                    </span>
                    <span className="text-sm sm:text-base font-bold tabular-nums text-text-primary">
                      {Math.round(endingCashEgp).toLocaleString()}{' '}
                      <span className="text-[10px] text-text-muted font-normal">EGP</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-muted block">
                      {isArabic ? 'صافي التغير' : 'Net Change'}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-bold tabular-nums ${
                        endingCashEgp >= startingCashEgp ? 'text-profit-num' : 'text-loss-num'
                      }`}
                    >
                      {endingCashEgp >= startingCashEgp ? '+' : ''}
                      {Math.round(endingCashEgp - startingCashEgp).toLocaleString()}{' '}
                      <span className="text-[10px] text-text-muted font-normal">EGP</span>
                    </span>
                  </div>
                </div>

                {/* 2. Ending Account Balances in Condensed 2x2 Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="field-label font-semibold text-text-primary uppercase tracking-wider text-[11px]">
                      {isArabic ? 'أرصدة نهاية الشهر' : 'Ending Account Balances'}
                    </label>
                    <div className="flex items-center gap-2">
                      {onOpenAddAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenAddAccount();
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isArabic ? 'إضافة حساب جديد' : 'Add Account'}</span>
                        </button>
                      )}
                      <span className="text-[11px] text-text-muted">
                        {realAccounts.length} {isArabic ? 'حسابات' : 'accounts'}
                      </span>
                    </div>
                  </div>

                  {/* 2x2 Condensed Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {realAccounts.map((acc) => {
                      const { bankShort, subName } = formatCleanAccountTitle(acc);
                      const badge = getAccountBadge(bankShort);
                      const logoUrl = resolveBankLogoUrl(acc, availableBanks);
                      const hasImgError = failedLogos[acc.id];
                      const val = accountBalances[acc.id] ?? String(acc.balance ?? '0');

                      return (
                        <div
                          key={acc.id}
                          className="p-2.5 border border-border-subtle bg-surface-base hover:border-border-default transition-colors flex flex-col justify-between gap-2 rounded-none"
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-border-subtle flex items-center justify-center shrink-0">
                                {logoUrl && !hasImgError ? (
                                  <img
                                    src={logoUrl}
                                    alt={bankShort}
                                    onError={() =>
                                      setFailedLogos((prev) => ({ ...prev, [acc.id]: true }))
                                    }
                                    className="w-full h-full object-contain p-0.5 rounded-full"
                                  />
                                ) : (
                                  <span className="text-[9px] font-bold text-text-primary">
                                    {badge}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">
                                  {bankShort}
                                </p>
                                {subName && (
                                  <p className="text-[10px] text-text-muted truncate">
                                    {subName}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-text-muted uppercase px-1.5 py-0.5 border border-border-subtle bg-surface-raised tabular-nums shrink-0">
                              {acc.currency}
                            </span>
                          </div>

                          <div className="field-group h-8 px-2 w-full">
                            <input
                              type="number"
                              step="any"
                              value={val}
                              onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                              className="field-input text-right text-xs"
                              placeholder="0"
                            />
                            <span className="field-suffix text-[10px]">{acc.currency}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Account Tile Inside 2x2 Grid */}
                    {onOpenAddAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAddAccount();
                        }}
                        className="p-2.5 border border-dashed border-border-subtle hover:border-brand-blue/50 hover:bg-white/[0.02] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary min-h-[76px] rounded-none group"
                      >
                        <div className="w-6 h-6 rounded-full border border-dashed border-border-subtle group-hover:border-brand-blue flex items-center justify-center text-text-muted group-hover:text-brand-blue transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold">
                          {isArabic ? 'إضافة حساب جديد' : 'Add Account'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Monthly Income & Inflows */}
                <div className="space-y-1.5">
                  <label className="field-label font-semibold text-text-primary uppercase tracking-wider text-[11px]">
                    {isArabic
                      ? 'إجمالي الدخل والوارد (راتب، أرباح، إيداعات)'
                      : 'Monthly Income & Inflows (Salary, Dividends, Cash in)'}
                  </label>
                  <div className="field-group">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                      placeholder="50000"
                      className="field-input"
                    />
                    <span className="field-suffix">EGP</span>
                  </div>
                </div>

                {/* 4. Live Derived Spend & Savings Insight Card */}
                <div className="p-3.5 border border-border-subtle bg-surface-raised space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <div>
                      <span className="text-[11px] text-text-muted block">
                        {isArabic ? 'صافي المصروفات المستنتجة' : 'Derived Monthly Spend'}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums mt-0.5 block">
                        {Math.round(cashflowMath.spend).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-text-muted">EGP</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-text-muted block">
                        {isArabic ? 'معدل الادخار' : 'Savings Rate'}
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold tabular-nums mt-0.5 block ${
                          cashflowMath.savingsRatePct >= 20
                            ? 'text-profit-num'
                            : cashflowMath.savingsRatePct >= 0
                            ? 'text-brand-blue'
                            : 'text-loss-num'
                        }`}
                      >
                        {cashflowMath.savingsRatePct > 0 ? '+' : ''}
                        {cashflowMath.savingsRatePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Formula Equation */}
                  <div className="text-xs text-text-muted space-y-1 font-sans">
                    <div className="flex justify-between">
                      <span>{isArabic ? 'الدخل الشهري:' : 'Income Inflow:'}</span>
                      <span className="text-text-primary tabular-nums">
                        +{Number(incomeInput || 0).toLocaleString()} EGP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isArabic ? 'تغير السيولة:' : 'Liquid Cash Delta:'}</span>
                      <span
                        className={`tabular-nums ${
                          cashflowMath.deltaCash >= 0 ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {cashflowMath.deltaCash >= 0 ? '+' : ''}
                        {Math.round(cashflowMath.deltaCash).toLocaleString()} EGP
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border-subtle/60 font-semibold text-text-primary">
                      <span>{isArabic ? 'المصروف المحسوب (دخل - تغير السيولة):' : 'Derived Spend (Income - Delta):'}</span>
                      <span className="tabular-nums">
                        {Math.round(cashflowMath.spend).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>

                  {/* Plain Language Insight */}
                  <div className="drawer-info-card">
                    <Sparkles className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                    <p className="drawer-info-text leading-relaxed">
                      {isArabic
                        ? `حققت دخلاً بقيمة ${(Number(incomeInput) || 0).toLocaleString()} ج.م، واحتفظت بـ ${cashflowMath.deltaCash >= 0 ? '+' : ''}${Math.round(cashflowMath.deltaCash).toLocaleString()} ج.م (بنسبة ادخار ${cashflowMath.savingsRatePct.toFixed(1)}%)، وصافي مصروفك كان ${Math.round(cashflowMath.spend).toLocaleString()} ج.م.`
                        : `You earned ${(Number(incomeInput) || 0).toLocaleString()} EGP, retained ${cashflowMath.deltaCash >= 0 ? '+' : ''}${Math.round(cashflowMath.deltaCash).toLocaleString()} EGP (${cashflowMath.savingsRatePct.toFixed(1)}% savings rate), and spent ${Math.round(cashflowMath.spend).toLocaleString()} EGP.`}
                    </p>
                  </div>
                </div>

                {/* 5. Optional Expense Breakdown Section */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
                    className="filter-control-btn w-full justify-between py-2 text-xs cursor-pointer"
                  >
                    <span>
                      {isArabic
                        ? 'توزيع المصروفات حسب الفئات (اختياري)'
                        : 'Expense Category Breakdown (Optional)'}
                    </span>
                    {showExpenseBreakdown ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showExpenseBreakdown && (
                    <div className="p-3 border border-border-subtle bg-surface-raised space-y-3">
                      <p className="text-[11px] text-text-muted">
                        {isArabic
                          ? 'حدد الفئات الرئيسية، وسيتكفل الوعاء العام بباقي المصروفات تلقائياً.'
                          : 'Estimate a few major categories. Unallocated spend automatically balances into General.'}
                      </p>
                      <ExpenseAllocationSlider
                        totalSpend={cashflowMath.spend}
                        currency="EGP"
                        categories={expenseCategories}
                        onChange={setExpenseCategories}
                        isArabic={isArabic}
                      />
                    </div>
                  )}
                </div>

                {/* 6. Optional Notes */}
                <div className="space-y-1.5">
                  <label className="field-label font-semibold text-text-primary uppercase tracking-wider text-[11px]">
                    {isArabic ? 'ملاحظات الشهر (اختياري)' : 'Month Notes (Optional)'}
                  </label>
                  <div className="field-group">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        isArabic
                          ? 'مثلاً: صيانة السيارة، مكافأة نهاية الربع، تجديد اشتراكات...'
                          : 'e.g. Car maintenance, annual bonus, subscription renewals...'
                      }
                      className="field-input font-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="drawer-footer">
                <button
                  type="button"
                  onClick={onClose}
                  className="drawer-cancel-btn"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="drawer-confirm-btn"
                >
                  {isSubmitting
                    ? isArabic
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : isArabic
                    ? 'حفظ تحديث الأرصدة'
                    : 'Save Balance Update'}
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

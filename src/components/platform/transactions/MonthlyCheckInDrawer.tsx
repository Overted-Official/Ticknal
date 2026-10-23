'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  PieChart,
  Landmark,
  Wallet,
  Sparkles,
  ChevronRight,
} from '@/components/ui/icon-library';
import { type BankAccount, type MonthlyCashflowSummary } from '@/types/bank';
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
  usdRate?: number;
  isArabic?: boolean;
  previousSummary?: MonthlyCashflowSummary | null;
  onCheckInComplete?: (summary: MonthlyCashflowSummary) => void;
}

export default function MonthlyCheckInDrawer({
  isOpen,
  onClose,
  accounts = [],
  usdRate = 50.2,
  isArabic = false,
  previousSummary = null,
  onCheckInComplete,
}: MonthlyCheckInDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Month Key: default to current YYYY-MM
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState<string>(currentMonthKey);

  // Balances state: accountId -> balance string
  const [accountBalances, setAccountBalances] = useState<Record<number, string>>({});
  // Income state
  const [incomeInput, setIncomeInput] = useState<string>('');
  // Expense breakdown state
  const [expenseCategories, setExpenseCategories] = useState<ExpenseAllocationResultItem[]>([]);
  // Optional user notes
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when drawer opens
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      const initialMap: Record<number, string> = {};
      accounts.forEach((acc) => {
        initialMap[acc.id] = String(acc.balance ?? '0');
      });
      setAccountBalances(initialMap);

      if (previousSummary?.totalIncome) {
        setIncomeInput(String(previousSummary.totalIncome));
      } else {
        setIncomeInput('');
      }

      setExpenseCategories([]);
      setNotes('');
    }
  }, [isOpen, accounts, previousSummary]);

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
    // Fallback: sum of current active accounts before edits
    return accounts.reduce((acc, a) => {
      if (a.isArchived) return acc;
      const b = Number(a.balance) || 0;
      const egp = a.currency === 'USD' ? b * usdRate : b;
      return acc + egp;
    }, 0);
  }, [previousSummary, accounts, usdRate]);

  // Compute Ending Cash in EGP based on user input
  const endingCashEgp = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.isArchived) return acc;
      const enteredStr = accountBalances[a.id] ?? String(a.balance ?? '0');
      const b = Number(enteredStr) || 0;
      const egp = a.currency === 'USD' ? b * usdRate : b;
      return acc + egp;
    }, 0);
  }, [accounts, accountBalances, usdRate]);

  // Monthly Cashflow Math
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

  const handleSubmit = async () => {
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
        throw new Error(data.error || 'Failed to submit monthly closeout');
      }

      const resData = await res.json();
      toast.success(
        isArabic ? 'تم حفظ وإغلاق الشهر بنجاح' : 'Monthly closeout saved successfully',
        isArabic
          ? `تم تحديث أرصدة ومصروفات شهر ${yearMonth}`
          : `Saved balances & cashflow for ${yearMonth}`
      );

      if (onCheckInComplete && resData.summary) {
        onCheckInComplete(resData.summary);
      }
      onClose();
    } catch (err: any) {
      console.error('Monthly closeout error:', err);
      toast.error(
        isArabic ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving monthly check-in',
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
        <div key="monthly-checkin-drawer-container" className="drawer-overlay z-[80]">
          {/* Backdrop */}
          <motion.div
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
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`drawer-sheet bg-black text-white rounded-none border-l border-white/10 ${
              !isMobile ? 'drawer-sheet-viewport-safe w-full max-w-2xl' : 'max-h-[92vh]'
            } flex flex-col font-sans`}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                  <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                    {isArabic ? 'المراجعة المالية الشهرية (90 ثانية)' : '90-Second Monthly Check-In'}
                  </h2>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {isArabic
                    ? 'حدث أرصدة حساباتك لحساب صافي المصروفات ومعدل الادخار تلقائياً'
                    : 'Reconcile account balances to derive monthly burn and savings rate automatically'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  className="bg-black border border-white/15 px-2.5 py-1 text-xs text-text-primary focus:border-brand-blue focus:outline-none tabular-nums"
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-text-muted hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stepper Tabs Bar */}
            <div className="flex items-center border-b border-white/10 bg-white/[0.01] px-4 py-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-4 w-full">
                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                    currentStep === 1
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>{isArabic ? 'أرصدة الحسابات' : 'Ending Balances'}</span>
                </button>

                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                    currentStep === 2
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>{isArabic ? 'الدخل والمصروف' : 'Income & Spend'}</span>
                </button>

                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                    currentStep === 3
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>{isArabic ? 'التوزيع (اختياري)' : 'Breakdown (Optional)'}</span>
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* STEP 1: Balances */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 border border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-text-muted">{isArabic ? 'رصيد بداية الشهر المقدر' : 'Estimated Starting Cash'}</p>
                      <p className="text-base sm:text-lg font-bold text-text-primary tabular-nums mt-0.5">
                        {Math.round(startingCashEgp).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-text-muted">EGP</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-text-muted">{isArabic ? 'رصيد نهاية الشهر المحسوب' : 'Reconciled Ending Cash'}</p>
                      <p className="text-base sm:text-lg font-bold text-text-primary tabular-nums mt-0.5">
                        {Math.round(endingCashEgp).toLocaleString()}{' '}
                        <span className="text-xs font-normal text-text-muted">EGP</span>
                      </p>
                    </div>
                  </div>

                  {/* Net Change indicator */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-text-muted">{isArabic ? 'صافي التغير في السيولة:' : 'Net Liquid Change:'}</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        endingCashEgp >= startingCashEgp ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {endingCashEgp >= startingCashEgp ? '+' : ''}
                      {Math.round(endingCashEgp - startingCashEgp).toLocaleString()} EGP
                    </span>
                  </div>

                  {/* Account Inputs List */}
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-text-secondary">
                      {isArabic ? 'أدخل الرصيد الفعلي لكل حساب في نهاية الشهر:' : 'Confirm or update each balance:'}
                    </p>

                    {accounts.map((acc) => {
                      const { bankShort, subName } = formatCleanAccountTitle(acc);
                      const isUsd = acc.currency === 'USD';
                      const val = accountBalances[acc.id] ?? String(acc.balance ?? '0');

                      return (
                        <div
                          key={acc.id}
                          className="p-3 border border-white/10 bg-white/[0.02] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-none border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                              {isUsd ? (
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Landmark className="w-4 h-4 text-purple-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                                {bankShort}
                              </p>
                              <p className="text-[11px] text-text-muted truncate">{subName}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              step="any"
                              value={val}
                              onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                              className="w-28 sm:w-36 bg-black border border-white/15 px-2.5 py-1.5 text-right text-xs sm:text-sm text-text-primary tabular-nums focus:border-brand-blue focus:outline-none"
                              placeholder="0"
                            />
                            <span className="text-xs text-text-muted shrink-0 w-8 text-center">
                              {acc.currency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Income & Delta Spend */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">
                      {isArabic ? 'إجمالي دخل هذا الشهر (الراتب، أرباح، توزيعات...):' : 'Total Monthly Inflow (Salary, Dividends, Cash in):'}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={incomeInput}
                        onChange={(e) => setIncomeInput(e.target.value)}
                        placeholder="50000"
                        className="w-full bg-black border border-white/15 px-3 py-2 text-base text-text-primary tabular-nums focus:border-brand-blue focus:outline-none"
                        autoFocus
                      />
                      <span className="absolute right-3 text-xs text-text-muted pointer-events-none">
                        EGP
                      </span>
                    </div>
                  </div>

                  {/* Top-Down Delta Summary Card */}
                  <div className="p-4 border border-white/15 bg-white/[0.03] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <p className="text-xs text-text-muted">{isArabic ? 'صافي المصروفات المحسوبة' : 'Calculated Monthly Burn'}</p>
                        <p className="text-2xl font-bold text-text-primary tabular-nums mt-0.5">
                          {Math.round(cashflowMath.spend).toLocaleString()}{' '}
                          <span className="text-xs font-normal text-text-muted">EGP</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-text-muted">{isArabic ? 'معدل الادخار' : 'Savings Rate'}</p>
                        <p
                          className={`text-2xl font-bold tabular-nums mt-0.5 ${
                            cashflowMath.savingsRatePct >= 20
                              ? 'text-emerald-400'
                              : cashflowMath.savingsRatePct >= 0
                              ? 'text-brand-blue'
                              : 'text-rose-400'
                          }`}
                        >
                          {cashflowMath.savingsRatePct > 0 ? '+' : ''}
                          {cashflowMath.savingsRatePct.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Breakdown Math Formula */}
                    <div className="text-xs text-text-muted space-y-1">
                      <div className="flex justify-between">
                        <span>{isArabic ? 'الدخل الشهري:' : 'Income Inflow:'}</span>
                        <span className="text-text-primary tabular-nums">
                          +{Number(incomeInput || 0).toLocaleString()} EGP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isArabic ? 'تغير السيولة (نهاية - بداية):' : 'Cash Delta (End - Start):'}</span>
                        <span
                          className={`tabular-nums ${
                            cashflowMath.deltaCash >= 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {cashflowMath.deltaCash >= 0 ? '+' : ''}
                          {Math.round(cashflowMath.deltaCash).toLocaleString()} EGP
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-white/5 font-semibold text-text-primary">
                        <span>{isArabic ? 'إجمالي الصرف المستنتج:' : 'Derived Total Spend:'}</span>
                        <span className="tabular-nums">
                          {Math.round(cashflowMath.spend).toLocaleString()} EGP
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border border-white/10 bg-white/[0.02] flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {isArabic
                          ? `حققت دخلاً بقيمة ${(Number(incomeInput) || 0).toLocaleString()} ج.م، وادخرت ${cashflowMath.deltaCash >= 0 ? '+' : ''}${Math.round(cashflowMath.deltaCash).toLocaleString()} ج.م (بنسبة ادخار ${cashflowMath.savingsRatePct.toFixed(1)}%)، ومصروفاتك الإجمالية كانت ${Math.round(cashflowMath.spend).toLocaleString()} ج.م.`
                          : `You earned ${(Number(incomeInput) || 0).toLocaleString()} EGP, retained ${cashflowMath.deltaCash >= 0 ? '+' : ''}${Math.round(cashflowMath.deltaCash).toLocaleString()} EGP (${cashflowMath.savingsRatePct.toFixed(1)}% savings rate), and spent ${Math.round(cashflowMath.spend).toLocaleString()} EGP.`}
                      </p>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">
                      {isArabic ? 'ملاحظات الشهر (اختياري):' : 'Month Notes (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isArabic ? 'مثلاً: مصاريف صيانة سيارة، مكافأة نهاية الربع...' : 'e.g. Car maintenance, annual bonus...'}
                      className="w-full bg-black border border-white/15 px-3 py-1.5 text-xs text-text-primary focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Expense Allocation (Optional) */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {isArabic ? 'توزيع المصروفات (اختياري بالكامل)' : 'Optional Expense Allocation'}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {isArabic
                          ? 'وزع بعض الفئات الكبيرة وسيتولى الوعاء العام الباقي تلقائياً'
                          : 'Estimate a few major buckets. The General bucket absorbs the remainder automatically.'}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-text-primary tabular-nums">
                      {Math.round(cashflowMath.spend).toLocaleString()} EGP
                    </span>
                  </div>

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

            {/* Footer Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-black flex items-center justify-between gap-3 shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2)}
                  className="px-4 py-2 text-xs font-semibold border border-white/15 hover:bg-white/5 transition-colors cursor-pointer text-text-secondary"
                >
                  {isArabic ? 'الرجوع' : 'Back'}
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {currentStep === 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2 text-xs font-bold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    {isArabic ? 'متابعة إلى الدخل' : 'Continue to Income'}
                  </button>
                )}

                {currentStep === 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-3.5 py-2 text-xs font-semibold border border-white/15 hover:bg-white/5 transition-colors cursor-pointer text-text-secondary"
                    >
                      {isArabic ? 'توزيع الفئات (اختياري)' : 'Break Down (Optional)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-5 py-2 text-xs font-bold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting
                        ? isArabic
                          ? 'جاري الحفظ...'
                          : 'Saving...'
                        : isArabic
                        ? 'حفظ وإغلاق الشهر'
                        : 'Save & Close Month'}
                    </button>
                  </>
                )}

                {currentStep === 3 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 text-xs font-bold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting
                      ? isArabic
                        ? 'جاري الحفظ...'
                        : 'Saving...'
                      : isArabic
                      ? 'حفظ وإغلاق الشهر'
                      : 'Save & Close Month'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

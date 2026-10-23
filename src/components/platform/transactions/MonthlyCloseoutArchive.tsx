'use client';

import React from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Sparkles,
} from '@/components/ui/icon-library';
import { type MonthlyCashflowSummary } from '@/types/bank';

interface MonthlyCloseoutArchiveProps {
  summaries: MonthlyCashflowSummary[];
  isArabic?: boolean;
  onOpenCheckIn?: () => void;
}

const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#64748B', // Slate / General
];

function formatYearMonth(ym: string, isAr: boolean): string {
  if (!ym) return '';
  const [yearStr, monthStr] = ym.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return ym;
  }

  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function MonthlyCloseoutArchive({
  summaries = [],
  isArabic = false,
  onOpenCheckIn,
}: MonthlyCloseoutArchiveProps) {
  if (summaries.length === 0) {
    return (
      <div className="p-8 border border-white/10 bg-black text-center font-sans">
        <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-5 h-5 text-brand-blue" />
        </div>
        <h3 className="text-sm font-bold text-text-primary mb-1">
          {isArabic ? 'لا توجد مراجعات شهرية مسجلة بعد' : 'No Monthly Closeouts Yet'}
        </h3>
        <p className="text-xs text-text-muted max-w-md mx-auto mb-4">
          {isArabic
            ? 'ابدأ أول مراجعة مالية لشهرك الآن في 90 ثانية فقط لحساب تدفقاتك وصافي مصروفاتك بدقة دون إرهاق تسجيل المعاملات الفردية.'
            : 'Start your first 90-second monthly wealth check-in to derive true monthly spend and track authentic net worth growth.'}
        </p>
        {onOpenCheckIn && (
          <button
            type="button"
            onClick={onOpenCheckIn}
            className="px-5 py-2 text-xs font-bold bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
          >
            {isArabic ? 'بدء المراجعة الشهرية' : 'Start Monthly Check-In'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {isArabic ? 'سجل المراجعات الشهرية والتدفقات' : 'Monthly Cashflow Closeout Archive'}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-text-muted">
            {summaries.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {summaries.map((summary) => {
          const spend = Number(summary.calculatedSpendEgp) || 0;
          const income = Number(summary.totalIncome) || 0;
          const starting = Number(summary.startingCashEgp) || 0;
          const ending = Number(summary.endingCashEgp) || 0;
          const savingsRate = Number(summary.savingsRatePct) || 0;
          const delta = ending - starting;
          const breakdown = summary.expenseBreakdown || [];

          return (
            <div
              key={summary.id || summary.yearMonth}
              className="p-4 sm:p-5 border border-white/10 bg-black space-y-4 transition-colors hover:border-white/20"
            >
              {/* Row Header: Month Name & Key Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-none border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
                      {formatYearMonth(summary.yearMonth, isArabic)}
                    </h4>
                    <span className="text-[11px] text-text-muted tabular-nums">
                      {summary.yearMonth}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      {isArabic ? 'المصروف المحسوب' : 'Calculated Spend'}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-text-primary tabular-nums">
                      {Math.round(spend).toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-text-muted">EGP</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">
                      {isArabic ? 'معدل الادخار' : 'Savings Rate'}
                    </p>
                    <p
                      className={`text-sm sm:text-base font-bold tabular-nums ${
                        savingsRate >= 20
                          ? 'text-emerald-400'
                          : savingsRate >= 0
                          ? 'text-brand-blue'
                          : 'text-rose-400'
                      }`}
                    >
                      {savingsRate > 0 ? '+' : ''}
                      {savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Cashflow Equation Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 border border-white/5 bg-white/[0.02]">
                  <span className="text-[10px] text-text-muted block">
                    {isArabic ? 'رصيد البداية' : 'Starting Cash'}
                  </span>
                  <span className="font-semibold text-text-primary tabular-nums mt-0.5 block">
                    {Math.round(starting).toLocaleString()} EGP
                  </span>
                </div>

                <div className="p-2.5 border border-white/5 bg-white/[0.02]">
                  <span className="text-[10px] text-text-muted block">
                    {isArabic ? 'الدخل الشهري' : 'Income Inflow'}
                  </span>
                  <span className="font-semibold text-emerald-400 tabular-nums mt-0.5 block">
                    +{Math.round(income).toLocaleString()} EGP
                  </span>
                </div>

                <div className="p-2.5 border border-white/5 bg-white/[0.02]">
                  <span className="text-[10px] text-text-muted block">
                    {isArabic ? 'رصيد النهاية' : 'Ending Cash'}
                  </span>
                  <span className="font-semibold text-text-primary tabular-nums mt-0.5 block">
                    {Math.round(ending).toLocaleString()} EGP
                  </span>
                </div>

                <div className="p-2.5 border border-white/5 bg-white/[0.02]">
                  <span className="text-[10px] text-text-muted block">
                    {isArabic ? 'صافي التغير' : 'Net Cash Delta'}
                  </span>
                  <span
                    className={`font-semibold tabular-nums mt-0.5 block ${
                      delta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {Math.round(delta).toLocaleString()} EGP
                  </span>
                </div>
              </div>

              {/* Optional Category Breakdown Stacked Bar */}
              {breakdown.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span className="flex items-center gap-1 font-medium text-text-secondary">
                      <PieChart className="w-3.5 h-3.5 text-brand-blue" />
                      {isArabic ? 'توزيع المصروفات:' : 'Expense Category Breakdown:'}
                    </span>
                    <span className="tabular-nums">
                      {breakdown.length} {isArabic ? 'فئات' : 'categories'}
                    </span>
                  </div>

                  {/* Multi-segment bar */}
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-white/10">
                    {breakdown.map((item, idx) => {
                      const pct = Math.max(0, Number(item.percentage) || 0);
                      if (pct <= 0) return null;
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <div
                          key={item.category}
                          style={{ width: `${pct}%`, backgroundColor: color }}
                          className="h-full transition-all"
                          title={`${item.category}: ${Math.round(item.amount).toLocaleString()} EGP (${pct}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Category Legend Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {breakdown.map((item, idx) => {
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      return (
                        <div
                          key={item.category}
                          className="flex items-center gap-1.5 text-[11px] text-text-muted px-2 py-0.5 border border-white/5 bg-white/[0.02]"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-text-primary font-medium">{item.category}:</span>
                          <span className="tabular-nums">{Math.round(item.amount).toLocaleString()} EGP</span>
                          <span className="text-[10px] tabular-nums opacity-70">
                            ({item.percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {summary.notes && (
                <div className="p-2.5 border border-white/5 bg-white/[0.01] text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary mr-1">
                    {isArabic ? 'ملاحظات:' : 'Notes:'}
                  </span>
                  {summary.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

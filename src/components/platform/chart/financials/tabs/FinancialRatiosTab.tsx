'use client';

import React, { useState, useMemo } from 'react';
import { useSafeLocale } from '../useSafeLocale';
import type { CompanyFinancialStatement, CompanyValuationMetric } from '../types';
import { formatPercent, formatMultiple } from '../formatters';
import RatioBenchmarkBadge, {
  getRatioBenchmarkStatus,
} from '../components/RatioBenchmarkBadge';
import RatioSparkline from '../components/RatioSparkline';
import { Search, X } from '@/components/ui/icon-library';

export interface FinancialRatiosTabProps {
  statements?: CompanyFinancialStatement[];
  valuation?: CompanyValuationMetric | null;
  currency?: string;
  symbol?: string;
}

interface RatioDefinition {
  id: string;
  benchmarkKey: string;
  category: 'profitability' | 'liquidity' | 'leverage' | 'efficiency';
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  isPercentage: boolean;
  isInverseTrend?: boolean;
  calculator: (
    stmt: CompanyFinancialStatement,
    valuation: CompanyValuationMetric | null | undefined,
    isLatest: boolean
  ) => number | null | undefined;
}

const RATIO_DEFINITIONS: RatioDefinition[] = [
  // 1. Profitability & Margins
  {
    id: 'gross-margin',
    benchmarkKey: 'grossMargin',
    category: 'profitability',
    labelEn: 'Gross Margin %',
    labelAr: 'هامش الربح الإجمالي %',
    descEn: 'Gross Profit / Total Revenue',
    descAr: 'إجمالي الربح / إجمالي الإيرادات',
    isPercentage: true,
    calculator: (s) =>
      s.totalRevenue && s.grossProfit != null
        ? (s.grossProfit / s.totalRevenue) * 100
        : null,
  },
  {
    id: 'operating-margin',
    benchmarkKey: 'operatingMargin',
    category: 'profitability',
    labelEn: 'Operating Margin %',
    labelAr: 'هامش الربح التشغيلي %',
    descEn: 'Operating Income / Total Revenue',
    descAr: 'الربح التشغيلي / إجمالي الإيرادات',
    isPercentage: true,
    calculator: (s) =>
      s.totalRevenue && s.operatingIncome != null
        ? (s.operatingIncome / s.totalRevenue) * 100
        : null,
  },
  {
    id: 'net-margin',
    benchmarkKey: 'netMargin',
    category: 'profitability',
    labelEn: 'Net Profit Margin %',
    labelAr: 'هامش صافي الربح %',
    descEn: 'Net Income / Total Revenue',
    descAr: 'صافي الدخل / إجمالي الإيرادات',
    isPercentage: true,
    calculator: (s) =>
      s.totalRevenue && s.netIncome != null
        ? (s.netIncome / s.totalRevenue) * 100
        : null,
  },
  {
    id: 'roe',
    benchmarkKey: 'roe',
    category: 'profitability',
    labelEn: 'Return on Equity (ROE %)',
    labelAr: 'العائد على حقوق المساهمين (ROE %)',
    descEn: "Net Income / Shareholders' Equity",
    descAr: 'صافي الدخل / حقوق المساهمين',
    isPercentage: true,
    calculator: (s) =>
      s.totalEquity && s.totalEquity > 0 && s.netIncome != null
        ? (s.netIncome / s.totalEquity) * 100
        : null,
  },
  {
    id: 'roa',
    benchmarkKey: 'roa',
    category: 'profitability',
    labelEn: 'Return on Assets (ROA %)',
    labelAr: 'العائد على الأصول (ROA %)',
    descEn: 'Net Income / Total Assets',
    descAr: 'صافي الدخل / إجمالي الأصول',
    isPercentage: true,
    calculator: (s) =>
      s.totalAssets && s.totalAssets > 0 && s.netIncome != null
        ? (s.netIncome / s.totalAssets) * 100
        : null,
  },

  // 2. Liquidity & Working Capital
  {
    id: 'current-ratio',
    benchmarkKey: 'currentRatio',
    category: 'liquidity',
    labelEn: 'Current Ratio',
    labelAr: 'نسبة التداول (السيولة الجارية)',
    descEn: 'Current Assets / Current Liabilities',
    descAr: 'الأصول المتداولة / الالتزامات المتداولة',
    isPercentage: false,
    calculator: (s, val, isLatest) => {
      if (isLatest && val?.currentRatio != null) {
        return val.currentRatio;
      }
      return null;
    },
  },

  // 3. Leverage & Solvency
  {
    id: 'debt-to-equity',
    benchmarkKey: 'debtToEquity',
    category: 'leverage',
    labelEn: 'Debt-to-Equity',
    labelAr: 'نسبة الدين إلى حقوق المساهمين',
    descEn: "Total Debt / Shareholders' Equity",
    descAr: 'إجمالي الديون / حقوق المساهمين',
    isPercentage: false,
    isInverseTrend: true,
    calculator: (s) => {
      if (s.totalDebt == null || s.totalEquity == null) return null;
      if (s.totalEquity <= 0) return null;
      return s.totalDebt / s.totalEquity;
    },
  },
  {
    id: 'debt-to-assets',
    benchmarkKey: 'debtToAssets',
    category: 'leverage',
    labelEn: 'Debt-to-Assets',
    labelAr: 'نسبة الدين إلى إجمالي الأصول',
    descEn: 'Total Debt / Total Assets',
    descAr: 'إجمالي الديون / إجمالي الأصول',
    isPercentage: false,
    isInverseTrend: true,
    calculator: (s) =>
      s.totalDebt != null && s.totalAssets && s.totalAssets > 0
        ? s.totalDebt / s.totalAssets
        : null,
  },
  {
    id: 'financial-leverage',
    benchmarkKey: 'financialLeverage',
    category: 'leverage',
    labelEn: 'Financial Leverage Multiple',
    labelAr: 'مضاعف الرفع المالي',
    descEn: "Total Assets / Shareholders' Equity",
    descAr: 'إجمالي الأصول / حقوق المساهمين',
    isPercentage: false,
    isInverseTrend: true,
    calculator: (s) =>
      s.totalAssets != null && s.totalEquity && s.totalEquity > 0
        ? s.totalAssets / s.totalEquity
        : null,
  },

  // 4. Cash Flow & Operating Efficiency
  {
    id: 'fcf-margin',
    benchmarkKey: 'fcfMargin',
    category: 'efficiency',
    labelEn: 'Free Cash Flow Margin %',
    labelAr: 'هامش التدفق النقدي الحر %',
    descEn: 'Free Cash Flow / Total Revenue',
    descAr: 'التدفق النقدي الحر / إجمالي الإيرادات',
    isPercentage: true,
    calculator: (s) => {
      if (!s.totalRevenue) return null;
      const fcf =
        s.freeCashFlow != null
          ? s.freeCashFlow
          : s.operatingCashFlow != null && s.capitalExpenditures != null
          ? s.operatingCashFlow - s.capitalExpenditures
          : null;
      return fcf != null ? (fcf / s.totalRevenue) * 100 : null;
    },
  },
  {
    id: 'cash-conversion',
    benchmarkKey: 'cashConversion',
    category: 'efficiency',
    labelEn: 'Cash Conversion Quality',
    labelAr: 'جودة توليد النقد (CFO / صافي الدخل)',
    descEn: 'Operating Cash Flow / Net Income',
    descAr: 'التدفق التشغيلي / صافي الدخل',
    isPercentage: false,
    calculator: (s) =>
      s.operatingCashFlow != null && s.netIncome && s.netIncome !== 0
        ? s.operatingCashFlow / s.netIncome
        : null,
  },
  {
    id: 'asset-turnover',
    benchmarkKey: 'assetTurnover',
    category: 'efficiency',
    labelEn: 'Asset Turnover',
    labelAr: 'معدل دوران الأصول',
    descEn: 'Total Revenue / Total Assets',
    descAr: 'إجمالي الإيرادات / إجمالي الأصول',
    isPercentage: false,
    calculator: (s) =>
      s.totalRevenue != null && s.totalAssets && s.totalAssets > 0
        ? s.totalRevenue / s.totalAssets
        : null,
  },
];

const CATEGORIES = [
  {
    id: 'profitability',
    labelEn: 'Profitability & Margins',
    labelAr: 'الربحية وهوامش التشغيل',
  },
  {
    id: 'liquidity',
    labelEn: 'Liquidity & Working Capital',
    labelAr: 'السيولة ورأس المال العامل',
  },
  {
    id: 'leverage',
    labelEn: 'Leverage & Solvency',
    labelAr: 'الرافعة والملاءة المالية',
  },
  {
    id: 'efficiency',
    labelEn: 'Operating Efficiency & Cash Conversion',
    labelAr: 'كفاءة التشغيل والتدفق النقدي',
  },
] as const;

export default function FinancialRatiosTab({
  statements = [],
  valuation,
  symbol,
}: FinancialRatiosTabProps) {
  const locale = useSafeLocale();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Sort statements descending (latest period first on left, up to 10 years)
  const sortedStatements = useMemo(() => {
    return [...statements]
      .filter((s) => s.periodType === 'ANNUAL' || s.fiscalPeriod === 'FY' || !s.periodType)
      .sort((a, b) => b.fiscalYear - a.fiscalYear)
      .slice(0, 10);
  }, [statements]);

  // 2. Filter ratio rows by search query
  const filteredRatios = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return RATIO_DEFINITIONS;
    return RATIO_DEFINITIONS.filter((r) => {
      const en = r.labelEn.toLowerCase();
      const ar = r.labelAr.toLowerCase();
      return en.includes(query) || ar.includes(query);
    });
  }, [searchQuery]);

  if (sortedStatements.length === 0) {
    return (
      <div
        data-testid="ratios-no-data"
        className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-plt-border-soft bg-plt-card rounded-none font-sans"
      >
        <p className="text-sm font-semibold text-plt-text mb-1">
          {locale === 'ar'
            ? `لا تتوفر نسب مالية لرمز ${symbol || ''}`
            : `No financial ratios available for ${symbol || 'this company'}`}
        </p>
        <p className="text-xs text-plt-muted max-w-md">
          {locale === 'ar'
            ? 'يتطلب احتساب النسب المالية قوائم مالية سنوية مدققة متتابعة.'
            : 'Computing institutional financial ratios requires audited annual statements.'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="financial-ratios-tab"
      className="space-y-4 font-sans text-plt-text select-none"
    >
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-plt-base pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-plt-text">
            {locale === 'ar'
              ? 'تحليل النسب المالية عبر السنوات'
              : 'Multi-Year Financial Ratios Analysis'}
          </span>
          <span className="text-[10px] text-plt-muted bg-plt-hover border border-plt-border-soft px-1.5 py-0.5 rounded-none font-sans tabular-nums">
            {sortedStatements.length}{' '}
            {locale === 'ar' ? 'سنوات مالية' : 'Fiscal Years'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full sm:w-56">
          <div className="absolute start-2.5 pointer-events-none text-plt-muted flex items-center">
            <Search size={12} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === 'ar' ? 'تصفية النسب...' : 'Filter ratios...'}
            className="w-full h-7 ps-7 pe-6 text-xs bg-plt-card border border-plt-border-soft rounded-none text-plt-text placeholder:text-plt-muted focus:outline-none focus:border-plt-border-strong transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear filter"
              className="absolute end-2 text-plt-muted hover:text-plt-text cursor-pointer p-0.5"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Main Ratios Grid Table */}
      <div className="relative w-full border border-plt-border-soft bg-plt-base rounded-none font-sans select-none overflow-x-auto max-h-[640px] custom-scrollbar">
        <table className="w-full border-collapse text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-plt-border-soft">
              {/* Sticky Corner Header */}
              <th
                scope="col"
                className="w-[260px] sm:w-[320px] min-w-[260px] sm:min-w-[320px] sticky top-0 left-0 z-30 bg-plt-base border-r border-b border-plt-border-soft px-3 py-2.5 font-medium text-xs text-plt-muted text-left"
              >
                {locale === 'ar' ? 'النسبة ومؤشر الصحة' : 'Ratio & Health Benchmark'}
              </th>

              {/* Year Columns */}
              {sortedStatements.map((stmt) => (
                <th
                  key={stmt.fiscalYear}
                  scope="col"
                  className="w-[110px] sm:w-[130px] min-w-[110px] sm:min-w-[130px] sticky top-0 z-20 bg-plt-base border-b border-plt-border-soft px-3 py-2 text-right font-sans"
                >
                  <div className="font-semibold text-xs text-plt-text tabular-nums">
                    FY {stmt.fiscalYear}
                  </div>
                  {stmt.reportDate && (
                    <div className="text-[10px] text-plt-muted tabular-nums font-normal">
                      {stmt.reportDate}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {CATEGORIES.map((category) => {
              const categoryRatios = filteredRatios.filter(
                (r) => r.category === category.id
              );
              if (categoryRatios.length === 0) return null;

              const categoryTitle =
                locale === 'ar' ? category.labelAr : category.labelEn;

              return (
                <React.Fragment key={category.id}>
                  {/* Category Section Header Row */}
                  <tr className="border-b border-plt-border-soft bg-plt-card">
                    <td
                      colSpan={sortedStatements.length + 1}
                      className="px-3 py-2 font-semibold text-[11px] text-plt-text tracking-wider uppercase bg-plt-card border-b border-plt-border-soft"
                    >
                      {categoryTitle}
                    </td>
                  </tr>

                  {/* Ratio Rows in this Category */}
                  {categoryRatios.map((ratio) => {
                    const ratioTitle =
                      locale === 'ar' ? ratio.labelAr : ratio.labelEn;
                    const ratioDesc =
                      locale === 'ar' ? ratio.descAr : ratio.descEn;

                    // Compute values for each year (descending)
                    const valuesDescending = sortedStatements.map((stmt, idx) =>
                      ratio.calculator(stmt, valuation, idx === 0)
                    );

                    // Latest year value is at index 0
                    const latestVal = valuesDescending[0];
                    const benchmarkStatus = getRatioBenchmarkStatus(
                      ratio.benchmarkKey,
                      latestVal
                    );

                    // For the sparkline, pass values in chronological order (oldest to latest)
                    const valuesChronological = [...valuesDescending].reverse();

                    return (
                      <tr
                        key={ratio.id}
                        className="group border-b border-plt-border-soft hover:bg-plt-hover transition-colors"
                      >
                        {/* Sticky First Column: Title, Benchmark Badge & Mini Sparkline */}
                        <td className="w-[260px] sm:w-[320px] min-w-[260px] sm:min-w-[320px] sticky left-0 z-10 bg-plt-base group-hover:bg-plt-hover transition-colors border-r border-plt-border-soft px-3 py-2.5 font-sans">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0 pr-1">
                              <span
                                className="font-medium text-xs text-plt-text truncate"
                                title={ratioTitle}
                              >
                                {ratioTitle}
                              </span>
                              <span
                                className="text-[10px] text-plt-muted truncate"
                                title={ratioDesc}
                              >
                                {ratioDesc}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Inline mini sparkline */}
                              <RatioSparkline
                                values={valuesChronological}
                                isInverseTrend={ratio.isInverseTrend}
                              />

                              {/* Health Benchmark Pill */}
                              {benchmarkStatus && (
                                <RatioBenchmarkBadge status={benchmarkStatus} />
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Year Value Columns */}
                        {valuesDescending.map((val, colIdx) => {
                          const formattedVal =
                            val == null || Number.isNaN(val)
                              ? '—'
                              : ratio.isPercentage
                              ? formatPercent(val)
                              : formatMultiple(val, 'x');

                          return (
                            <td
                              key={`${ratio.id}-${sortedStatements[colIdx].fiscalYear}`}
                              className="w-[110px] sm:w-[130px] min-w-[110px] sm:min-w-[130px] text-right px-3 py-2 font-sans tabular-nums border-b border-plt-border-soft group-hover:bg-plt-hover transition-colors text-xs text-plt-text cursor-default"
                            >
                              <span
                                className={
                                  val != null && !Number.isNaN(val)
                                    ? 'text-plt-text font-medium'
                                    : 'text-plt-muted'
                                }
                              >
                                {formattedVal}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

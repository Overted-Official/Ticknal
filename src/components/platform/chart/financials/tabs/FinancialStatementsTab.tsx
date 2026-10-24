'use client';

import React, { useState } from 'react';
import { useSafeLocale } from '../useSafeLocale';
import type {
  CompanyFinancialStatement,
  StatementType,
  PeriodFrequency,
} from '../types';
import { formatPercent } from '../formatters';
import StatementDataGrid, {
  type StatementRowDef,
} from '../components/StatementDataGrid';
import { Search, X } from '@/components/ui/icon-library';

export interface FinancialStatementsTabProps {
  statements?: {
    annual: CompanyFinancialStatement[];
    quarterly: CompanyFinancialStatement[];
  };
  currency?: string;
  symbol?: string;
  frequency?: PeriodFrequency;
  onFrequencyChange?: (freq: PeriodFrequency) => void;
}

export default function FinancialStatementsTab({
  statements,
  currency = 'EGP',
  symbol,
  frequency: controlledFrequency,
  onFrequencyChange,
}: FinancialStatementsTabProps) {
  const locale = useSafeLocale();

  const [localFrequency, setLocalFrequency] = useState<PeriodFrequency>('annual');
  const activeFrequency = controlledFrequency ?? localFrequency;

  const handleFrequencyChange = (freq: PeriodFrequency) => {
    if (onFrequencyChange) {
      onFrequencyChange(freq);
    } else {
      setLocalFrequency(freq);
    }
  };

  const [activeStatement, setActiveStatement] =
    useState<StatementType>('income');
  const [searchQuery, setSearchQuery] = useState('');

  const annualList = statements?.annual ?? [];
  const quarterlyList = statements?.quarterly ?? [];
  const currentStatements =
    activeFrequency === 'annual' ? annualList : quarterlyList;

  // 1. Income Statement Rows
  const incomeRows: StatementRowDef[] = [
    {
      id: 'totalRevenue',
      labelEn: 'Total Revenue',
      labelAr: 'إجمالي الإيرادات',
      isTotal: true,
      getter: (s) => s.totalRevenue,
    },
    {
      id: 'grossProfit',
      labelEn: 'Gross Profit',
      labelAr: 'إجمالي الربح',
      getter: (s) => s.grossProfit,
    },
    {
      id: 'grossMargin',
      labelEn: 'Gross Margin %',
      labelAr: 'هامش الربح الإجمالي %',
      indent: true,
      isPercentage: true,
      getter: (s) =>
        s.totalRevenue && s.grossProfit != null
          ? (s.grossProfit / s.totalRevenue) * 100
          : null,
      formatter: (val) => formatPercent(val),
    },
    {
      id: 'operatingIncome',
      labelEn: 'Operating Income (EBIT)',
      labelAr: 'الربح التشغيلي (EBIT)',
      getter: (s) => s.operatingIncome,
    },
    {
      id: 'operatingMargin',
      labelEn: 'Operating Margin %',
      labelAr: 'هامش التشغيل %',
      indent: true,
      isPercentage: true,
      getter: (s) =>
        s.totalRevenue && s.operatingIncome != null
          ? (s.operatingIncome / s.totalRevenue) * 100
          : null,
      formatter: (val) => formatPercent(val),
    },
    {
      id: 'ebitda',
      labelEn: 'EBITDA',
      labelAr: 'الأرباح التشغيلية قبل الإهلاك (EBITDA)',
      getter: (s) => s.ebitda,
    },
    {
      id: 'netIncome',
      labelEn: 'Net Income',
      labelAr: 'صافي الدخل',
      isTotal: true,
      getter: (s) => s.netIncome,
      colorClass: (v) =>
        v == null ? undefined : v >= 0 ? 'text-plt-profit' : 'text-plt-risk',
    },
    {
      id: 'netMargin',
      labelEn: 'Net Profit Margin %',
      labelAr: 'هامش صافي الربح %',
      indent: true,
      isPercentage: true,
      getter: (s) =>
        s.totalRevenue && s.netIncome != null
          ? (s.netIncome / s.totalRevenue) * 100
          : null,
      formatter: (val) => formatPercent(val),
      colorClass: (v) =>
        v == null ? undefined : v >= 0 ? 'text-plt-profit' : 'text-plt-risk',
    },
    {
      id: 'epsBasic',
      labelEn: 'Basic EPS',
      labelAr: 'ربحية السهم الأساسية',
      getter: (s) => s.epsBasic,
      formatter: (v) => (v != null && !Number.isNaN(v) ? v.toFixed(2) : '—'),
      rawFormatter: (v) =>
        v != null && !Number.isNaN(v) ? v.toFixed(4) : '—',
    },
    {
      id: 'epsDiluted',
      labelEn: 'Diluted EPS',
      labelAr: 'ربحية السهم المخفضة',
      getter: (s) => s.epsDiluted,
      formatter: (v) => (v != null && !Number.isNaN(v) ? v.toFixed(2) : '—'),
      rawFormatter: (v) =>
        v != null && !Number.isNaN(v) ? v.toFixed(4) : '—',
    },
  ];

  // 2. Balance Sheet Rows
  const balanceRows: StatementRowDef[] = [
    {
      id: 'cashAndEquivalents',
      labelEn: 'Cash & Short-Term Investments',
      labelAr: 'النقد وما في حكمه',
      getter: (s) => s.cashAndEquivalents,
    },
    {
      id: 'totalAssets',
      labelEn: 'Total Assets',
      labelAr: 'إجمالي الأصول',
      isTotal: true,
      getter: (s) => s.totalAssets,
    },
    {
      id: 'totalDebt',
      labelEn: 'Total Debt (Short & Long-Term)',
      labelAr: 'إجمالي الديون',
      getter: (s) => s.totalDebt,
    },
    {
      id: 'netDebt',
      labelEn: 'Net Debt',
      labelAr: 'صافي الدين (الدين - النقد)',
      indent: true,
      getter: (s) =>
        s.totalDebt != null && s.cashAndEquivalents != null
          ? s.totalDebt - s.cashAndEquivalents
          : null,
      colorClass: (v) =>
        v == null ? undefined : v > 0 ? 'text-plt-warning' : 'text-plt-profit',
    },
    {
      id: 'totalLiabilities',
      labelEn: 'Total Liabilities',
      labelAr: 'إجمالي الالتزامات',
      isTotal: true,
      getter: (s) => s.totalLiabilities,
    },
    {
      id: 'totalEquity',
      labelEn: "Total Shareholders' Equity",
      labelAr: 'إجمالي حقوق المساهمين',
      isTotal: true,
      getter: (s) => s.totalEquity,
    },
  ];

  // 3. Cash Flow Rows
  const cashflowRows: StatementRowDef[] = [
    {
      id: 'operatingCashFlow',
      labelEn: 'Operating Cash Flow (CFO)',
      labelAr: 'التدفقات النقدية التشغيلية (CFO)',
      isTotal: true,
      getter: (s) => s.operatingCashFlow,
      colorClass: (v) =>
        v == null ? undefined : v >= 0 ? 'text-plt-profit' : 'text-plt-risk',
    },
    {
      id: 'capitalExpenditures',
      labelEn: 'Capital Expenditures (CapEx)',
      labelAr: 'النفقات الرأسمالية (CapEx)',
      getter: (s) => s.capitalExpenditures,
    },
    {
      id: 'freeCashFlow',
      labelEn: 'Free Cash Flow (FCF)',
      labelAr: 'التدفق النقدي الحر (FCF)',
      isTotal: true,
      getter: (s) =>
        s.freeCashFlow != null
          ? s.freeCashFlow
          : s.operatingCashFlow != null && s.capitalExpenditures != null
          ? s.operatingCashFlow - s.capitalExpenditures
          : null,
      colorClass: (v) =>
        v == null ? undefined : v >= 0 ? 'text-plt-profit' : 'text-plt-risk',
    },
  ];

  const getActiveRows = (): StatementRowDef[] => {
    switch (activeStatement) {
      case 'income':
        return incomeRows;
      case 'balance':
        return balanceRows;
      case 'cashflow':
        return cashflowRows;
      default:
        return incomeRows;
    }
  };

  const hasAnyData = annualList.length > 0 || quarterlyList.length > 0;

  if (!hasAnyData) {
    return (
      <div
        data-testid="statements-no-data"
        className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border border-plt-border-soft bg-plt-card rounded-none font-sans"
      >
        <p className="text-sm font-semibold text-plt-text mb-1">
          {locale === 'ar'
            ? `لا تتوفر قوائم مالية لرمز ${symbol || ''}`
            : `No financial statements available for ${symbol || 'this company'}`}
        </p>
        <p className="text-xs text-plt-muted max-w-md">
          {locale === 'ar'
            ? 'لم يتم إدراج بيانات القوائم المالية المدققة للشركة بعد.'
            : 'Audited statements have not been ingested for this ticker yet.'}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="financial-statements-tab"
      className="space-y-4 font-sans text-plt-text select-none"
    >
      {/* Controls Bar: Statement Selectors + Frequency + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-plt-base pb-1">
        {/* Statement Pills */}
        <div
          role="tablist"
          aria-label="Financial Statement Selector"
          className="flex items-center gap-1.5 flex-wrap"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStatement === 'income'}
            onClick={() => setActiveStatement('income')}
            className={`px-3 py-1.5 text-xs font-medium rounded-none border transition-colors cursor-pointer ${
              activeStatement === 'income'
                ? 'bg-plt-active text-plt-text border-plt-border-strong'
                : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover border-transparent'
            }`}
          >
            {locale === 'ar' ? 'قائمة الدخل' : 'Income Statement'}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatement === 'balance'}
            onClick={() => setActiveStatement('balance')}
            className={`px-3 py-1.5 text-xs font-medium rounded-none border transition-colors cursor-pointer ${
              activeStatement === 'balance'
                ? 'bg-plt-active text-plt-text border-plt-border-strong'
                : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover border-transparent'
            }`}
          >
            {locale === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeStatement === 'cashflow'}
            onClick={() => setActiveStatement('cashflow')}
            className={`px-3 py-1.5 text-xs font-medium rounded-none border transition-colors cursor-pointer ${
              activeStatement === 'cashflow'
                ? 'bg-plt-active text-plt-text border-plt-border-strong'
                : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover border-transparent'
            }`}
          >
            {locale === 'ar' ? 'التدفقات النقدية' : 'Cash Flow'}
          </button>
        </div>

        {/* Right side: Frequency Toggle + Search Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Frequency Toggle */}
          <div className="flex items-center border border-plt-border-soft bg-plt-card p-0.5 rounded-none">
            <button
              type="button"
              onClick={() => handleFrequencyChange('annual')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-none transition-colors cursor-pointer ${
                activeFrequency === 'annual'
                  ? 'bg-plt-active text-plt-text border border-plt-border-strong shadow-xs'
                  : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover border border-transparent'
              }`}
            >
              {locale === 'ar' ? 'سنوي (FY)' : 'Annual (FY)'}
            </button>
            <button
              type="button"
              onClick={() => handleFrequencyChange('quarterly')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-none transition-colors cursor-pointer ${
                activeFrequency === 'quarterly'
                  ? 'bg-plt-active text-plt-text border border-plt-border-strong shadow-xs'
                  : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover border border-transparent'
              }`}
            >
              {locale === 'ar' ? 'ربع سنوي (FQ)' : 'Quarterly (FQ)'}
            </button>
          </div>

          {/* Search Line Items */}
          <div className="relative flex items-center min-w-[160px] sm:w-48">
            <div className="absolute start-2.5 pointer-events-none text-plt-muted flex items-center">
              <Search size={12} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === 'ar' ? 'بحث في البنود...' : 'Search line items...'
              }
              className="w-full h-7 ps-7 pe-6 text-xs bg-plt-card border border-plt-border-soft rounded-none text-plt-text placeholder:text-plt-muted focus:outline-none focus:border-plt-border-strong transition-colors font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute end-2 text-plt-muted hover:text-plt-text cursor-pointer p-0.5"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3-Statement Data Grid */}
      <StatementDataGrid
        statements={currentStatements}
        currency={currency}
        frequency={activeFrequency}
        rows={getActiveRows()}
        searchQuery={searchQuery}
        emptyMessage={
          locale === 'ar'
            ? activeFrequency === 'annual'
              ? 'لا تتوفر قوائم مالية سنوية مدققة.'
              : 'لا تتوفر قوائم مالية ربع سنوية مدققة.'
            : activeFrequency === 'annual'
            ? 'No audited annual statements available.'
            : 'No quarterly filing statements available.'
        }
      />
    </div>
  );
}

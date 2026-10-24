'use client';

import React from 'react';
import { useSafeLocale } from '../useSafeLocale';
import type { CompanyValuationMetric } from '../types';
import {
  formatSmartCompact,
  formatPercent,
  formatMultiple,
} from '../formatters';

export interface ValuationMultiplesGridProps {
  valuation?: CompanyValuationMetric | null;
  currency?: string;
}

interface MetricItem {
  id: string;
  labelEn: string;
  labelAr: string;
  value: string;
  colorClass?: string;
  sublabelEn?: string;
  sublabelAr?: string;
}

export default function ValuationMultiplesGrid({
  valuation,
  currency = 'EGP',
}: ValuationMultiplesGridProps) {
  const locale = useSafeLocale();

  const metrics: MetricItem[] = [
    {
      id: 'market-cap',
      labelEn: 'Market Cap',
      labelAr: 'القيمة السوقية',
      value: formatSmartCompact(valuation?.marketCap, currency),
      sublabelEn: 'Current Market Valuation',
      sublabelAr: 'إجمالي تقييم السوق الحالي',
    },
    {
      id: 'enterprise-value',
      labelEn: 'Enterprise Value',
      labelAr: 'قيمة المنشأة (EV)',
      value: formatSmartCompact(valuation?.enterpriseValue, currency),
      sublabelEn: 'Market Cap + Debt - Cash',
      sublabelAr: 'القيمة السوقية + الديون - النقد',
    },
    {
      id: 'pe-ttm',
      labelEn: 'P/E (TTM)',
      labelAr: 'مضاعف الربحية (TTM)',
      value: formatMultiple(valuation?.peRatioTtm),
      colorClass:
        valuation?.peRatioTtm && valuation.peRatioTtm > 0
          ? 'text-plt-text'
          : 'text-plt-muted',
      sublabelEn: 'Price / Net Income (12M)',
      sublabelAr: 'السعر / صافي الدخل آخر 12 شهر',
    },
    {
      id: 'forward-pe',
      labelEn: 'Forward P/E',
      labelAr: 'مضاعف الربحية المستقبلي',
      value: formatMultiple(valuation?.forwardPe),
      colorClass:
        valuation?.forwardPe && valuation.forwardPe > 0
          ? 'text-plt-text'
          : 'text-plt-muted',
      sublabelEn: 'Price / Next Year EPS Est.',
      sublabelAr: 'السعر / تقديرات أرباح العام القادم',
    },
    {
      id: 'pb-ratio',
      labelEn: 'Price to Book (P/B)',
      labelAr: 'السعر / الدفترية (P/B)',
      value: formatMultiple(valuation?.pbRatio),
      colorClass:
        valuation?.pbRatio && valuation.pbRatio > 0
          ? 'text-plt-text'
          : 'text-plt-muted',
      sublabelEn: 'Market Cap / Book Value',
      sublabelAr: 'القيمة السوقية / حقوق الملكية',
    },
    {
      id: 'ps-ratio',
      labelEn: 'Price to Sales (P/S)',
      labelAr: 'السعر / المبيعات (P/S)',
      value: formatMultiple(valuation?.psRatioTtm),
      colorClass:
        valuation?.psRatioTtm && valuation.psRatioTtm > 0
          ? 'text-plt-text'
          : 'text-plt-muted',
      sublabelEn: 'Market Cap / Total Revenue',
      sublabelAr: 'القيمة السوقية / إجمالي الإيرادات',
    },
    {
      id: 'ev-ebitda',
      labelEn: 'EV / EBITDA',
      labelAr: 'قيمة المنشأة / الأرباح التشغيلية',
      value: formatMultiple(valuation?.evToEbitda),
      colorClass:
        valuation?.evToEbitda && valuation.evToEbitda > 0
          ? 'text-plt-text'
          : 'text-plt-muted',
      sublabelEn: 'Firm Value / Operating Cash Flow Proxy',
      sublabelAr: 'قيمة المنشأة / الأرباح قبل الفوائد والضرائب',
    },
    {
      id: 'dividend-yield',
      labelEn: 'Dividend Yield',
      labelAr: 'عائد التوزيعات',
      value: formatPercent(valuation?.dividendYield),
      colorClass:
        valuation?.dividendYield && valuation.dividendYield > 0
          ? 'text-plt-profit'
          : 'text-plt-text',
      sublabelEn: 'Annual Cash Dividend / Price',
      sublabelAr: 'التوزيعات النقدية السنوية / السعر',
    },
    {
      id: 'fcf-yield',
      labelEn: 'FCF Yield',
      labelAr: 'عائد التدفق الحر (FCF)',
      value: formatPercent(valuation?.freeCashFlowYield),
      colorClass:
        valuation?.freeCashFlowYield && valuation.freeCashFlowYield > 0
          ? 'text-plt-profit'
          : valuation?.freeCashFlowYield && valuation.freeCashFlowYield < 0
          ? 'text-plt-risk'
          : 'text-plt-text',
      sublabelEn: 'Free Cash Flow / Market Cap',
      sublabelAr: 'التدفق النقدي الحر / القيمة السوقية',
    },
    {
      id: 'roe',
      labelEn: 'Return on Equity (ROE)',
      labelAr: 'العائد على حقوق الملكية (ROE)',
      value: formatPercent(valuation?.roe),
      colorClass:
        valuation?.roe && valuation.roe > 0
          ? 'text-plt-profit'
          : valuation?.roe && valuation.roe < 0
          ? 'text-plt-risk'
          : 'text-plt-text',
      sublabelEn: 'Net Profitability / Shareholders Equity',
      sublabelAr: 'صافي الربح / حقوق المساهمين',
    },
    {
      id: 'roa',
      labelEn: 'Return on Assets (ROA)',
      labelAr: 'العائد على الأصول (ROA)',
      value: formatPercent(valuation?.roa),
      colorClass:
        valuation?.roa && valuation.roa > 0
          ? 'text-plt-profit'
          : valuation?.roa && valuation.roa < 0
          ? 'text-plt-risk'
          : 'text-plt-text',
      sublabelEn: 'Net Income / Total Assets',
      sublabelAr: 'صافي الربح / إجمالي الأصول',
    },
    {
      id: 'current-ratio',
      labelEn: 'Current Ratio',
      labelAr: 'نسبة التداول (السيولة)',
      value: formatMultiple(valuation?.currentRatio),
      colorClass:
        valuation?.currentRatio && valuation.currentRatio >= 1
          ? 'text-plt-profit'
          : valuation?.currentRatio && valuation.currentRatio < 1
          ? 'text-plt-risk'
          : 'text-plt-text',
      sublabelEn: 'Current Assets / Current Liabilities',
      sublabelAr: 'الأصول المتداولة / الخصوم المتداولة',
    },
  ];

  return (
    <div
      data-testid="valuation-multiples-grid"
      className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
    >
      {metrics.map((item) => (
        <div
          key={item.id}
          data-testid={`kpi-card-${item.id}`}
          className="bg-plt-card border border-plt-border-soft p-3 sm:p-3.5 rounded-none font-sans flex flex-col justify-between transition-colors hover:border-plt-border-strong group"
        >
          <div>
            <div className="text-[11px] text-plt-muted font-normal uppercase tracking-wider truncate">
              {locale === 'ar' ? item.labelAr : item.labelEn}
            </div>
            <div
              className={`text-base sm:text-lg font-bold font-sans tabular-nums mt-1 ${
                item.colorClass ?? 'text-plt-text'
              }`}
            >
              {item.value}
            </div>
          </div>
          <div className="text-[10px] text-plt-faint truncate mt-2 hidden sm:block">
            {locale === 'ar' ? item.sublabelAr : item.sublabelEn}
          </div>
        </div>
      ))}
    </div>
  );
}

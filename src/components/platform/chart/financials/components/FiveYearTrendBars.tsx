'use client';

import React, { useState } from 'react';
import { useSafeLocale } from '../useSafeLocale';
import { BarChart3 } from '@/components/ui/icon-library';
import type { CompanyFinancialStatement } from '../types';
import { formatSmartCompact, formatPercent, formatYoYDelta } from '../formatters';

export interface FiveYearTrendBarsProps {
  statements?: CompanyFinancialStatement[];
  currency?: string;
}

export default function FiveYearTrendBars({
  statements = [],
  currency = 'EGP',
}: FiveYearTrendBarsProps) {
  const locale = useSafeLocale();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter annual statements, sort ascending by fiscalYear, take up to the last 5
  const annual = statements
    .filter((s) => s.periodType?.toUpperCase() === 'ANNUAL' && s.fiscalYear)
    .sort((a, b) => a.fiscalYear - b.fiscalYear);

  const last5 = annual.slice(-5);

  if (last5.length === 0) {
    return (
      <div
        data-testid="five-year-trend-empty"
        className="bg-plt-card border border-plt-border-soft p-5 rounded-none font-sans text-center text-xs text-plt-muted"
      >
        {locale === 'ar'
          ? 'لا تتوفر قوائم مالية سنوية لعرض المؤشر التاريخي'
          : 'No historical annual statements available for trend analysis'}
      </div>
    );
  }

  // Find max value for scaling bar heights
  const maxAbsValue = Math.max(
    ...last5.map((d) =>
      Math.max(Math.abs(d.totalRevenue ?? 0), Math.abs(d.netIncome ?? 0))
    ),
    1
  );

  return (
    <div
      data-testid="five-year-trend-bars"
      className="bg-plt-card border border-plt-border-soft p-4 sm:p-5 rounded-none font-sans"
    >
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-plt-border-soft gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center bg-plt-hover border border-plt-border-soft text-plt-text rounded-none">
            <BarChart3 size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-plt-text tracking-tight">
              {locale === 'ar'
                ? 'تطور الإيرادات والأرباح السنوية'
                : '5-Year Revenue & Net Income Trend'}
            </h3>
            <p className="text-[11px] text-plt-muted">
              {locale === 'ar'
                ? 'مقارنة سنوية تاريخية لآخر 5 سنوات مالية معتمدة'
                : 'Annual audited financial performance across the last 5 fiscal years'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-white/30 border border-white/40 rounded-none inline-block" />
            <span className="text-plt-muted">
              {locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-plt-profit rounded-none inline-block" />
            <span className="text-plt-muted">
              {locale === 'ar' ? 'صافي الربح' : 'Net Income'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-6 pt-2 pb-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-6 h-48 sm:h-56 items-end border-b border-plt-border-soft/80 pb-2">
          {last5.map((item, index) => {
            const rev = item.totalRevenue ?? 0;
            const ni = item.netIncome ?? 0;

            const revHeightPct = Math.min(100, Math.max(4, (Math.abs(rev) / maxAbsValue) * 100));
            const niHeightPct = Math.min(100, Math.max(4, (Math.abs(ni) / maxAbsValue) * 100));

            const isNegativeNi = ni < 0;
            const isHovered = hoveredIndex === index;

            // Prior year for YoY comparison
            const priorYear = index > 0 ? last5[index - 1] : null;
            const revYoY = priorYear ? formatYoYDelta(rev, priorYear.totalRevenue) : null;
            const margin = rev > 0 ? (ni / rev) * 100 : null;

            return (
              <div
                key={item.id ?? item.fiscalYear}
                data-testid={`trend-year-${item.fiscalYear}`}
                className="relative flex flex-col items-center justify-end h-full group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Hover Tooltip Card */}
                {isHovered && (
                  <div className="absolute -top-24 sm:-top-28 left-1/2 -translate-x-1/2 z-30 bg-[#3d3d3d] text-white border border-plt-border-strong p-2 sm:p-2.5 rounded-none shadow-xl min-w-[160px] sm:min-w-[190px] text-left pointer-events-none font-sans">
                    <div className="text-[11px] font-bold text-white/90 border-b border-white/10 pb-1 mb-1.5 flex justify-between items-center">
                      <span>FY {item.fiscalYear}</span>
                      {revYoY && (
                        <span
                          className={`text-[10px] font-sans tabular-nums ${
                            revYoY.positive ? 'text-plt-profit' : 'text-plt-risk'
                          }`}
                        >
                          YoY: {revYoY.label}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-[11px] font-sans tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-white/70">
                          {locale === 'ar' ? 'الإيرادات:' : 'Revenue:'}
                        </span>
                        <span className="font-semibold text-white">
                          {formatSmartCompact(rev, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">
                          {locale === 'ar' ? 'صافي الربح:' : 'Net Income:'}
                        </span>
                        <span
                          className={`font-semibold ${
                            isNegativeNi ? 'text-plt-risk' : 'text-plt-profit'
                          }`}
                        >
                          {formatSmartCompact(ni, currency)}
                        </span>
                      </div>
                      {margin !== null && (
                        <div className="flex justify-between border-t border-white/10 pt-1 text-[10px]">
                          <span className="text-white/60">
                            {locale === 'ar' ? 'هامش الربح:' : 'Margin:'}
                          </span>
                          <span className="font-semibold text-white/90">
                            {formatPercent(margin)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dual Bars Container */}
                <div className="flex items-end justify-center gap-1 sm:gap-2 w-full h-full pb-1">
                  {/* Revenue Bar */}
                  <div
                    className="w-1/2 max-w-[28px] bg-white/20 hover:bg-white/35 transition-all duration-200 rounded-none relative"
                    style={{ height: `${revHeightPct}%` }}
                    title={`Revenue: ${formatSmartCompact(rev, currency)}`}
                  />

                  {/* Net Income Bar */}
                  <div
                    className={`w-1/2 max-w-[28px] transition-all duration-200 rounded-none relative ${
                      isNegativeNi
                        ? 'bg-plt-risk hover:bg-plt-risk/80'
                        : 'bg-plt-profit hover:bg-plt-profit/80'
                    }`}
                    style={{ height: `${niHeightPct}%` }}
                    title={`Net Income: ${formatSmartCompact(ni, currency)}`}
                  />
                </div>

                {/* Fiscal Year Label */}
                <div
                  className={`text-[11px] font-sans tabular-nums mt-2 transition-colors ${
                    isHovered ? 'text-plt-text font-bold' : 'text-plt-muted'
                  }`}
                >
                  {`FY${item.fiscalYear}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

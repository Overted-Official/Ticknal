'use client';

import React, { useState, useMemo } from 'react';
import { useSafeLocale } from '../useSafeLocale';
import type { CompanyFinancialStatement, PeriodFrequency } from '../types';
import {
  formatSmartCompact,
  formatExactRaw,
  formatYoYDelta,
} from '../formatters';

export interface StatementRowDef {
  id: string;
  labelEn: string;
  labelAr: string;
  getter: (stmt: CompanyFinancialStatement) => number | null | undefined;
  formatter?: (val: number | null | undefined, currency?: string) => string;
  rawFormatter?: (val: number | null | undefined, currency?: string) => string;
  isTotal?: boolean;
  indent?: boolean;
  isPercentage?: boolean;
  colorClass?: (val: number | null | undefined) => string | undefined;
}

export interface StatementDataGridProps {
  statements: CompanyFinancialStatement[];
  currency?: string;
  frequency?: PeriodFrequency;
  rows: StatementRowDef[];
  searchQuery?: string;
  emptyMessage?: string;
}

interface TooltipState {
  title: string;
  periodLabel: string;
  rawText: string;
  x: number;
  y: number;
}

export default function StatementDataGrid({
  statements = [],
  currency = 'EGP',
  frequency = 'annual',
  rows = [],
  searchQuery = '',
  emptyMessage,
}: StatementDataGridProps) {
  const locale = useSafeLocale();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // 1. Sort statements descending: latest period first on the left
  const sortedStatements = useMemo(() => {
    return [...statements].sort((a, b) => {
      if (b.fiscalYear !== a.fiscalYear) {
        return b.fiscalYear - a.fiscalYear;
      }
      const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
      const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return (b.fiscalPeriod || '').localeCompare(a.fiscalPeriod || '');
    });
  }, [statements]);

  // 2. Filter rows according to search query
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const en = r.labelEn.toLowerCase();
      const ar = r.labelAr.toLowerCase();
      return en.includes(query) || ar.includes(query);
    });
  }, [rows, searchQuery]);

  // Quick lookup helper for finding prior year / prior period
  const getPriorStatement = (
    stmt: CompanyFinancialStatement,
    currentIndex: number
  ): CompanyFinancialStatement | undefined => {
    if (frequency === 'annual') {
      const priorYear = sortedStatements.find(
        (s) => s.fiscalYear === stmt.fiscalYear - 1
      );
      return priorYear || sortedStatements[currentIndex + 1];
    }

    // For quarterly, look for matching fiscal period from prior year (YoY)
    const priorQuarterSameYearBefore = sortedStatements.find(
      (s) =>
        s.fiscalYear === stmt.fiscalYear - 1 &&
        s.fiscalPeriod === stmt.fiscalPeriod
    );
    return priorQuarterSameYearBefore || sortedStatements[currentIndex + 1];
  };

  const getPeriodLabel = (stmt: CompanyFinancialStatement): string => {
    if (frequency === 'annual') {
      return stmt.fiscalPeriod === 'FY' || !stmt.fiscalPeriod
        ? `FY ${stmt.fiscalYear}`
        : `${stmt.fiscalPeriod} ${stmt.fiscalYear}`;
    }
    return `${stmt.fiscalYear}-${stmt.fiscalPeriod}`;
  };

  if (sortedStatements.length === 0) {
    return (
      <div
        data-testid="statement-grid-empty"
        className="p-8 text-center flex flex-col items-center justify-center min-h-[220px] border border-plt-border-soft bg-plt-base rounded-none select-none font-sans"
      >
        <p className="text-xs text-plt-muted">
          {emptyMessage ||
            (locale === 'ar'
              ? 'لا توجد بيانات متاحة لهذه القائمة المالية.'
              : 'No statements data available for this view.')}
        </p>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div
        data-testid="statement-grid-search-empty"
        className="p-8 text-center flex flex-col items-center justify-center min-h-[180px] border border-plt-border-soft bg-plt-base rounded-none select-none font-sans"
      >
        <p className="text-xs text-plt-muted">
          {locale === 'ar'
            ? `لا توجد بنود تطابق البحث: "${searchQuery}"`
            : `No line items match your search: "${searchQuery}"`}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="statement-data-grid"
      className="relative w-full border border-plt-border-soft bg-plt-base rounded-none font-sans select-none"
    >
      {/* Floating Tooltip with hover-card surface */}
      {tooltip && (
        <div
          data-testid="statement-cell-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
          className="hover-card z-50 pointer-events-none bg-plt-hovercard text-plt-text text-[11px] px-2.5 py-1.5 rounded-none shadow-2xl border border-plt-border-strong whitespace-nowrap font-sans flex flex-col gap-0.5 leading-tight"
        >
          <div className="text-[10px] text-plt-muted font-medium flex items-center justify-between gap-4">
            <span>{tooltip.title}</span>
            <span>{tooltip.periodLabel}</span>
          </div>
          <div className="text-plt-text font-semibold tabular-nums text-xs">
            {tooltip.rawText}
          </div>
        </div>
      )}

      {/* Table Scroll Container */}
      <div
        onScroll={() => setTooltip(null)}
        className="overflow-x-auto overflow-y-auto max-h-[580px] custom-scrollbar"
      >
        <table className="w-full border-collapse text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-plt-border-soft">
              {/* Sticky Top-Left Corner Cell */}
              <th
                scope="col"
                className="w-[200px] sm:w-[240px] min-w-[200px] sm:min-w-[240px] sticky top-0 left-0 z-30 bg-plt-base border-r border-b border-plt-border-soft px-3 py-2.5 font-medium text-xs text-plt-muted tracking-tight text-left"
              >
                {locale === 'ar' ? 'البند المالي' : 'Financial Line Item'}
              </th>

              {/* Sticky Header Period Columns */}
              {sortedStatements.map((stmt) => {
                const label = getPeriodLabel(stmt);
                return (
                  <th
                    key={`${stmt.fiscalYear}-${stmt.fiscalPeriod}-${stmt.reportDate}`}
                    scope="col"
                    className="w-[130px] sm:w-[150px] min-w-[130px] sm:min-w-[150px] sticky top-0 z-20 bg-plt-base border-b border-plt-border-soft px-3 py-2 text-right font-sans"
                  >
                    <div className="font-semibold text-xs text-plt-text tabular-nums">
                      {label}
                    </div>
                    {stmt.reportDate && (
                      <div className="text-[10px] text-plt-muted tabular-nums font-normal">
                        {stmt.reportDate}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row) => {
              const rowTitle = locale === 'ar' ? row.labelAr : row.labelEn;

              return (
                <tr
                  key={row.id}
                  className="group border-b border-plt-border-soft hover:bg-plt-hover transition-colors"
                >
                  {/* Sticky First Column for Metric Title */}
                  <td
                    className={`w-[200px] sm:w-[240px] min-w-[200px] sm:min-w-[240px] sticky left-0 z-10 bg-plt-base group-hover:bg-plt-hover transition-colors border-r border-plt-border-soft px-3 py-2.5 font-sans text-xs ${
                      row.isTotal
                        ? 'font-bold text-plt-text bg-plt-base'
                        : row.indent
                        ? 'pl-6 text-plt-muted'
                        : 'font-medium text-plt-text'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate" title={rowTitle}>
                        {rowTitle}
                      </span>
                    </div>
                  </td>

                  {/* Period Value Cells */}
                  {sortedStatements.map((stmt, colIdx) => {
                    const curVal = row.getter(stmt);
                    const priorStmt = getPriorStatement(stmt, colIdx);
                    const priorVal = priorStmt ? row.getter(priorStmt) : null;
                    const yoy = formatYoYDelta(curVal, priorVal);

                    // Value formatting
                    const formattedDisplay = row.formatter
                      ? row.formatter(curVal, currency)
                      : formatSmartCompact(curVal, currency);

                    const rawTooltipText = row.rawFormatter
                      ? row.rawFormatter(curVal, currency)
                      : row.isPercentage
                      ? `${curVal != null ? curVal.toFixed(2) : '—'}%`
                      : formatExactRaw(curVal, currency);

                    const customColor = row.colorClass
                      ? row.colorClass(curVal)
                      : undefined;

                    const periodLabel = getPeriodLabel(stmt);

                    return (
                      <td
                        key={`${row.id}-${stmt.fiscalYear}-${stmt.fiscalPeriod}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            title: rowTitle,
                            periodLabel,
                            rawText: rawTooltipText,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 6,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        className={`w-[130px] sm:w-[150px] min-w-[130px] sm:min-w-[150px] text-right px-3 py-2 font-sans tabular-nums border-b border-plt-border-soft group-hover:bg-plt-hover transition-colors cursor-default ${
                          row.isTotal ? 'font-bold' : 'font-normal'
                        }`}
                      >
                        <div
                          className={`text-xs ${
                            customColor
                              ? customColor
                              : row.isTotal
                              ? 'text-plt-text font-bold'
                              : 'text-plt-text'
                          }`}
                        >
                          {formattedDisplay}
                        </div>

                        {/* YoY Delta Badge */}
                        {yoy ? (
                          <div className="mt-0.5">
                            <span
                              className={`text-[10px] font-medium leading-none ${
                                yoy.positive
                                  ? 'text-plt-profit'
                                  : yoy.neutral
                                  ? 'text-plt-muted'
                                  : 'text-plt-risk'
                              }`}
                            >
                              {yoy.label}
                            </span>
                          </div>
                        ) : (
                          <div className="h-3 text-[10px] text-transparent select-none">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

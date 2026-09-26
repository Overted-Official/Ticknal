'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction } from '@/types/bank';
import { getDashboardCashFlowKind } from '@/lib/portfolio-finance';

export interface CategoryItem {
  id: string;
  name: string;
  value: number;
  percentage: number;
  count: number;
  color: string;
}

interface TransactionsBreakdownChartProps {
  transactions?: BankTransaction[];
  usdRate?: number;
}

import { TRANSACTION_CATEGORY_COLORS as CATEGORY_COLORS, getCategoryColor } from '@/lib/category-colors';

const FALLBACK_PALETTE = [
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#f43f5e',
  '#14b8a6',
  '#a855f7',
  '#71717a',
];

export default function TransactionsBreakdownChart({
  transactions = [],
  usdRate = 50.20,
}: TransactionsBreakdownChartProps) {
  const [flowType, setFlowType] = useState<'expenses' | 'income'>('expenses');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isPrivacy } = usePrivacyMode();

  // Aggregate Transactions by Category for the selected flow type
  const { categories, totalValue } = useMemo(() => {
    const targetKind = flowType === 'expenses' ? 'OUTFLOW' : 'INFLOW';
    const catMap = new Map<string, { value: number; count: number }>();

    for (const tx of transactions) {
      const kind = getDashboardCashFlowKind(tx.type);
      if (kind !== targetKind) continue;

      const cat = tx.category?.trim() || 'Other';
      const amt = Number(tx.amount || 0);
      const egpVal = (tx.currency || '').toUpperCase() === 'USD' ? amt * usdRate : amt;

      if (!catMap.has(cat)) {
        catMap.set(cat, { value: 0, count: 0 });
      }
      const item = catMap.get(cat)!;
      item.value += egpVal;
      item.count += 1;
    }

    const total = Array.from(catMap.values()).reduce((sum, item) => sum + item.value, 0);
    const safeTotal = total > 0 ? total : 1;

    let paletteIdx = 0;
    const items: CategoryItem[] = [];

    for (const [name, data] of catMap.entries()) {
      const color =
        CATEGORY_COLORS[name] ??
        FALLBACK_PALETTE[paletteIdx % FALLBACK_PALETTE.length];
      paletteIdx++;

      items.push({
        id: `cat-${name}`,
        name,
        value: data.value,
        percentage: (data.value / safeTotal) * 100,
        count: data.count,
        color,
      });
    }

    return {
      categories: items.sort((a, b) => b.value - a.value),
      totalValue: total,
    };
  }, [transactions, usdRate, flowType]);

  const formatMoney = (val: number): string => {
    if (isPrivacy) return '•••••• £';
    const formatted = Math.round(val).toLocaleString('en-US');
    return `${formatted} £`;
  };

  const activeSlice =
    hoveredIndex !== null && categories[hoveredIndex]
      ? categories[hoveredIndex]
      : null;

  return (
    <div className="w-full h-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5 border border-border-subtle">
      {/* 1. Header: Title, Expenses/Income Toggle & Total Value */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">Transactions</span>
          {/* Mini Flow Switcher */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => {
                setFlowType('expenses');
                setHoveredIndex(null);
              }}
              className={`seg-control-btn text-[11px] px-2 py-0.5 ${
                flowType === 'expenses' ? 'seg-control-btn-active' : ''
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => {
                setFlowType('income');
                setHoveredIndex(null);
              }}
              className={`seg-control-btn text-[11px] px-2 py-0.5 ${
                flowType === 'income' ? 'seg-control-btn-active' : ''
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          Total:{' '}
          <span className="text-text-primary font-semibold tabular-nums">
            {formatMoney(totalValue)}
          </span>
        </div>
      </div>

      {/* 2. Body: Donut Chart (Left) + Categories Table (Right) */}
      <div className="w-full h-[210px] flex items-center gap-3 min-h-0">
        {categories.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
            No {flowType} transactions recorded.
          </div>
        ) : (
          <>
            {/* Donut Chart Canvas */}
            <div className="w-[140px] sm:w-[160px] h-full relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={categories.length > 1 ? 2 : 0}
                    isAnimationActive={false}
                    onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {categories.map((entry, index) => {
                      const isHighlighted =
                        hoveredIndex === index ||
                        (hoveredIndex === null && index === 0);
                      return (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          stroke={isHighlighted ? 'var(--text-primary)' : 'transparent'}
                          strokeWidth={isHighlighted ? 2 : 0}
                          className="cursor-pointer transition-all duration-150"
                          onClick={() => setHoveredIndex(index)}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xl font-bold text-text-primary tracking-tight leading-none tabular-nums">
                  {activeSlice
                    ? `${activeSlice.percentage.toFixed(0)}%`
                    : `${categories.length}`}
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1 truncate max-w-[80px] px-1">
                  {activeSlice ? activeSlice.name : (flowType === 'expenses' ? 'Expenses' : 'Income')}
                </span>
              </div>
            </div>

            {/* Categories Ranking Table */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pr-1">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[10px] font-medium sticky top-0 bg-surface-base z-10">
                    <th className="pb-1.5 text-left font-medium">Category</th>
                    <th className="pb-1.5 text-right font-medium">Amount</th>
                    <th className="pb-1.5 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {categories.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <tr
                        key={cat.id}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`group transition-colors cursor-pointer ${
                          isHovered ? 'bg-surface-elevated/80' : 'hover:bg-surface-elevated/40'
                        }`}
                      >
                        <td className="py-1.5 text-left pr-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-medium text-text-primary text-[11px] truncate">
                              {cat.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right font-medium text-text-primary text-[11px] tabular-nums whitespace-nowrap">
                          {formatMoney(cat.value)}
                        </td>
                        <td className="py-1.5 text-right text-[11px] text-text-secondary font-medium tabular-nums pl-1.5">
                          {cat.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

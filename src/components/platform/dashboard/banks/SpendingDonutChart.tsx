'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  PieChart as PieChartIcon,
  LayoutGrid,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Receipt,
  Landmark,
} from '@/components/ui/icon-library';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction } from '@/types/bank';
import { CATEGORY_COLORS } from './CashFlowBarChart';
import { computeTreemap, type TreemapNode, type TreemapRect } from '@/components/platform/sectors/treemapMath';

const FALLBACK_COLORS = [
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

export type CategorySplit = {
  name: string;
  value: number;
  percentage: number;
};

interface SpendingDonutChartProps {
  splits?: CategorySplit[];
  transactions?: BankTransaction[];
  usdRate?: number;
}

export default function SpendingDonutChart({
  splits = [],
  transactions = [],
  usdRate = 50.20,
}: SpendingDonutChartProps) {
  const { isPrivacy } = usePrivacyMode();

  // View Mode: 'donut' | 'treemap'
  const [viewMode, setViewMode] = useState<'donut' | 'treemap'>('donut');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Category Detail Modal State
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string | null>(null);

  // Calculate total outflows
  const totalOutflows = useMemo(() => {
    return splits.reduce((sum, s) => sum + s.value, 0);
  }, [splits]);

  // Compute Treemap layout for spending splits
  const treemapRects = useMemo<TreemapRect<CategorySplit>[]>(() => {
    if (splits.length === 0) return [];

    const nodes: TreemapNode<CategorySplit>[] = splits.map((s, idx) => ({
      id: `cat-${idx}-${s.name}`,
      name: s.name,
      value: s.value,
      data: s,
    }));

    // Layout in a 360 x 200 coordinate canvas
    return computeTreemap<CategorySplit>(nodes, 360, 200);
  }, [splits]);

  // Get matching transactions for the selected category modal
  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryForModal) return [];
    return transactions.filter((tx) => {
      const isOutflow =
        tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL' || tx.type === 'BROKER_INJECTION';
      const cat = tx.category || 'Other';
      return isOutflow && cat === selectedCategoryForModal;
    }).sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''));
  }, [transactions, selectedCategoryForModal]);

  const selectedCategorySplit = useMemo(() => {
    return splits.find((s) => s.name === selectedCategoryForModal);
  }, [splits, selectedCategoryForModal]);

  const formatMoney = (val: number) => {
    if (isPrivacy) return '****** £';
    return `${Math.round(val).toLocaleString()} £`;
  };

  const getCategoryColor = (name: string, index: number) => {
    return CATEGORY_COLORS[name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  };

  return (
    <div className="card-widget select-none h-full flex flex-col justify-between relative">
      {/* 1. Header with View Toggle */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-plt-border-soft">
        <div>
          <h3 className="widget-title">
            Spending Category Splits
          </h3>
          <p className="widget-subtitle mt-0.5">
            Breakdown of outflows by category
          </p>
        </div>

        {/* View Switcher: Donut vs Treemap */}
        <div className="pill-switch">
          <button
            type="button"
            onClick={() => setViewMode('donut')}
            className={`pill-switch-btn text-[11px] py-1 px-2.5 gap-1 ${
              viewMode === 'donut' ? 'pill-switch-btn-active text-plt-text' : 'text-plt-muted'
            }`}
            title="Donut Chart View"
          >
            <PieChartIcon className="w-3 h-3" />
            <span>Donut</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('treemap')}
            className={`pill-switch-btn text-[11px] py-1 px-2.5 gap-1 ${
              viewMode === 'treemap' ? 'pill-switch-btn-active text-plt-text' : 'text-plt-muted'
            }`}
            title="Treemap View"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Treemap</span>
          </button>
        </div>
      </div>

      {splits.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-xs text-plt-muted font-sans">
          No expense entries logged yet.
        </div>
      ) : (
        <div className="h-[320px] flex flex-col justify-between">
          {/* 2A. Donut Chart View */}
          {viewMode === 'donut' && (
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={splits}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2.5}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(entry: any) => setSelectedCategoryForModal(entry?.name ?? null)}
                    className="cursor-pointer outline-none"
                  >
                    {splits.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(entry.name, index)}
                        stroke="var(--plt-bg-card)"
                        strokeWidth={activeIndex === index ? 3 : 1.5}
                        style={{
                          filter: activeIndex === index ? 'brightness(1.15)' : 'none',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload as CategorySplit;
                      if (!item) return null;
                      return (
                        <div className="p-2.5 bg-plt-card/95 backdrop-blur-md border border-plt-border rounded-xl shadow-xl font-sans text-xs min-w-[150px]">
                          <div className="flex items-center gap-1.5 font-semibold text-plt-text mb-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getCategoryColor(item.name, 0) }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-plt-muted">
                            <span>Amount:</span>
                            <span className="font-bold text-plt-text tabular-nums">
                              {formatMoney(item.value)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-plt-muted mt-0.5">
                            <span>Share:</span>
                            <span className="font-semibold text-plt-info tabular-nums">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-[10px] text-plt-muted/80 mt-1 italic text-center border-t border-plt-border-soft/60 pt-1">
                            Click to view all expenses
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-plt-muted font-sans uppercase tracking-wider font-semibold">
                  {activeIndex !== null && splits[activeIndex]
                    ? splits[activeIndex].name
                    : 'Total Outflows'}
                </span>
                <span className="text-sm font-bold text-plt-text tabular-nums font-sans mt-0.5">
                  {activeIndex !== null && splits[activeIndex]
                    ? `${splits[activeIndex].percentage.toFixed(1)}%`
                    : formatMoney(totalOutflows)}
                </span>
              </div>
            </div>
          )}

          {/* 2B. Treemap View */}
          {viewMode === 'treemap' && (
            <div className="h-44 w-full relative bg-plt-hover/20 rounded-xl overflow-hidden p-1 border border-plt-border-soft">
              <svg width="100%" height="100%" viewBox="0 0 360 200" className="w-full h-full">
                {treemapRects.map((rect: TreemapRect<CategorySplit>, idx: number) => {
                  const split = rect.data as CategorySplit;
                  const color = getCategoryColor(split.name, idx);
                  const isHovered = activeIndex === idx;

                  // Minimum dimensions to render text
                  const canShowText = rect.width >= 45 && rect.height >= 32;
                  const canShowSubtext = rect.width >= 55 && rect.height >= 48;

                  return (
                    <g
                      key={rect.id}
                      onClick={() => setSelectedCategoryForModal(split.name)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseLeave={() => setActiveIndex(null)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      <rect
                        x={rect.x + 1}
                        y={rect.y + 1}
                        width={Math.max(rect.width - 2, 0)}
                        height={Math.max(rect.height - 2, 0)}
                        rx={6}
                        fill={color}
                        fillOpacity={isHovered ? 0.9 : 0.75}
                        stroke={isHovered ? '#ffffff' : 'rgba(0,0,0,0.3)'}
                        strokeWidth={isHovered ? 1.5 : 1}
                        className="transition-all"
                      />
                      {canShowText && (
                        <text
                          x={rect.x + 6}
                          y={rect.y + 16}
                          fill="#ffffff"
                          fontSize="11px"
                          fontWeight="600"
                          fontFamily="var(--font-sans-token)"
                          className="pointer-events-none select-none"
                        >
                          {split.name.length > 12 && rect.width < 90
                            ? `${split.name.slice(0, 10)}…`
                            : split.name}
                        </text>
                      )}
                      {canShowSubtext && (
                        <>
                          <text
                            x={rect.x + 6}
                            y={rect.y + 30}
                            fill="rgba(255,255,255,0.85)"
                            fontSize="10px"
                            fontWeight="500"
                            fontFamily="var(--font-sans-token)"
                            className="pointer-events-none select-none"
                          >
                            {split.percentage.toFixed(1)}%
                          </text>
                          <text
                            x={rect.x + 6}
                            y={rect.y + 42}
                            fill="rgba(255,255,255,0.7)"
                            fontSize="9px"
                            fontWeight="400"
                            fontFamily="var(--font-sans-token)"
                            className="pointer-events-none select-none"
                          >
                            {formatMoney(split.value)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* 3. Interactive Legend List (Click any item to open breakdown modal) */}
          <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar pt-2 border-t border-plt-border-soft">
            {splits.map((cat, idx) => {
              const color = getCategoryColor(cat.name, idx);
              return (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCategoryForModal(cat.name)}
                  className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-plt-hover/60 text-[11px] font-sans transition-colors cursor-pointer group"
                  title="Click to view category expenses breakdown"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-plt-muted group-hover:text-plt-text truncate transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-plt-muted font-normal">
                      {formatMoney(cat.value)}
                    </span>
                    <span className="tabular-nums text-plt-text font-semibold px-1.5 py-0.5 rounded bg-plt-hover/40">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Category Expenses Breakdown Modal Card */}
      {selectedCategoryForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCategoryForModal(null)}
        >
          <div
            className="w-full max-w-lg bg-plt-card border border-plt-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-plt-border-soft flex items-center justify-between bg-plt-hover/30">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{
                    backgroundColor: getCategoryColor(
                      selectedCategoryForModal,
                      splits.findIndex((s) => s.name === selectedCategoryForModal)
                    ),
                  }}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-plt-text text-base flex items-center gap-2">
                    {selectedCategoryForModal}
                    <span className="text-xs font-normal text-plt-muted px-2 py-0.5 rounded-full bg-plt-hover">
                      {categoryTransactions.length} {categoryTransactions.length === 1 ? 'transaction' : 'transactions'}
                    </span>
                  </h4>
                  <p className="text-xs text-plt-muted mt-0.5">
                    Total spent: <span className="font-semibold text-plt-text">{formatMoney(selectedCategorySplit?.value || 0)}</span> ({selectedCategorySplit?.percentage.toFixed(1)}% of total outflows)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategoryForModal(null)}
                className="p-1.5 rounded-lg text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {categoryTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-plt-muted">
                  No individual transactions found for this category.
                </div>
              ) : (
                categoryTransactions.map((tx) => {
                  const amt = Number(tx.amount || 0);
                  const isUsd = tx.currency === 'USD';
                  const egpAmt = isUsd ? amt * usdRate : amt;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-plt-hover/30 border border-plt-border-soft/80 flex items-center justify-between gap-3 hover:bg-plt-hover/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {tx.bankLogoUrl ? (
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center p-0.5">
                            <Image
                              src={tx.bankLogoUrl}
                              alt={tx.bankName || 'Bank'}
                              width={24}
                              height={24}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-plt-hover shrink-0 flex items-center justify-center text-plt-muted">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-plt-text truncate">
                            {tx.notes || tx.category || 'Expense Outflow'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-plt-muted mt-0.5">
                            <span>{tx.transactionDate}</span>
                            <span>•</span>
                            <span className="truncate">{tx.accountName || tx.bankName || 'Bank Account'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-plt-risk tabular-nums">
                          -{isPrivacy ? '****** £' : `${Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tx.currency}`}
                        </div>
                        {isUsd && (
                          <div className="text-[10px] text-plt-muted tabular-nums">
                            ≈ {formatMoney(egpAmt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-plt-hover/20 border-t border-plt-border-soft flex items-center justify-between text-xs text-plt-muted">
              <span>{categoryTransactions.length} Records</span>
              <button
                type="button"
                onClick={() => setSelectedCategoryForModal(null)}
                className="btn-token btn-secondary btn-compact text-xs px-3 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


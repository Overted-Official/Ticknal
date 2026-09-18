'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  BarChart3,
  Layers,
  Receipt,
  Landmark,
  X,
  LineChart,
  TrendingUp,
  TrendingDown,
} from '@/components/ui/icon-library';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction } from '@/types/bank';
import { getDashboardCashFlowKind, toEgp } from '@/lib/portfolio-finance';

export type TimeframePreset = 'THIS_MONTH' | '30D' | '90D' | 'YTD' | 'ALL' | 'CUSTOM';
export type GroupingResolution = 'AUTO' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ChartFlowMode = 'TOTALS' | 'CATEGORIES';
export type DistributionTab = 'categories' | 'institutions' | 'currency';

export const CATEGORY_COLORS: Record<string, string> = {
  // Outflows / Expenses
  'Food & Groceries': '#06b6d4',
  'Smoking': '#3b82f6',
  'Living & Bills': '#8b5cf6',
  'Housing & Rent': '#a855f7',
  'Entertainment': '#ec4899',
  'Transport': '#f59e0b',
  'Healthcare': '#10b981',
  'Subscriptions': '#6366f1',
  'Shopping': '#f43f5e',
  'Investments': '#eab308',
  'Trading Injection': '#d97706',
  'Other': '#71717a',
  // Inflows
  'Salary & Income': '#10b981',
  'Interest & Yield': '#14b8a6',
  'Trading Withdrawal': '#22c55e',
  'Deposit': '#34d399',
};

export const PALETTE = [
  '#448aff', // Electric blue
  '#9c27b0', // Purple
  '#089981', // Mint green
  '#ff9800', // Orange
  '#00bcd4', // Sky blue
  '#e91e63', // Rose
  '#ff5722', // Deep orange
  '#3f51b5', // Indigo
  '#009688', // Teal
  '#ffeb3b', // Amber
];

export interface CashFlowSpendingAnalyticsWidgetProps {
  transactions: BankTransaction[];
  usdRate?: number;
}

interface BucketPoint {
  key: string;
  label: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulativeNet: number;
  inflowCategories: Record<string, number>;
  outflowCategories: Record<string, number>;
  [key: string]: any;
}

interface OutflowDistributionItem {
  id: string;
  name: string;
  value: number;
  percentage: number;
  count: number;
  color: string;
}

export default function CashFlowSpendingAnalyticsWidget({
  transactions,
  usdRate = 50.20,
}: CashFlowSpendingAnalyticsWidgetProps) {
  const { isPrivacy } = usePrivacyMode();

  // 1. Master Timeframe Controls
  const [timeframe, setTimeframe] = useState<TimeframePreset>('30D');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // 2. Cash Movement Chart Options
  const [resolution, setResolution] = useState<GroupingResolution>('AUTO');
  const [chartFlowMode, setChartFlowMode] = useState<ChartFlowMode>('TOTALS');
  const [showCumulativeLine, setShowCumulativeLine] = useState<boolean>(true);

  // 3. Outflow Distribution Tab
  const [activeTab, setActiveTab] = useState<DistributionTab>('categories');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 4. Transaction Inspect Drawer
  const [inspectItem, setInspectItem] = useState<{ name: string; type: DistributionTab } | null>(null);

  // Helper: Money formatter
  const formatMoney = (val: number, withSign: boolean = false): string => {
    if (isPrivacy) return '•••••• £';
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const prefix = withSign ? (val > 0 ? '+' : val < 0 ? '-' : '') : '';
    return `${prefix}${formatted} £`;
  };

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toFixed(0);
  };

  // Compute Active Date Range Strings [startDate, endDate]
  const { startDateStr, endDateStr, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let start = '';
    let end = todayStr;

    if (timeframe === 'THIS_MONTH') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      start = `${year}-${month}-01`;
    } else if (timeframe === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
    } else if (timeframe === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      start = d.toISOString().slice(0, 10);
    } else if (timeframe === 'YTD') {
      start = `${now.getFullYear()}-01-01`;
    } else if (timeframe === 'ALL') {
      let earliest = todayStr;
      for (const tx of transactions) {
        if (tx.transactionDate && tx.transactionDate < earliest) {
          earliest = tx.transactionDate;
        }
      }
      start = earliest;
    } else {
      start = customStartDate || '2000-01-01';
      end = customEndDate || todayStr;
    }

    const formatDisplay = (dStr: string) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length < 3) return dStr;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${parseInt(parts[2], 10)} ${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
    };

    const label = `${formatDisplay(start)} – ${formatDisplay(end)}`;
    return { startDateStr: start, endDateStr: end, dateRangeLabel: label };
  }, [timeframe, customStartDate, customEndDate, todayStr, transactions]);

  // Filter transactions within the selected timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = tx.transactionDate ? tx.transactionDate.slice(0, 10) : '';
      if (!d) return false;
      return d >= startDateStr && d <= endDateStr;
    });
  }, [transactions, startDateStr, endDateStr]);

  // Top KPI calculations
  const { totalInflows, totalOutflows, netCashFlow, savingsRate, inflowCount, outflowCount } = useMemo(() => {
    let inflows = 0;
    let outflows = 0;
    let inCount = 0;
    let outCount = 0;

    for (const tx of filteredTransactions) {
      const amt = Number(tx.amount || 0);
      const egpVal = toEgp(amt, tx.currency, usdRate);
      const flowKind = getDashboardCashFlowKind(tx.type);

      if (flowKind === 'INFLOW') {
        inflows += egpVal;
        inCount += 1;
      } else if (flowKind === 'OUTFLOW') {
        outflows += egpVal;
        outCount += 1;
      }
    }

    const net = inflows - outflows;
    let sRate = 0;
    if (inflows > 0) {
      sRate = ((inflows - outflows) / inflows) * 100;
    } else if (outflows > 0) {
      sRate = -100;
    }

    return {
      totalInflows: inflows,
      totalOutflows: outflows,
      netCashFlow: net,
      savingsRate: sRate,
      inflowCount: inCount,
      outflowCount: outCount,
    };
  }, [filteredTransactions, usdRate]);

  // The 4 KPI Cards aligned with BankSummaryKPIs (`tv-kpi-card`)
  const kpiCards = [
    {
      id: 'total-inflows',
      title: 'Total Inflows',
      value: isPrivacy ? '••••••••' : `+${formatMoney(totalInflows)}`,
      badgeText: `${inflowCount} deposit${inflowCount !== 1 ? 's' : ''}`,
      badgeClass: inflowCount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Income & deposits',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'total-outflows',
      title: 'Total Outflows',
      value: isPrivacy ? '••••••••' : `-${formatMoney(totalOutflows)}`,
      badgeText: `${outflowCount} transaction${outflowCount !== 1 ? 's' : ''}`,
      badgeClass: outflowCount > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-cold-gray-800 text-cold-gray-250 border border-cold-gray-700',
      metaText: 'Expenses & spending',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'net-cash-flow',
      title: 'Net Cash Flow',
      value: isPrivacy ? '••••••••' : `${netCashFlow >= 0 ? '+' : ''}${formatMoney(netCashFlow)}`,
      badgeText: netCashFlow >= 0 ? 'Surplus' : 'Deficit',
      badgeClass: netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      metaText: 'Inflows vs Outflows',
      metaClass: 'text-cold-gray-450',
    },
    {
      id: 'savings-rate',
      title: 'Savings / Retention Rate',
      value: isPrivacy ? '••••••••' : `${savingsRate > 0 ? '+' : ''}${savingsRate.toFixed(1)}%`,
      badgeText: savingsRate >= 0 ? `${savingsRate.toFixed(0)}% Saved` : 'Deficit',
      badgeClass: savingsRate >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      metaText: savingsRate >= 0 ? 'Retained of income' : 'Exceeds income',
      metaClass: 'text-cold-gray-450',
    },
  ];

  // Determine effective resolution for Cash Movement Chart
  const effectiveResolution: 'DAILY' | 'WEEKLY' | 'MONTHLY' = useMemo(() => {
    if (resolution !== 'AUTO') {
      return resolution;
    }
    if (timeframe === 'THIS_MONTH' || timeframe === '30D') {
      return 'DAILY';
    }
    if (timeframe === '90D') {
      return 'WEEKLY';
    }
    if (timeframe === 'YTD' || timeframe === 'ALL') {
      return 'MONTHLY';
    }
    const startMs = new Date(startDateStr).getTime();
    const endMs = new Date(endDateStr).getTime();
    const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 35) return 'DAILY';
    if (diffDays <= 120) return 'WEEKLY';
    return 'MONTHLY';
  }, [resolution, timeframe, startDateStr, endDateStr]);

  // Aggregate Cash Movement Chart Buckets
  const chartData = useMemo(() => {
    const bucketsMap = new Map<string, BucketPoint>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getBucketKeyAndLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { key: dateStr, label: dateStr };

      if (effectiveResolution === 'DAILY') {
        const day = d.getDate();
        const month = monthNames[d.getMonth()];
        return { key: dateStr, label: `${day} ${month}` };
      }

      if (effectiveResolution === 'WEEKLY') {
        const dayOfWeek = (d.getDay() + 6) % 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - dayOfWeek);
        const mKey = monday.toISOString().slice(0, 10);
        const mDay = monday.getDate();
        const mMonth = monthNames[monday.getMonth()];
        return { key: mKey, label: `W-${mDay} ${mMonth}` };
      }

      // MONTHLY
      const ym = dateStr.slice(0, 7);
      const [y, m] = ym.split('-');
      const label = `${monthNames[Number(m) - 1]} '${y.slice(2)}`;
      return { key: ym, label };
    };

    const sortedTxs = [...filteredTransactions].sort((a, b) =>
      (a.transactionDate || '').localeCompare(b.transactionDate || '')
    );

    for (const tx of sortedTxs) {
      const dateStr = tx.transactionDate ? tx.transactionDate.slice(0, 10) : '';
      if (!dateStr) continue;

      const { key, label } = getBucketKeyAndLabel(dateStr);
      if (!bucketsMap.has(key)) {
        bucketsMap.set(key, {
          key,
          label,
          inflows: 0,
          outflows: 0,
          net: 0,
          cumulativeNet: 0,
          inflowCategories: {},
          outflowCategories: {},
        });
      }

      const bucket = bucketsMap.get(key)!;
      const amt = Number(tx.amount || 0);
      const egpVal = toEgp(amt, tx.currency, usdRate);
      const cat = tx.category || 'Other';
      const flowKind = getDashboardCashFlowKind(tx.type);

      if (flowKind === 'INFLOW') {
        bucket.inflows += egpVal;
        bucket.inflowCategories[cat] = (bucket.inflowCategories[cat] || 0) + egpVal;
        bucket[`inflow_cat_${cat}`] = (bucket[`inflow_cat_${cat}`] || 0) + egpVal;
      } else if (flowKind === 'OUTFLOW') {
        bucket.outflows += egpVal;
        bucket.outflowCategories[cat] = (bucket.outflowCategories[cat] || 0) + egpVal;
        bucket[`outflow_cat_${cat}`] = (bucket[`outflow_cat_${cat}`] || 0) + egpVal;
      }
    }

    const sortedBuckets = Array.from(bucketsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    let runningAccumulation = 0;
    for (const b of sortedBuckets) {
      b.net = b.inflows - b.outflows;
      runningAccumulation += b.net;
      b.cumulativeNet = runningAccumulation;
    }

    return sortedBuckets;
  }, [filteredTransactions, effectiveResolution, usdRate]);

  const latestBucket = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  // Categories for stacked mode
  const { activeInflowCats, activeOutflowCats } = useMemo(() => {
    const inSet = new Set<string>();
    const outSet = new Set<string>();
    for (const b of chartData) {
      Object.keys(b.inflowCategories).forEach((c) => inSet.add(c));
      Object.keys(b.outflowCategories).forEach((c) => outSet.add(c));
    }
    return {
      activeInflowCats: Array.from(inSet),
      activeOutflowCats: Array.from(outSet),
    };
  }, [chartData]);

  // Outflow Distribution Items according to activeTab (Categories | Institutions | Currency)
  const distributionItems: OutflowDistributionItem[] = useMemo(() => {
    const totalOut = totalOutflows > 0 ? totalOutflows : 1;

    // TAB 1: CATEGORIES
    if (activeTab === 'categories') {
      const map = new Map<string, { amount: number; count: number }>();
      for (const tx of filteredTransactions) {
        if (getDashboardCashFlowKind(tx.type) === 'OUTFLOW') {
          const amt = Number(tx.amount || 0);
          const egpVal = toEgp(amt, tx.currency, usdRate);
          const cat = tx.category || 'Other';
          const prev = map.get(cat) || { amount: 0, count: 0 };
          map.set(cat, { amount: prev.amount + egpVal, count: prev.count + 1 });
        }
      }

      const items: OutflowDistributionItem[] = [];
      let idx = 0;
      for (const [name, data] of map.entries()) {
        items.push({
          id: `cat-${name}`,
          name,
          value: data.amount,
          percentage: (data.amount / totalOut) * 100,
          count: data.count,
          color: CATEGORY_COLORS[name] || PALETTE[idx % PALETTE.length],
        });
        idx += 1;
      }
      return items.sort((a, b) => b.value - a.value);
    }

    // TAB 2: INSTITUTIONS (Banks)
    if (activeTab === 'institutions') {
      const map = new Map<string, { amount: number; count: number }>();
      for (const tx of filteredTransactions) {
        if (getDashboardCashFlowKind(tx.type) === 'OUTFLOW') {
          const amt = Number(tx.amount || 0);
          const egpVal = toEgp(amt, tx.currency, usdRate);
          const bank = tx.bankName || 'Bank';
          const prev = map.get(bank) || { amount: 0, count: 0 };
          map.set(bank, { amount: prev.amount + egpVal, count: prev.count + 1 });
        }
      }

      const items: OutflowDistributionItem[] = [];
      let idx = 0;
      for (const [name, data] of map.entries()) {
        items.push({
          id: `bank-${name}`,
          name,
          value: data.amount,
          percentage: (data.amount / totalOut) * 100,
          count: data.count,
          color: PALETTE[idx % PALETTE.length],
        });
        idx += 1;
      }
      return items.sort((a, b) => b.value - a.value);
    }

    // TAB 3: CURRENCY
    if (activeTab === 'currency') {
      let egpTotal = 0;
      let egpCount = 0;
      let usdTotal = 0;
      let usdCount = 0;

      for (const tx of filteredTransactions) {
        if (getDashboardCashFlowKind(tx.type) === 'OUTFLOW') {
          const amt = Number(tx.amount || 0);
          if (tx.currency === 'USD') {
            usdTotal += amt * usdRate;
            usdCount += 1;
          } else {
            egpTotal += amt;
            egpCount += 1;
          }
        }
      }

      const items: OutflowDistributionItem[] = [];
      if (egpTotal > 0) {
        items.push({
          id: 'curr-egp',
          name: 'EGP Outflows',
          value: egpTotal,
          percentage: (egpTotal / totalOut) * 100,
          count: egpCount,
          color: '#ff9800',
        });
      }
      if (usdTotal > 0) {
        items.push({
          id: 'curr-usd',
          name: 'USD Outflows',
          value: usdTotal,
          percentage: (usdTotal / totalOut) * 100,
          count: usdCount,
          color: '#089981',
        });
      }
      return items;
    }

    return [];
  }, [filteredTransactions, activeTab, totalOutflows, usdRate]);

  // Center & Bottom Slice Labels for Donut
  const activeTabTitle = {
    categories: 'Total categories',
    institutions: 'Total institutions',
    currency: 'Total currencies',
  }[activeTab];

  const currentSlice = hoveredIndex !== null && distributionItems[hoveredIndex]
    ? distributionItems[hoveredIndex]
    : distributionItems[0];

  const tabs: Array<{ key: DistributionTab; label: string }> = [
    { key: 'categories', label: 'Categories' },
    { key: 'institutions', label: 'Institutions' },
    { key: 'currency', label: 'Currency' },
  ];

  // Transactions belonging to currently inspected item
  const inspectTransactions = useMemo(() => {
    if (!inspectItem) return [];
    return filteredTransactions
      .filter((tx) => {
        if (getDashboardCashFlowKind(tx.type) !== 'OUTFLOW') return false;
        if (inspectItem.type === 'categories') {
          const cat = tx.category || 'Other';
          return cat === inspectItem.name;
        }
        if (inspectItem.type === 'institutions') {
          return (tx.bankName || 'Bank') === inspectItem.name;
        }
        if (inspectItem.type === 'currency') {
          const isUsd = inspectItem.name.includes('USD');
          return isUsd ? tx.currency === 'USD' : tx.currency !== 'USD';
        }
        return false;
      })
      .sort((a, b) => (b.transactionDate || '').localeCompare(a.transactionDate || ''));
  }, [filteredTransactions, inspectItem]);

  const inspectItemData = useMemo(() => {
    if (!inspectItem) return null;
    return distributionItems.find((c) => c.name === inspectItem.name) || null;
  }, [inspectItem, distributionItems]);

  // Close modal on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full flex flex-col bg-transparent select-none space-y-6">
      {/* ================= SECTION MASTER TIMEFRAME TOOLBAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e222d]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-white tracking-wide">
            Analysis Period:
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1e222d] border border-[#2a2e39] text-[#787b86] font-mono">
            {dateRangeLabel}
          </span>
        </div>

        {/* Master Timeframe Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#14171f] border border-[#2a2e39]">
            {(['THIS_MONTH', '30D', '90D', 'YTD', 'ALL', 'CUSTOM'] as TimeframePreset[]).map((p) => {
              const labels: Record<TimeframePreset, string> = {
                THIS_MONTH: 'This Month',
                '30D': '30D',
                '90D': '90D',
                YTD: 'YTD',
                ALL: 'ALL',
                CUSTOM: 'Custom',
              };
              const active = timeframe === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTimeframe(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-[#2a2e39] text-white font-semibold shadow-xs'
                      : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {timeframe === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-[#14171f] border border-[#2a2e39] px-2.5 py-1 rounded-lg text-xs font-mono text-white animate-in fade-in duration-150">
              <Calendar className="w-3.5 h-3.5 text-[#787b86]" />
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-white focus:outline-hidden text-xs cursor-pointer"
              />
              <span className="text-[#555]">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-white focus:outline-hidden text-xs cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= ROW 1: 4 KPI CARDS (ALIGNED WITH LIQUIDITY CARDS) ================= */}
      <div className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {kpiCards.map((card) => (
            <div key={card.id} className="tv-kpi-card w-full">
              {/* Top row: Title + Badge */}
              <div className="flex items-center justify-between gap-1 leading-none">
                <span
                  className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight"
                  title={card.title}
                >
                  {card.title}
                </span>
                <span
                  className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${card.badgeClass}`}
                >
                  {card.badgeText}
                </span>
              </div>

              {/* Bottom row: Value + Meta */}
              <div className="flex items-baseline justify-between gap-1 leading-none">
                <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
                  {card.value}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-[130px] text-right font-medium leading-none ${card.metaClass}`}
                >
                  {card.metaText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= ROW 2: CASH MOVEMENT CHART (ALIGNED WITH NETWORTH CHARTS) ================= */}
      <div className="w-full flex flex-col justify-start select-none bg-transparent space-y-3 pt-2">
        {/* Header with Legends and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Cash Movement Dynamics &amp; Cumulative Trajectory
            </h3>
            <p className="text-xs text-[#787b86] mt-0.5">
              Period cash inflows versus outflows trajectory compared against running cumulative net cash accumulation
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
              <span>Inflows</span>
            </span>
            <span className="flex items-center gap-1.5 text-white font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f23645]" />
              <span>Outflows</span>
            </span>
            {showCumulativeLine && (
              <span className="flex items-center gap-1.5 text-white font-medium">
                <span className="w-3 h-0.5 bg-[#2962ff]" />
                <span>Cumulative Net</span>
              </span>
            )}
          </div>
        </div>

        {/* Sub-toolbar: Resolution and Mode Options */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#787b86] font-medium text-[11px]">Resolution:</span>
            <div className="inline-flex items-center p-0.5 rounded-md bg-[#14171f] border border-[#2a2e39]">
              {(['AUTO', 'DAILY', 'WEEKLY', 'MONTHLY'] as GroupingResolution[]).map((res) => {
                const active = resolution === res;
                return (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                      active
                        ? 'bg-[#2a2e39] text-white font-semibold'
                        : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                    }`}
                  >
                    {res === 'AUTO' ? 'Auto' : res.slice(0, 1) + res.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Totals vs Categories */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-[#14171f] border border-[#2a2e39]">
              <button
                type="button"
                onClick={() => setChartFlowMode('TOTALS')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  chartFlowMode === 'TOTALS'
                    ? 'bg-[#2a2e39] text-white font-semibold'
                    : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                <span>Totals</span>
              </button>
              <button
                type="button"
                onClick={() => setChartFlowMode('CATEGORIES')}
                className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 transition-colors ${
                  chartFlowMode === 'CATEGORIES'
                    ? 'bg-[#2a2e39] text-white font-semibold'
                    : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Categories</span>
              </button>
            </div>

            {/* Toggle Cumulative Line */}
            <button
              type="button"
              onClick={() => setShowCumulativeLine(!showCumulativeLine)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded border flex items-center gap-1 transition-colors ${
                showCumulativeLine
                  ? 'bg-[#2962ff]/10 text-[#2962ff] border-[#2962ff]/30 font-semibold'
                  : 'bg-[#14171f] text-[#787b86] border-[#2a2e39] hover:text-white'
              }`}
            >
              <LineChart className="w-3 h-3" />
              <span>Cumulative Net</span>
            </button>
          </div>
        </div>

        {/* TradingView Chart Canvas matching WealthGrowthChartCard */}
        <div className="w-full h-[340px] relative">
          {chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-xs text-[#787b86] font-sans space-y-2">
              <Landmark className="w-8 h-8 text-[#333]" />
              <p>No transaction flow recorded in this timeframe.</p>
              <Link
                href="/wallet?tab=transactions"
                className="text-white/60 hover:text-white underline text-[11px] transition-colors"
              >
                Log transactions in Cash &amp; Transactions &rarr;
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 12, right: 68, left: 10, bottom: 0 }}
                barCategoryGap={effectiveResolution === 'DAILY' ? '18%' : '26%'}
              >
                {/* Horizontal Gridlines matching TradingView Networth */}
                <CartesianGrid
                  stroke="#1e222d"
                  strokeDasharray="2 2"
                  vertical={false}
                  strokeOpacity={0.7}
                />

                {/* X-Axis on Bottom */}
                <XAxis
                  dataKey="label"
                  stroke="#787b86"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />

                {/* Y-Axis on RIGHT (TradingView Price Scale) */}
                <YAxis
                  yAxisId="flows"
                  orientation="right"
                  stroke="#787b86"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (isPrivacy ? '•••' : formatPriceValue(v))}
                  dx={8}
                />

                {/* Tooltip styled exactly like GrowthTooltip in WealthGrowthChartCard */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload as BucketPoint;
                    if (!item) return null;

                    const inflowCats = item.inflowCategories || {};
                    const outflowCats = item.outflowCategories || {};

                    return (
                      <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl min-w-[200px]">
                        <div className="font-semibold text-white mb-1 border-b border-[#2a2e39] pb-1 flex items-center justify-between">
                          <span>{item.label}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              item.net >= 0
                                ? 'text-[#089981] bg-[#089981]/10'
                                : 'text-[#f23645] bg-[#f23645]/10'
                            }`}
                          >
                            Net: {item.net >= 0 ? '+' : ''}{formatMoney(item.net)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-[#089981]">
                          <span>Inflows:</span>
                          <strong className="text-white">+{formatMoney(item.inflows)}</strong>
                        </div>
                        {chartFlowMode === 'CATEGORIES' && Object.keys(inflowCats).length > 0 && (
                          <div className="pl-2 space-y-0.5 border-l border-[#089981]/30 text-[10px] text-[#787b86]">
                            {Object.entries(inflowCats).map(([catName, amt]) => (
                              <div key={catName} className="flex justify-between">
                                <span className="truncate">{catName}</span>
                                <span className="text-white/90">{formatMoney(Number(amt))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between gap-4 text-[#f23645]">
                          <span>Outflows:</span>
                          <strong className="text-white">-{formatMoney(item.outflows)}</strong>
                        </div>
                        {chartFlowMode === 'CATEGORIES' && Object.keys(outflowCats).length > 0 && (
                          <div className="pl-2 space-y-0.5 border-l border-[#f23645]/30 text-[10px] text-[#787b86]">
                            {Object.entries(outflowCats).map(([catName, amt]) => (
                              <div key={catName} className="flex justify-between">
                                <span className="truncate">{catName}</span>
                                <span className="text-white/90">{formatMoney(Number(amt))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {showCumulativeLine && (
                          <div className="flex justify-between gap-4 text-[#2962ff] pt-1 border-t border-[#2a2e39]">
                            <span>Cumulative Net:</span>
                            <strong className="text-white">
                              {item.cumulativeNet >= 0 ? '+' : ''}{formatMoney(item.cumulativeNet)}
                            </strong>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Bars */}
                {chartFlowMode === 'TOTALS' ? (
                  <>
                    <Bar
                      yAxisId="flows"
                      dataKey="inflows"
                      name="Inflows"
                      fill="#089981"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      yAxisId="flows"
                      dataKey="outflows"
                      name="Outflows"
                      fill="#f23645"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={24}
                    />
                  </>
                ) : (
                  <>
                    {activeInflowCats.map((cat, idx) => (
                      <Bar
                        key={`inflow-${cat}`}
                        yAxisId="flows"
                        dataKey={`inflow_cat_${cat}`}
                        name={`[Inflow] ${cat}`}
                        stackId="inflows"
                        fill={CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length]}
                        radius={idx === activeInflowCats.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                    ))}
                    {activeOutflowCats.map((cat, idx) => (
                      <Bar
                        key={`outflow-${cat}`}
                        yAxisId="flows"
                        dataKey={`outflow_cat_${cat}`}
                        name={`[Outflow] ${cat}`}
                        stackId="outflows"
                        fill={CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length]}
                        radius={idx === activeOutflowCats.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                    ))}
                  </>
                )}

                {/* Cumulative Net Line */}
                {showCumulativeLine && (
                  <Line
                    yAxisId="flows"
                    type="monotone"
                    dataKey="cumulativeNet"
                    name="Cumulative Net"
                    stroke="#2962ff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#2962ff', stroke: '#ffffff', strokeWidth: 1.5 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ================= ROW 3: OUTFLOW DISTRIBUTION (EXACT MATCH IMAGE 3 / PORTFOLIO SPLIT) ================= */}
      <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent pt-4 border-t border-[#1e222d]">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Outflow &amp; Spending Distribution
            </h3>
            <p className="text-xs text-[#787b86] mt-0.5">
              Category expenditure allocation, institution outflow breakdown, and currency exposure
            </p>
          </div>
          <span className="text-xs font-semibold text-white font-mono">
            Total Outflows: <span className="text-rose-400">{formatMoney(totalOutflows)}</span>
          </span>
        </div>

        {/* 1. Square Tabs Bar matching Image 3 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-b border-[#1e222d] pb-2">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveTab(tab.key);
                  setHoveredIndex(null);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1e222d] text-white font-semibold shadow-xs border border-[#2a2e39]'
                    : 'text-[#787b86] hover:text-white font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 2. Side-by-Side: Donut on Left (col-span-5), Table on Right (col-span-7) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Left Column: Donut Chart Canvas */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full h-64 flex items-center justify-center">
              {distributionItems.length === 0 ? (
                <div className="text-xs text-[#787b86]">No outflows recorded in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionItems}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={distributionItems.length > 1 ? 2 : 0}
                      isAnimationActive={false}
                      onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {distributionItems.map((entry, index) => {
                        const isHighlighted = hoveredIndex === index || (hoveredIndex === null && index === 0);
                        return (
                          <Cell
                            key={entry.id || entry.name}
                            fill={entry.color}
                            stroke={isHighlighted ? '#ffffff' : 'transparent'}
                            strokeWidth={isHighlighted ? 2 : 0}
                            className="cursor-pointer transition-all duration-150"
                            onClick={() => setInspectItem({ name: entry.name, type: activeTab })}
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Center Text inside Donut Hole matching Image 3 */}
              {distributionItems.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-3xl font-bold text-white tracking-tight leading-none">
                    {distributionItems.length}
                  </span>
                  <span className="text-xs text-[#787b86] font-medium mt-1">
                    {activeTabTitle}
                  </span>
                  <span className="text-sm font-bold text-white mt-1">
                    {currentSlice ? `${currentSlice.percentage.toFixed(0)}%` : '100%'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Arc Label matching Image 3 */}
            <div className="text-center py-1 min-h-[26px]">
              {currentSlice && (
                <span className="text-sm font-semibold text-white tracking-wide">
                  {currentSlice.name}
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Distribution Table replicating Image 3 / TradingView */}
          <div className="lg:col-span-7 overflow-x-auto overflow-y-auto max-h-[320px] custom-scrollbar">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#1e222d] text-[#787b86] text-[11px] font-medium">
                  <th className="pb-2 text-left font-medium">
                    {activeTab === 'categories'
                      ? 'Category'
                      : activeTab === 'institutions'
                      ? 'Institution'
                      : 'Currency'}
                  </th>
                  <th className="pb-2 text-right font-medium">Spent amount</th>
                  <th className="pb-2 text-right font-medium">Allocation</th>
                  <th className="pb-2 text-right font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d]/60">
                {distributionItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-[#787b86]">
                      No outflows recorded in this period.
                    </td>
                  </tr>
                ) : (
                  distributionItems.map((item, idx) => (
                    <tr
                      key={item.id || item.name}
                      onClick={() => setInspectItem({ name: item.name, type: activeTab })}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="hover:bg-[#1e222d]/30 transition-colors cursor-pointer group"
                    >
                      {/* 1. Name with Color Swatch */}
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-white font-medium truncate max-w-[170px] group-hover:text-[#2962ff] transition-colors">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* 2. Spent Amount */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                        {isPrivacy ? '•••••• £' : formatMoney(item.value)}
                      </td>

                      {/* 3. Allocation % */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-[#787b86] font-medium">
                        {item.percentage.toFixed(2)}%
                      </td>

                      {/* 4. Transactions Count */}
                      <td className="py-2.5 pl-3 text-right tabular-nums text-cold-gray-300 font-medium">
                        {item.count} {item.count === 1 ? 'tx' : 'txs'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= MODAL: CATEGORY / INSTITUTION TRANSACTIONS INSPECT ================= */}
      {inspectItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setInspectItem(null)}
        >
          <div
            className="w-full max-w-lg bg-[#14171f] border border-[#2a2e39] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#1e222d] flex items-center justify-between bg-[#1e222d]/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{
                    backgroundColor: inspectItemData?.color || '#3b82f6',
                  }}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    {inspectItem.name}
                    <span className="text-[10px] font-normal text-[#787b86] px-2 py-0.5 rounded-full bg-[#1e222d] border border-[#2a2e39]">
                      {inspectTransactions.length} {inspectTransactions.length === 1 ? 'record' : 'records'}
                    </span>
                  </h4>
                  <p className="text-xs text-[#787b86] mt-0.5">
                    Total spent:{' '}
                    <span className="font-semibold text-white">
                      {formatMoney(inspectItemData?.value || 0)}
                    </span>{' '}
                    ({inspectItemData?.percentage.toFixed(1)}% of period outflows)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="p-1.5 rounded-lg text-[#787b86] hover:text-white hover:bg-[#1e222d] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {inspectTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#787b86]">
                  No individual transactions found for this selection in the active timeframe.
                </div>
              ) : (
                inspectTransactions.map((tx) => {
                  const amt = Number(tx.amount || 0);
                  const isUsd = tx.currency === 'USD';
                  const egpAmt = isUsd ? amt * usdRate : amt;

                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-[#1e222d]/40 border border-[#2a2e39]/60 flex items-center justify-between gap-3 hover:bg-[#1e222d]/70 transition-colors"
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
                          <div className="w-7 h-7 rounded-lg bg-[#1e222d] border border-[#2a2e39] shrink-0 flex items-center justify-center text-[#787b86]">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {tx.notes || tx.category || 'Expense Outflow'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#787b86] mt-0.5">
                            <span>{tx.transactionDate}</span>
                            <span>•</span>
                            <span className="truncate">{tx.accountName || tx.bankName || 'Account'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-rose-400 tabular-nums">
                          -{isPrivacy ? '•••••• £' : `${Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${tx.currency}`}
                        </div>
                        {isUsd && (
                          <div className="text-[10px] text-[#787b86] tabular-nums">
                            ≈ -{formatMoney(egpAmt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#1e222d]/30 border-t border-[#1e222d] flex items-center justify-between text-xs text-[#787b86]">
              <span>{inspectTransactions.length} Transactions</span>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-3 py-1 bg-[#2a2e39] hover:bg-[#333744] text-white rounded-lg text-xs transition-colors border border-[#3e4250]"
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

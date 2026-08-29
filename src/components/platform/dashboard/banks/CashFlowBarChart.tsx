'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ArrowLeft,
  Calendar,
  Layers,
  BarChart3,
  ChevronDown,
  Info,
} from '@/components/ui/icon-library';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction } from '@/types/bank';

export type MonthlyFlowPoint = {
  month: string;
  rawDate?: string;
  inflows: number;
  outflows: number;
  net: number;
};

const CHART_AXIS_COLOR = 'var(--chart-axis)';
const COLOR_PROFIT = '#10b981';
const COLOR_RISK = '#ef4444';

// Consistent category colors
export const CATEGORY_COLORS: Record<string, string> = {
  // Outflows
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

const FALLBACK_OUTFLOW_COLORS = [
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

interface CashFlowBarChartProps {
  data?: MonthlyFlowPoint[];
  transactions?: BankTransaction[];
  usdRate?: number;
}

export default function CashFlowBarChart({
  data = [],
  transactions = [],
  usdRate = 50.20,
}: CashFlowBarChartProps) {
  const { isPrivacy } = usePrivacyMode();

  // Navigation State: 'months' (All months summary) | 'days' (Day-by-day in selected month)
  const [viewLevel, setViewLevel] = useState<'months' | 'days'>('months');
  const [breakdownMode, setBreakdownMode] = useState<'totals' | 'categories'>('totals');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // 1. Extract all available months from transactions or data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      if (tx.transactionDate) {
        set.add(tx.transactionDate.slice(0, 7)); // YYYY-MM
      }
    }
    for (const d of data) {
      if (d.rawDate) set.add(d.rawDate);
    }
    return Array.from(set).sort().reverse();
  }, [transactions, data]);

  // Set initial selected month to the most recent month with activity
  const activeMonth = selectedMonth || availableMonths[0] || new Date().toISOString().slice(0, 7);

  // Helper: Month label formatter (e.g. '2026-08' -> "Aug '26")
  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[Number(month) - 1] || month} '${(year || '').slice(2)}`;
  };

  // 2. Aggregate Data by Month
  const monthlyAggregated = useMemo(() => {
    type MonthRow = {
      label: string;
      rawDate: string;
      inflows: number;
      outflows: number;
      net: number;
      outflowCategories: Record<string, number>;
      inflowCategories: Record<string, number>;
      [key: string]: any;
    };

    const map = new Map<string, MonthRow>();

    if (transactions.length > 0) {
      for (const tx of transactions) {
        const ym = tx.transactionDate ? tx.transactionDate.slice(0, 7) : 'Unknown';
        if (!map.has(ym)) {
          map.set(ym, {
            label: formatMonthLabel(ym),
            rawDate: ym,
            inflows: 0,
            outflows: 0,
            net: 0,
            outflowCategories: {},
            inflowCategories: {},
          });
        }
        const row = map.get(ym)!;
        const amt = Number(tx.amount || 0);
        const egpVal = tx.currency === 'USD' ? amt * usdRate : amt;
        const cat = tx.category || 'Other';

        if (tx.type === 'INCOME' || tx.type === 'DEPOSIT' || tx.type === 'BROKER_WITHDRAWAL') {
          row.inflows += egpVal;
          row.inflowCategories[cat] = (row.inflowCategories[cat] || 0) + egpVal;
          row[`inflow_cat_${cat}`] = (row[`inflow_cat_${cat}`] || 0) + egpVal;
        } else if (tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL' || tx.type === 'BROKER_INJECTION') {
          row.outflows += egpVal;
          row.outflowCategories[cat] = (row.outflowCategories[cat] || 0) + egpVal;
          row[`outflow_cat_${cat}`] = (row[`outflow_cat_${cat}`] || 0) + egpVal;
        }
      }
    } else {
      for (const d of data) {
        const ym = d.rawDate || d.month;
        map.set(ym, {
          label: d.month,
          rawDate: ym,
          inflows: d.inflows,
          outflows: d.outflows,
          net: d.net,
          outflowCategories: { Other: d.outflows },
          inflowCategories: { Other: d.inflows },
          outflow_cat_Other: d.outflows,
          inflow_cat_Other: d.inflows,
        });
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        ...v,
        net: v.inflows - v.outflows,
      }));
  }, [transactions, data, usdRate]);

  // 3. Aggregate Data by Day for the Selected Month
  const dailyAggregated = useMemo(() => {
    if (!activeMonth) return [];

    type DayRow = {
      label: string;
      rawDate: string;
      inflows: number;
      outflows: number;
      net: number;
      outflowCategories: Record<string, number>;
      inflowCategories: Record<string, number>;
      [key: string]: any;
    };

    const map = new Map<string, DayRow>();

    // Filter transactions belonging to activeMonth
    const monthTxs = transactions.filter(
      (tx) => tx.transactionDate && tx.transactionDate.startsWith(activeMonth)
    );

    for (const tx of monthTxs) {
      const dateStr = tx.transactionDate; // YYYY-MM-DD
      const dayNum = dateStr.slice(8);
      const label = `${Number(dayNum)}`;

      if (!map.has(dateStr)) {
        map.set(dateStr, {
          label,
          rawDate: dateStr,
          inflows: 0,
          outflows: 0,
          net: 0,
          outflowCategories: {},
          inflowCategories: {},
        });
      }
      const row = map.get(dateStr)!;
      const amt = Number(tx.amount || 0);
      const egpVal = tx.currency === 'USD' ? amt * usdRate : amt;
      const cat = tx.category || 'Other';

      if (tx.type === 'INCOME' || tx.type === 'DEPOSIT' || tx.type === 'BROKER_WITHDRAWAL') {
        row.inflows += egpVal;
        row.inflowCategories[cat] = (row.inflowCategories[cat] || 0) + egpVal;
        row[`inflow_cat_${cat}`] = (row[`inflow_cat_${cat}`] || 0) + egpVal;
      } else if (tx.type === 'EXPENSE' || tx.type === 'WITHDRAWAL' || tx.type === 'BROKER_INJECTION') {
        row.outflows += egpVal;
        row.outflowCategories[cat] = (row.outflowCategories[cat] || 0) + egpVal;
        row[`outflow_cat_${cat}`] = (row[`outflow_cat_${cat}`] || 0) + egpVal;
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        ...v,
        net: v.inflows - v.outflows,
      }));
  }, [transactions, activeMonth, usdRate]);

  // Extract all distinct outflow and inflow categories present in data
  const { allOutflowCategories, allInflowCategories } = useMemo(() => {
    const outSet = new Set<string>();
    const inSet = new Set<string>();
    const currentList = viewLevel === 'months' ? monthlyAggregated : dailyAggregated;

    for (const item of currentList) {
      if (item.outflowCategories) {
        Object.keys(item.outflowCategories).forEach((c) => outSet.add(c));
      }
      if (item.inflowCategories) {
        Object.keys(item.inflowCategories).forEach((c) => inSet.add(c));
      }
    }

    return {
      allOutflowCategories: Array.from(outSet),
      allInflowCategories: Array.from(inSet),
    };
  }, [viewLevel, monthlyAggregated, dailyAggregated]);

  const activeChartData = viewLevel === 'months' ? monthlyAggregated : dailyAggregated;

  // Selected Month Summary KPI
  const monthSummary = useMemo(() => {
    const target = monthlyAggregated.find((m) => m.rawDate === activeMonth);
    if (!target) return null;
    return {
      label: target.label,
      inflows: target.inflows,
      outflows: target.outflows,
      net: target.net,
    };
  }, [monthlyAggregated, activeMonth]);

  // Click on a Month Bar to Drill Down
  const handleBarClick = (entry: any) => {
    if (viewLevel === 'months' && entry && entry.rawDate) {
      setSelectedMonth(entry.rawDate);
      setViewLevel('days');
    }
  };

  const formatMoney = (val: number) => {
    if (isPrivacy) return '****** £';
    return `${Math.round(val).toLocaleString()} £`;
  };

  return (
    <div className="card-widget select-none h-full flex flex-col justify-between">
      {/* 1. Header & Interactive Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-plt-border-soft">
        <div>
          <div className="flex items-center gap-2">
            {viewLevel === 'days' && (
              <button
                type="button"
                onClick={() => setViewLevel('months')}
                className="btn-token btn-secondary btn-compact text-xs gap-1.5 px-2.5 py-1"
                title="Drill up to all months"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Months</span>
              </button>
            )}
            <h3 className="widget-title flex items-center gap-2">
              {viewLevel === 'months' ? (
                <span>Monthly Cash Flow Activity</span>
              ) : (
                <span>Daily Cash Flow ({formatMonthLabel(activeMonth)})</span>
              )}
            </h3>
          </div>
          <p className="widget-subtitle mt-0.5">
            {viewLevel === 'months'
              ? 'Click any month column to drill down into daily transactions'
              : 'Day-by-day cash inflow and outflow distribution'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector Dropdown (when in days view) */}
          {viewLevel === 'days' && availableMonths.length > 1 && (
            <div className="relative inline-flex items-center">
              <select
                value={activeMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="select-token text-xs py-1 px-2.5 pr-7 h-7 bg-plt-card border-plt-border-soft text-plt-text cursor-pointer"
              >
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthLabel(ym)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Breakdown Mode Pill Switcher */}
          <div className="pill-switch">
            <button
              type="button"
              onClick={() => setBreakdownMode('totals')}
              className={`pill-switch-btn text-[11px] py-1 px-2.5 gap-1 ${
                breakdownMode === 'totals' ? 'pill-switch-btn-active text-plt-text' : 'text-plt-muted'
              }`}
              title="Summary Inflows vs Outflows"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Totals</span>
            </button>
            <button
              type="button"
              onClick={() => setBreakdownMode('categories')}
              className={`pill-switch-btn text-[11px] py-1 px-2.5 gap-1 ${
                breakdownMode === 'categories' ? 'pill-switch-btn-active text-plt-text' : 'text-plt-muted'
              }`}
              title="Breakdown columns by category"
            >
              <Layers className="w-3 h-3" />
              <span>Categories</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Month Summary Sub-bar (if in Days view) */}
      {viewLevel === 'days' && monthSummary && (
        <div className="flex items-center justify-between px-3 py-2 my-2 rounded-lg bg-plt-hover/40 border border-plt-border-soft text-xs font-sans">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-plt-muted font-medium">{monthSummary.label} Total:</span>
            <span className="text-plt-profit font-semibold">
              +{formatMoney(monthSummary.inflows)} Inflows
            </span>
            <span className="text-plt-risk font-semibold">
              -{formatMoney(monthSummary.outflows)} Outflows
            </span>
          </div>
          <div className={`font-bold tabular-nums ${monthSummary.net >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
            Net: {monthSummary.net >= 0 ? '+' : ''}{formatMoney(monthSummary.net)}
          </div>
        </div>
      )}

      {/* 3. Main Chart Canvas */}
      {activeChartData.length === 0 ? (
        <div className="h-[320px] flex flex-col items-center justify-center text-xs text-plt-muted space-y-2 font-sans">
          <Landmark size={32} className="text-plt-faint" />
          <p>No transactions logged for this period.</p>
          <Link
            href="/wallet?tab=banks"
            className="text-white/60 hover:text-white hover:underline font-semibold"
          >
            Log transactions in Wallet &rarr;
          </Link>
        </div>
      ) : (
        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeChartData}
              margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
              barCategoryGap={viewLevel === 'months' ? '24%' : '14%'}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  handleBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <XAxis
                dataKey="label"
                stroke={CHART_AXIS_COLOR}
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--palette-chart-grid)' }}
              />
              <YAxis
                stroke={CHART_AXIS_COLOR}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (isPrivacy ? '***' : `${(v / 1000).toFixed(0)}k`)}
                width={42}
              />

              {/* Cursor styling fix: subtle dark highlight instead of default glaring light-gray box */}
              <Tooltip
                cursor={{
                  fill: 'rgba(255, 255, 255, 0.04)',
                  stroke: 'rgba(255, 255, 255, 0.08)',
                  strokeWidth: 1,
                  rx: 4,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;

                  const inflowsVal = Number(item.inflows || 0);
                  const outflowsVal = Number(item.outflows || 0);
                  const netVal = inflowsVal - outflowsVal;

                  const outflowCats = item.outflowCategories || {};
                  const inflowCats = item.inflowCategories || {};

                  return (
                    <div className="p-3 bg-plt-card/95 backdrop-blur-md border border-plt-border rounded-xl shadow-xl font-sans text-xs min-w-[220px] max-w-[300px]">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-plt-border-soft">
                        <span className="font-semibold text-plt-text text-sm">
                          {viewLevel === 'months' ? item.label : `Day ${item.label} (${formatMonthLabel(activeMonth)})`}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            netVal >= 0
                              ? 'text-plt-profit bg-plt-profit/10'
                              : 'text-plt-risk bg-plt-risk/10'
                          }`}
                        >
                          Net: {netVal >= 0 ? '+' : ''}{formatMoney(netVal)}
                        </span>
                      </div>

                      {/* Inflows Section */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-plt-profit font-semibold">
                          <span>Inflows:</span>
                          <span className="tabular-nums">+{formatMoney(inflowsVal)}</span>
                        </div>
                        {breakdownMode === 'categories' && Object.keys(inflowCats).length > 0 && (
                          <div className="pl-2 mt-1 space-y-0.5 border-l border-plt-profit/30 text-[11px]">
                            {Object.entries(inflowCats).map(([catName, amt]) => (
                              <div key={catName} className="flex items-center justify-between text-plt-muted">
                                <span className="truncate">{catName}</span>
                                <span className="tabular-nums text-plt-text/80">{formatMoney(Number(amt))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Outflows Section */}
                      <div>
                        <div className="flex items-center justify-between text-plt-risk font-semibold">
                          <span>Outflows:</span>
                          <span className="tabular-nums">-{formatMoney(outflowsVal)}</span>
                        </div>
                        {breakdownMode === 'categories' && Object.keys(outflowCats).length > 0 && (
                          <div className="pl-2 mt-1 space-y-0.5 border-l border-plt-risk/30 text-[11px]">
                            {Object.entries(outflowCats).map(([catName, amt]) => (
                              <div key={catName} className="flex items-center justify-between text-plt-muted">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor:
                                        CATEGORY_COLORS[catName] ||
                                        FALLBACK_OUTFLOW_COLORS[0],
                                    }}
                                  />
                                  <span className="truncate">{catName}</span>
                                </div>
                                <span className="tabular-nums text-plt-text/80">{formatMoney(Number(amt))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {viewLevel === 'months' && (
                        <div className="pt-2 mt-2 border-t border-plt-border-soft/60 text-[10px] text-plt-muted text-center italic">
                          Click column to view daily transactions
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '10px',
                  fontFamily: 'var(--font-sans-token)',
                }}
                iconType="circle"
                iconSize={8}
              />

              {breakdownMode === 'totals' ? (
                <>
                  <Bar
                    dataKey="inflows"
                    name="Inflows (Income/Deposits)"
                    fill={COLOR_PROFIT}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey="outflows"
                    name="Outflows (Expenses/Injections)"
                    fill={COLOR_RISK}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                    className="cursor-pointer"
                  />
                </>
              ) : (
                <>
                  {/* Stacked Inflow Categories */}
                  {allInflowCategories.map((cat, idx) => (
                    <Bar
                      key={`inflow-${cat}`}
                      dataKey={`inflow_cat_${cat}`}
                      name={`[Inflow] ${cat}`}
                      stackId="inflows"
                      fill={CATEGORY_COLORS[cat] || COLOR_PROFIT}
                      radius={idx === allInflowCategories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={24}
                      className="cursor-pointer"
                    />
                  ))}

                  {/* Stacked Outflow Categories */}
                  {allOutflowCategories.map((cat, idx) => (
                    <Bar
                      key={`outflow-${cat}`}
                      dataKey={`outflow_cat_${cat}`}
                      name={`[Outflow] ${cat}`}
                      stackId="outflows"
                      fill={
                        CATEGORY_COLORS[cat] ||
                        FALLBACK_OUTFLOW_COLORS[idx % FALLBACK_OUTFLOW_COLORS.length]
                      }
                      radius={idx === allOutflowCategories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={24}
                      className="cursor-pointer"
                    />
                  ))}
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}


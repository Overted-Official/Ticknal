'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankTransaction, type BankAccount } from '@/types/bank';
import { getDashboardCashFlowKind } from '@/lib/portfolio-finance';

export type CashFlowTimeframe = '3M' | '6M' | '1Y' | 'All';
export type CashFlowChartMode = 'stacked' | 'paired' | 'net';

interface CashFlowProgressionChartProps {
  transactions?: BankTransaction[];
  accounts?: BankAccount[];
  usdRate?: number;
  timeframe?: CashFlowTimeframe;
  onTimeframeChange?: (tf: CashFlowTimeframe) => void;
  hideTimeframeSwitcher?: boolean;
}

const TIMEFRAMES: CashFlowTimeframe[] = ['3M', '6M', '1Y', 'All'];

export default function CashFlowProgressionChart({
  transactions = [],
  accounts = [],
  usdRate = 50.20,
  timeframe: propTimeframe,
  onTimeframeChange,
  hideTimeframeSwitcher = false,
}: CashFlowProgressionChartProps) {
  const [internalTimeframe, setInternalTimeframe] = useState<CashFlowTimeframe>('All');
  const [chartMode, setChartMode] = useState<CashFlowChartMode>('stacked');
  const timeframe = propTimeframe ?? internalTimeframe;
  const { isPrivacy } = usePrivacyMode();

  // Helper: Month label formatter (e.g. '2026-08' -> "Aug '26")
  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[Number(month) - 1] || month} '${(year || '').slice(2)}`;
  };

  // Aggregate Transactions into Monthly Buckets and Build Contiguous Timeline
  const filteredData = useMemo(() => {
    type MonthFlow = {
      label: string;
      rawDate: string;
      inflows: number;
      outflows: number;
      netFlow: number;
    };

    const monthlyMap = new Map<string, { inflows: number; outflows: number }>();
    let latestYm = '';
    let earliestYm = '';

    if (transactions.length > 0) {
      for (const tx of transactions) {
        const ym = tx.transactionDate ? tx.transactionDate.slice(0, 7) : '';
        if (!ym) continue;

        if (!latestYm || ym > latestYm) latestYm = ym;
        if (!earliestYm || ym < earliestYm) earliestYm = ym;

        if (!monthlyMap.has(ym)) {
          monthlyMap.set(ym, { inflows: 0, outflows: 0 });
        }

        const row = monthlyMap.get(ym)!;
        const amt = Number(tx.amount || 0);
        const egpVal = (tx.currency || '').toUpperCase() === 'USD' ? amt * usdRate : amt;
        const flowKind = getDashboardCashFlowKind(tx.type);

        if (flowKind === 'INFLOW') {
          row.inflows += egpVal;
        } else if (flowKind === 'OUTFLOW') {
          row.outflows += egpVal;
        }
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Anchor to the latest transaction month, or current month if later or no tx
    const anchorYm = latestYm ? (latestYm > currentYm ? latestYm : currentYm) : currentYm;
    const [anchorYear, anchorMonth] = anchorYm.split('-').map(Number);

    // Determine how many months to display based on timeframe
    let count = 6;
    if (timeframe === '3M') {
      count = 3;
    } else if (timeframe === '6M') {
      count = 6;
    } else if (timeframe === '1Y') {
      count = 12;
    } else if (timeframe === 'All') {
      if (earliestYm) {
        const [eY, eM] = earliestYm.split('-').map(Number);
        const monthsSpan = (anchorYear - eY) * 12 + (anchorMonth - eM) + 1;
        // Always display at least 6 months so bars evenly distribute without empty right void
        count = Math.max(6, Math.min(36, monthsSpan));
      } else {
        count = 6;
      }
    }

    const rows: MonthFlow[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(anchorYear, anchorMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      const label = `${monthNames[m - 1]} '${String(y).slice(2)}`;

      const data = monthlyMap.get(ym);
      const inflows = data ? Math.round(data.inflows) : 0;
      const outflows = data ? Math.round(data.outflows) : 0;
      const netFlow = inflows - outflows;

      rows.push({
        label,
        rawDate: ym,
        inflows,
        outflows,
        netFlow,
      });
    }

    return rows;
  }, [transactions, usdRate, timeframe]);

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
    if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(0)}k`;
    return `${sign}${absVal.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0].payload;
    const netSign = pt.netFlow >= 0 ? '+' : '';
    return (
      <div className="p-3 rounded-xl bg-surface-raised border border-white/10 text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
        <div className="font-semibold text-text-primary mb-1 border-b border-white/10 pb-1">
          {pt.rawDate || label}
        </div>
        <div className="flex justify-between gap-4 text-profit-num">
          <span>Inflows:</span>
          <strong className="text-text-primary font-semibold">
            {isPrivacy ? '•••••••• £' : `+${pt.inflows.toLocaleString('en-US')} £`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-loss-num">
          <span>Outflows:</span>
          <strong className="text-text-primary font-semibold">
            {isPrivacy ? '•••••••• £' : `-${pt.outflows.toLocaleString('en-US')} £`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-zinc-300 pt-1 border-t border-white/5">
          <span>Net Cash Flow:</span>
          <strong className={`font-semibold ${pt.netFlow >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
            {isPrivacy ? '•••••••• £' : `${netSign}${pt.netFlow.toLocaleString('en-US')} £`}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5 border border-border-subtle">
      {/* 1. Header with Title & Dynamic Legends on Left, Controls on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="text-[13px] font-semibold text-text-primary tracking-tight mr-0.5">
            Cash Flow Progression
          </span>
          {chartMode !== 'net' ? (
            <>
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-profit-chart" />
                <span>Inflows</span>
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-loss-chart" />
                <span>Outflows</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-profit-chart" />
                <span>Surplus (+)</span>
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-loss-chart" />
                <span>Deficit (-)</span>
              </span>
            </>
          )}
        </div>

        {/* Right side controls: Chart Mode Switcher + (Optional) Timeframe */}
        <div className="flex items-center gap-2 select-none flex-wrap">
          {/* Mode Switcher: Stacked | Paired | Net */}
          <div className="seg-control">
            {(['stacked', 'paired', 'net'] as const).map((mode) => {
              const isSelected = chartMode === mode;
              const label = mode === 'stacked' ? 'Stacked' : mode === 'paired' ? 'Paired' : 'Net';
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className={`seg-control-btn text-[11px] px-2 py-0.5 ${
                    isSelected ? 'seg-control-btn-active' : ''
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Timeframe Switcher (only shown when not hidden) */}
          {!hideTimeframeSwitcher && (
            <div className="seg-control">
              {TIMEFRAMES.map((tf) => {
                const isSelected = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      if (onTimeframeChange) onTimeframeChange(tf);
                      else setInternalTimeframe(tf);
                    }}
                    className={`seg-control-btn text-[11px] px-2 py-0.5 ${
                      isSelected ? 'seg-control-btn-active' : ''
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. TradingView Dark Bar Chart Canvas */}
      <div className="w-full h-[210px] relative">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            No transaction records found for cash flow progression.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 10, right: 2, left: -22, bottom: 0 }}
              barCategoryGap="16%"
            >
              <CartesianGrid
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                padding={{ left: 8, right: 8 }}
              />

              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatPriceValue}
                orientation="right"
                width={36}
                tickMargin={4}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              />

              {chartMode === 'net' ? (
                <Bar
                  dataKey="netFlow"
                  name="Net Cash Flow"
                  radius={[3, 3, 3, 3]}
                  maxBarSize={28}
                  isAnimationActive={false}
                >
                  {filteredData.map((entry, idx) => (
                    <Cell
                      key={`net-cell-${idx}`}
                      fill={entry.netFlow >= 0 ? 'var(--color-profit-chart)' : 'var(--color-loss-chart)'}
                    />
                  ))}
                </Bar>
              ) : (
                <>
                  <Bar
                    dataKey="inflows"
                    name="Inflows"
                    stackId={chartMode === 'stacked' ? 'cf' : undefined}
                    fill="var(--color-profit-chart)"
                    radius={chartMode === 'paired' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={chartMode === 'stacked' ? 28 : 16}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="outflows"
                    name="Outflows"
                    stackId={chartMode === 'stacked' ? 'cf' : undefined}
                    fill="var(--color-loss-chart)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={chartMode === 'stacked' ? 28 : 16}
                    isAnimationActive={false}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}




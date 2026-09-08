'use client';

import { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type MonthlyDataItem = {
  month: string;
  invested: number;
  pl: number;
  unrealizedPl?: number;
  roi: number;
  marketValue?: number;
  cumulativeRealizedPl?: number;
  winRate?: number | null;
};

const TIME_FILTERS = ['All', 'Y', 'Q', 'M'] as const;
export type TimeFilter = typeof TIME_FILTERS[number];

const CHART_AXIS_COLOR = 'var(--chart-axis)';
const CHART_GRID_COLOR = 'rgba(255, 255, 255, 0.06)';

// High-contrast refined financial series colors
const COLOR_INVESTED = 'rgba(255, 255, 255, 0.16)';
const COLOR_PROFIT = '#10b981';
const COLOR_RISK = '#ef4444';
const COLOR_UNREALIZED = '#06b6d4';
const COLOR_ROI_LINE = '#f59e0b';

function formatEGP(value: number, isPrivacy = false): string {
  if (isPrivacy) return '***';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
  isPrivacy?: boolean;
}

function CustomTooltip({ active, payload, label, isPrivacy }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-plt-border bg-plt-card/95 px-3.5 py-2 text-xs shadow-xl backdrop-blur-md min-w-44 select-none">
      <div className="font-semibold text-plt-text font-sans mb-1.5 pb-1.5 border-b border-plt-border-soft flex items-center justify-between">
        <span>{label}</span>
      </div>
      {payload.map((entry, index) => {
        const value = entry.value as number;
        const isRoi = entry.name === 'Cumulative ROI';
        const isRealized = entry.name === 'Realized P/L';
        const isUnrealized = entry.name === 'Unrealized P/L';
        const isInvested = entry.name === 'Invested Capital';

        let color = entry.color;
        if (isRoi) {
          color = COLOR_ROI_LINE;
        } else if (isRealized) {
          color = value >= 0 ? COLOR_PROFIT : COLOR_RISK;
        } else if (isUnrealized) {
          color = value >= 0 ? COLOR_UNREALIZED : COLOR_RISK;
        } else if (isInvested) {
          color = 'rgba(255, 255, 255, 0.7)';
        }

        const formatted = isRoi
          ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
          : isPrivacy
            ? `${value >= 0 && (isRealized || isUnrealized) ? '+' : ''}****** £`
            : `${value >= 0 && (isRealized || isUnrealized) ? '+' : ''}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} £`;

        return (
          <div key={index} style={{ color }} className="mt-1 flex items-center justify-between gap-3 text-[11px] font-sans">
            <span className="opacity-80">{entry.name}:</span>
            <span className="tabular-nums font-mono font-semibold">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyInvestmentChart({ data }: { data: MonthlyDataItem[] }) {
  const [filter, setFilter] = useState<TimeFilter>('All');
  const { isPrivacy } = usePrivacyMode();

  // Filter out leading & trailing empty zero-months to give active months full proportional width
  const filteredData = useMemo(() => {
    if (!data || !data.length) return [];

    let dataset = data;

    if (filter === 'All') {
      let firstIdx = -1;
      let lastIdx = -1;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        if (d.invested > 0 || d.pl !== 0 || (d.unrealizedPl && d.unrealizedPl !== 0)) {
          if (firstIdx === -1) firstIdx = i;
          lastIdx = i;
        }
      }
      if (firstIdx !== -1) {
        // Keep 1 buffer month before and after for natural chart framing
        const start = Math.max(0, firstIdx - 1);
        const end = Math.min(data.length, lastIdx + 2);
        dataset = data.slice(start, end);
      } else {
        dataset = data.slice(-6);
      }
    } else if (filter === 'Y') {
      const now = new Date();
      const currentYearStr = now.getFullYear().toString();
      dataset = data.filter(d => d.month.endsWith(currentYearStr.slice(2)) || d.month.endsWith(currentYearStr));
      if (!dataset.length) dataset = data.slice(-12);
    } else if (filter === 'Q') {
      dataset = data.slice(-3);
    } else if (filter === 'M') {
      dataset = data.slice(-1);
    }

    return dataset;
  }, [data, filter]);

  // Summary Metrics Header
  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalRealized = 0;
    let latestUnrealized = 0;
    let latestRoi = 0;

    for (const d of data) {
      totalInvested += d.invested;
      totalRealized += d.pl;
      // unrealizedPl is a month-end snapshot, not a monthly flow. Summing it
      // across months double-counts the same open position repeatedly.
      latestUnrealized = d.unrealizedPl ?? 0;
      latestRoi = d.roi;
    }
    return {
      totalInvested,
      totalRealized,
      latestUnrealized,
      latestRoi,
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col justify-between select-none">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2 pb-2 border-b border-plt-border-soft">
        <div>
          <h2 className="widget-title">Monthly Performance</h2>
          <p className="widget-subtitle mt-0.5">Capital deployment and cumulative return progression</p>
        </div>
        <div className="pill-switch">
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setFilter(tf)}
              className={`pill-switch-btn text-[11px] cursor-pointer ${
                filter === tf ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Micro Metrics Strip */}
      <div className="flex items-center gap-3 text-xs font-mono mb-2 px-1 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-plt-muted text-[10px]">Invested:</span>
          <span className="text-plt-text font-semibold text-[11px]">
            {isPrivacy ? '******' : `${formatEGP(summary.totalInvested)} £`}
          </span>
        </div>
        <span className="text-plt-border-soft">•</span>
        <div className="flex items-center gap-1">
          <span className="text-plt-muted text-[10px]">Realized:</span>
          <span className={`font-semibold text-[11px] ${summary.totalRealized >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
            {isPrivacy ? '******' : `${summary.totalRealized >= 0 ? '+' : ''}${formatEGP(summary.totalRealized)} £`}
          </span>
        </div>
        <span className="text-plt-border-soft">•</span>
        <div className="flex items-center gap-1">
          <span className="text-plt-muted text-[10px]">Unrealized (latest):</span>
          <span className={`font-semibold text-[11px] ${summary.latestUnrealized >= 0 ? 'text-cyan-400' : 'text-plt-risk'}`}>
            {isPrivacy ? '******' : `${summary.latestUnrealized >= 0 ? '+' : ''}${formatEGP(summary.latestUnrealized)} £`}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-plt-muted text-[10px]">Total ROI:</span>
          <span className={`font-bold font-mono text-[11px] ${summary.latestRoi >= 0 ? 'text-amber-400' : 'text-plt-risk'}`}>
            {summary.latestRoi >= 0 ? '+' : ''}{summary.latestRoi.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative h-[255px] w-full">
        {!filteredData.length ? (
          <div className="flex h-full items-center justify-center text-xs text-plt-muted font-sans">
            No data for this {filter === 'Y' ? 'year' : filter === 'Q' ? 'quarter' : filter === 'M' ? 'month' : 'period'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              barCategoryGap="18%"
              barGap={3}
            >
              <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => formatEGP(val, isPrivacy)}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: COLOR_ROI_LINE, fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val}%`}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip content={<CustomTooltip isPrivacy={isPrivacy} />} cursor={{ fill: 'var(--plt-bg-hover)', opacity: 0.5 }} />
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                iconType="circle"
                iconSize={6}
              />
              <Bar
                yAxisId="left"
                dataKey="invested"
                name="Invested Capital"
                fill={COLOR_INVESTED}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                yAxisId="left"
                dataKey="pl"
                name="Realized P/L"
                fill={COLOR_PROFIT}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              >
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-realized-${index}`} fill={entry.pl >= 0 ? COLOR_PROFIT : COLOR_RISK} />
                ))}
              </Bar>
              <Bar
                yAxisId="left"
                dataKey="unrealizedPl"
                name="Unrealized P/L"
                fill={COLOR_UNREALIZED}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              >
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-unrealized-${index}`} fill={(entry.unrealizedPl ?? 0) >= 0 ? COLOR_UNREALIZED : COLOR_RISK} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="roi"
                name="Cumulative ROI"
                stroke={COLOR_ROI_LINE}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COLOR_ROI_LINE, stroke: 'var(--plt-bg-base)', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: COLOR_ROI_LINE }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

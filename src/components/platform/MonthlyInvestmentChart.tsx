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
};

const TIME_FILTERS = ['All', 'Y', 'Q', 'M'] as const;
export type TimeFilter = typeof TIME_FILTERS[number];

const CHART_AXIS_COLOR = 'var(--chart-axis)';
const CHART_GRID_COLOR = 'var(--chart-grid)';

// High-contrast distinct visual series colors
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
    <div className="rounded-xl border border-plt-border bg-plt-surface px-4 py-2 text-xs shadow-popover backdrop-blur-md min-w-42">
      <div className="font-medium text-plt-text mb-2 pb-2 border-b border-plt-border-soft">{label}</div>
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
          color = 'rgba(255, 255, 255, 0.65)';
        }

        const formatted = isRoi
          ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
          : isPrivacy
            ? `${value >= 0 && (isRealized || isUnrealized) ? '+' : ''}****** £`
            : `${value >= 0 && (isRealized || isUnrealized) ? '+' : ''}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} £`;

        return (
          <div key={index} style={{ color }} className="mt-1.5 flex items-center justify-between gap-4 text-caption">
            <span className="opacity-90">{entry.name}:</span>
            <span className="tabular-nums font-medium">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyInvestmentChart({ data }: { data: MonthlyDataItem[] }) {
  const [filter, setFilter] = useState<TimeFilter>('All');
  const { isPrivacy } = usePrivacyMode();

  const filteredData = useMemo(() => {
    if (filter === 'All' || !data.length) return data;

    const now = new Date();
    const currentYearStr = now.getFullYear().toString();
    
    if (filter === 'Y') {
      return data.filter(d => d.month.endsWith(currentYearStr.slice(2)) || d.month.endsWith(currentYearStr));
    }
    if (filter === 'Q') {
      return data.slice(-3);
    }
    if (filter === 'M') {
      return data.slice(-1);
    }
    return data;
  }, [data, filter]);

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-3 flex items-center justify-between gap-2">
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
              className={`pill-switch-btn text-[11px] ${
                filter === tf ? 'pill-switch-btn-active' : ''
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[320px] w-full">
        {!filteredData.length ? (
          <div className="flex h-full items-center justify-center text-xs text-plt-faint">
            No data for this {filter === 'Y' ? 'year' : filter === 'Q' ? 'quarter' : filter === 'M' ? 'month' : 'period'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-size-mini)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 'var(--text-size-mini)' }}
                tickFormatter={(val) => formatEGP(val, isPrivacy)}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: COLOR_ROI_LINE, fontSize: 'var(--text-size-mini)' }}
                tickFormatter={(val) => `${val}%`}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip isPrivacy={isPrivacy} />} cursor={{ fill: 'var(--plt-bg-hover)' }} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="left"
                dataKey="invested"
                name="Invested Capital"
                fill={COLOR_INVESTED}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                yAxisId="left"
                dataKey="pl"
                name="Realized P/L"
                fill={COLOR_PROFIT}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
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
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
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
                dot={{ r: 3.5, fill: COLOR_ROI_LINE, stroke: 'var(--plt-bg-base)', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: COLOR_ROI_LINE }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

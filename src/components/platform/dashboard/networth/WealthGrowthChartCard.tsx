'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  Tooltip,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { NetWorthTrendPoint } from '@/lib/portfolio-finance';

interface WealthGrowthChartCardProps {
  trendData: NetWorthTrendPoint[];
  currencyMode: 'EGP' | 'USD';
  usdRate: number;
}

export default function WealthGrowthChartCard({
  trendData,
  currencyMode,
  usdRate,
}: WealthGrowthChartCardProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';
  const historicalGrowth = trendData;

  const GrowthTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-3 rounded-xl bg-plt-card border border-plt-border-strong shadow-popover text-xs tabular-nums select-none font-sans space-y-1">
          <div className="font-semibold text-plt-text mb-1 border-b border-plt-border-soft pb-1">
            {d.fullDate}
          </div>
          <div className="text-plt-profit flex justify-between gap-4">
            <span>Nominal Wealth:</span>
            <strong>{isPrivacy ? '******' : `${displaySymbol}${d.nominal.toLocaleString()}${displaySuffix}`}</strong>
          </div>
          <div className="text-plt-info flex justify-between gap-4">
            <span>Real Purchasing:</span>
            <strong>{isPrivacy ? '******' : `${displaySymbol}${d.real.toLocaleString()}${displaySuffix}`}</strong>
          </div>
          <div className="text-plt-risk flex justify-between gap-4">
            <span>Inflation Drag:</span>
            <strong>{isPrivacy ? '******' : `-${displaySymbol}${d.drag.toLocaleString()}${displaySuffix}`}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-widget h-full flex flex-col justify-between select-none">
      {/* 1. Card Header */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div>
          <h3 className="widget-title">
            Wealth Growth vs Real Purchasing Power
          </h3>
          <p className="widget-subtitle mt-0.5">
            Recorded nominal net worth compared against weighted-inflation-adjusted purchasing power
          </p>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-sans text-plt-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-plt-profit" />
            <span>Nominal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-plt-info" />
            <span>Real (Weighted Deflated)</span>
          </span>
        </div>
      </div>

      {/* 2. Area + Line Chart */}
      <div className="w-full h-[380px] my-2">
        {historicalGrowth.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-plt-muted font-sans">
            Historical net worth data is not available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nominalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--plt-profit)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--plt-profit)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--palette-chart-grid)" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="var(--plt-text-faint)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--palette-chart-grid)' }}
            />
            <YAxis
              stroke="var(--plt-text-faint)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (isPrivacy ? '***' : `${(v / 1000).toFixed(0)}k`)}
            />
            <Tooltip content={<GrowthTooltip />} />
            <Area
              type="monotone"
              dataKey="nominal"
              stroke="var(--plt-profit)"
              strokeWidth={2}
              fill="url(#nominalAreaGrad)"
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke="var(--plt-info)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Card Footer */}
      <div className="pt-3 border-t border-plt-border-soft flex items-center justify-between text-[11px] font-sans text-plt-muted">
        <span>Forex Valuation: 1 USD = {usdRate.toFixed(2)} £</span>
        <span className="text-plt-profit font-semibold">100% Mark-to-Market Live</span>
      </div>
    </div>
  );
}

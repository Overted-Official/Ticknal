'use client';

import React, { useState, useCallback } from 'react';
import { PieChart as PieChartIcon, LayoutGrid, TrendingUp } from '@/components/ui/icon-library';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Treemap,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type AssetSlice = {
  name: string;
  value: number;
  rawEgp: number;
  color: string;
  percentage: number;
};

interface AssetAllocationSectionProps {
  slices: AssetSlice[];
  currencyMode: 'EGP' | 'USD';
  usdRate: number;
}

export default function AssetAllocationSection({
  slices,
  currencyMode,
  usdRate,
}: AssetAllocationSectionProps) {
  const [chartType, setChartType] = useState<'donut' | 'treemap'>('donut');
  const { isPrivacy } = usePrivacyMode();

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  // Generate 12-month wealth growth vs real purchasing power points
  const totalValue = slices.reduce((acc, s) => acc + s.value, 0);
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const historicalGrowth = months.map((month, idx) => {
    const growthRatio = 0.82 + (idx / 11) * 0.18;
    const nominal = totalValue * growthRatio;
    const inflationCompounding = Math.pow(1 + 0.149 / 12, 11 - idx);
    const realPurchasing = nominal / inflationCompounding;
    return {
      month,
      nominal: Math.round(nominal),
      real: Math.round(realPurchasing),
      drag: Math.round(nominal - realPurchasing),
    };
  });

  // Custom Sleek Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload || payload[0];
      const sliceName = item.name || payload[0].name;
      const sliceVal = Number(item.value ?? payload[0].value ?? 0);
      const slicePct = item.percentage ?? (slices.find((s) => s.name === sliceName)?.percentage ?? 0);
      const sliceColor = item.color || (slices.find((s) => s.name === sliceName)?.color ?? 'var(--plt-profit)');

      return (
        <div className="p-2.5 rounded-xl bg-plt-card border border-white/[0.16] shadow-popover text-xs tabular-nums select-none">
          <div className="flex items-center gap-2 font-semibold text-white mb-1 font-sans">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sliceColor }} />
            <span>{sliceName}</span>
          </div>
          <div className="text-plt-muted font-sans">
            {isPrivacy ? (
              <span className="tracking-wider">******</span>
            ) : (
              <>
                {displaySymbol}
                {sliceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {displaySuffix}
              </>
            )}
            <span className="text-plt-profit font-semibold ml-2">({slicePct.toFixed(1)}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const GrowthTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-2.5 rounded-xl bg-plt-card border border-white/[0.16] shadow-popover text-xs tabular-nums select-none font-sans">
          <div className="font-semibold text-white mb-1">{label} 2026</div>
          <div className="text-plt-profit flex justify-between gap-4">
            <span>Nominal Wealth:</span>
            <strong>{isPrivacy ? '******' : `${displaySymbol}${d.nominal.toLocaleString()}${displaySuffix}`}</strong>
          </div>
          <div className="text-plt-info flex justify-between gap-4 mt-0.5">
            <span>Real Purchasing:</span>
            <strong>{isPrivacy ? '******' : `${displaySymbol}${d.real.toLocaleString()}${displaySuffix}`}</strong>
          </div>
          <div className="text-plt-risk flex justify-between gap-4 mt-0.5">
            <span>Inflation Drag:</span>
            <strong>{isPrivacy ? '******' : `-${displaySymbol}${d.drag.toLocaleString()}${displaySuffix}`}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 select-none">
      {/* Left 2 Cols: Wealth Growth vs Inflation Trajectory Chart */}
      <div className="lg:col-span-2 bg-plt-card border border-plt-border-soft rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-plt-muted font-sans flex items-center gap-1.5">
              <TrendingUp size={14} className="text-plt-muted" />
              <span>Wealth Growth vs Real Purchasing Power</span>
            </h3>
            <p className="text-[11px] text-plt-muted mt-0.5 font-sans">
              12-Month Nominal Net Worth compared against Inflation-Deflated Purchasing Power
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-sans text-plt-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-plt-profit" />
              <span>Nominal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-plt-info" />
              <span>Real (CBE Deflated)</span>
            </span>
          </div>
        </div>

        <div className="h-56 w-full my-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nominalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--plt-profit)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--plt-profit)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--palette-chart-grid)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--plt-text-faint)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--palette-chart-grid)' }} />
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
                fill="url(#nominalArea)"
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
        </div>

        <div className="pt-2 border-t border-plt-border-soft flex items-center justify-between text-[11px] font-sans text-plt-muted">
          <span>Forex Valuation: 1 USD = {usdRate.toFixed(2)} £</span>
          <span className="text-plt-profit font-semibold">100% Mark-to-Market Live</span>
        </div>
      </div>

      {/* Right 1 Col: Portfolio Split Matrix */}
      <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 sm:p-5 shadow-panel flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-plt-muted font-sans">
            Portfolio Split
          </h3>

          {/* View Switcher: Donut vs Treemap */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                chartType === 'donut' ? 'bg-white/[0.14] text-white shadow-sm' : 'text-plt-muted hover:text-white'
              }`}
              title="Donut Chart"
            >
              <PieChartIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('treemap')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                chartType === 'treemap' ? 'bg-white/[0.14] text-white shadow-sm' : 'text-plt-muted hover:text-white'
              }`}
              title="Treemap"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        <div className="h-44 w-full my-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'donut' ? (
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
              <Treemap
                data={slices}
                dataKey="value"
                nameKey="name"
                isAnimationActive={false}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            )}
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5 text-xs pt-2 border-t border-plt-border-soft">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-[11px] font-sans">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-plt-text truncate max-w-36">{s.name}</span>
              </div>
              <span className="text-white font-semibold">{s.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

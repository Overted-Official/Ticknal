'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import type { NetWorthTrendPoint } from '@/lib/portfolio-finance';

export type Timeframe = '1D' | '1M' | '3M' | '1Y' | '5Y' | 'All';

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
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [chartStyle, setChartStyle] = useState<'area' | 'line'>('area');
  const { isPrivacy } = usePrivacyMode();

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';
  const currencyCode = currencyMode === 'USD' ? 'USD' : 'EGP';

  // Filter Data by Timeframe
  const filteredData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    if (timeframe === '1D') return trendData.slice(-2);
    if (timeframe === '1M') return trendData.slice(-2);
    if (timeframe === '3M') return trendData.slice(-3);
    if (timeframe === '1Y') return trendData.slice(-12);
    if (timeframe === '5Y') return trendData.slice(-60);
    return trendData;
  }, [trendData, timeframe]);

  const latestPoint = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const latestNominal = latestPoint ? latestPoint.nominal : 0;

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toFixed(1);
  };

  const GrowthTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as NetWorthTrendPoint;
      return (
        <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
          <div className="font-semibold text-white mb-1 border-b border-[#2a2e39] pb-1">
            {d.fullDate || d.month}
          </div>
          <div className="flex justify-between gap-4 text-[#089981]">
            <span>Nominal Wealth:</span>
            <strong className="text-white">
              {isPrivacy ? '••••••••' : `${displaySymbol}${d.nominal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
            </strong>
          </div>
          <div className="flex justify-between gap-4 text-[#2962ff]">
            <span>Real Purchasing:</span>
            <strong className="text-white">
              {isPrivacy ? '••••••••' : `${displaySymbol}${d.real.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
            </strong>
          </div>
          <div className="flex justify-between gap-4 text-[#f23645]">
            <span>Inflation Drag:</span>
            <strong className="text-white">
              {isPrivacy ? '••••••••' : `-${displaySymbol}${d.drag.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
            </strong>
          </div>
        </div>
      );
    }
    return null;
  };

  const timeframes: Timeframe[] = ['1D', '1M', '3M', '1Y', '5Y', 'All'];

  return (
    <div className="w-full flex flex-col justify-start select-none bg-transparent space-y-3">
      {/* 1. Header with Legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Wealth Growth vs Real Purchasing Power
          </h3>
          <p className="text-xs text-[#787b86] mt-0.5">
            Recorded nominal net worth compared against weighted-inflation-adjusted purchasing power
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
            <span>Nominal</span>
          </span>
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]" />
            <span>Real (Deflated)</span>
          </span>
        </div>
      </div>

      {/* 2. TradingView Chart Canvas */}
      <div className="w-full h-[340px] relative">
        {filteredData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#787b86]">
            Historical net worth data is not available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 12, right: 68, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="tvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#089981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Minimalist Horizontal Gridlines matching TradingView */}
              <CartesianGrid
                stroke="#1e222d"
                strokeDasharray="2 2"
                vertical={false}
                strokeOpacity={0.7}
              />

              {/* X-Axis on Bottom */}
              <XAxis
                dataKey="month"
                stroke="#787b86"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={6}
              />

              {/* Y-Axis on RIGHT (TradingView Price Scale) */}
              <YAxis
                orientation="right"
                stroke="#787b86"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (isPrivacy ? '•••' : formatPriceValue(v))}
                dx={8}
                domain={['auto', 'auto']}
              />

              {/* Right-Axis Current Price Tag (TradingView Solid Green Badge) */}
              {latestPoint && (
                <ReferenceLine
                  y={latestNominal}
                  stroke="#089981"
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  label={({ viewBox }: any) => {
                    if (!viewBox) return null;
                    const { x, y, width } = viewBox;
                    const posX = x + width + 4;
                    return (
                      <g transform={`translate(${posX}, ${y - 11})`}>
                        <rect width="60" height="22" rx="4" fill="#089981" />
                        <text
                          x="30"
                          y="15"
                          fill="#ffffff"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {isPrivacy ? '••••' : formatPriceValue(latestNominal)}
                        </text>
                      </g>
                    );
                  }}
                />
              )}

              <Tooltip content={<GrowthTooltip />} />

              {/* Nominal Area / Line */}
              <Area
                type="monotone"
                dataKey="nominal"
                stroke="#089981"
                strokeWidth={2}
                fill={chartStyle === 'area' ? 'url(#tvAreaGrad)' : 'transparent'}
                isAnimationActive={false}
              />

              {/* Real Purchasing Line */}
              <Line
                type="monotone"
                dataKey="real"
                stroke="#2962ff"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. TradingView Controls Row (Bottom Bar from Reference Snippet) */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1e222d] mt-1">
        {/* Timeframe Selectors (1D, 1M, 3M, 1Y, 5Y, All) */}
        <div className="flex items-center gap-1">
          {timeframes.map((tf) => {
            const isSelected = timeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`text-xs px-3 py-1 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-[#2a2e39] text-white font-bold shadow-xs border border-[#2a2e39]'
                    : 'text-[#787b86] hover:text-white font-medium'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Right Controls: Area vs Line Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-[#18181b] border border-[#27272a]">
            {/* Area Icon */}
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              className={`p-1.5 rounded-md transition-all ${
                chartStyle === 'area'
                  ? 'bg-[#27272a] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
              title="Area style"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none">
                <path fill="currentColor" d="M22.306 7.282c.635-.612 1.693-.161 1.693.72v12.003a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5.71a1 1 0 0 1 .378-.784l5.396-4.288a1 1 0 0 1 1.265.017l4.938 4.14zm-5.96 7.13a.5.5 0 0 1-.668.024l-5.282-4.43L5 14.293v5.711h17.999V8.002z" />
              </svg>
            </button>

            {/* Line / Candles Icon */}
            <button
              type="button"
              onClick={() => setChartStyle('line')}
              className={`p-1.5 rounded-md transition-all ${
                chartStyle === 'line'
                  ? 'bg-[#2a2e39] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
              title="Line style"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none">
                <path fill="currentColor" fillRule="evenodd" d="M11 4h-1v3H8.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5H10v3h1v-3h1.5a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5H11V4ZM9 8v12h3V8H9Zm10-1h-1v3h-1.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5H18v3h1v-3h1.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H19V7Zm-2 10v-6h3v6h-3Z" />
              </svg>
            </button>
          </div>

          <span className="text-[11px] text-[#787b86] hidden sm:inline-block">
            1 USD = {usdRate.toFixed(2)} £
          </span>
        </div>
      </div>
    </div>
  );
}

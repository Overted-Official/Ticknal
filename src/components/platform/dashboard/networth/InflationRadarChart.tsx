'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type InflationPoint = {
  month: string;
  fullDate?: string;
  nominal: number;
  realValue: number;
  inflationDrag: number;
};

interface InflationRadarChartProps {
  points: InflationPoint[];
  cbeAnnualInflation?: number;
  usCpiAnnualInflation?: number;
  effectiveAnnualInflation?: number;
  wEgpPct?: number;
  wUsdPct?: number;
  currencyMode: 'EGP' | 'USD';
  usdRate?: number;
}

export type Timeframe = '1D' | '1M' | '3M' | '1Y' | '5Y' | 'All';

export default function InflationRadarChart({
  points,
  cbeAnnualInflation = 14.9,
  usCpiAnnualInflation = 2.8,
  effectiveAnnualInflation,
  wEgpPct,
  wUsdPct,
  currencyMode,
  usdRate,
}: InflationRadarChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [chartStyle, setChartStyle] = useState<'area' | 'line'>('area');
  const { isPrivacy } = usePrivacyMode();

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';
  const activeEffectiveRate = effectiveAnnualInflation !== undefined ? effectiveAnnualInflation : cbeAnnualInflation;

  // Filter Data by Timeframe
  const filteredPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    if (timeframe === '1D') return points.slice(-2);
    if (timeframe === '1M') return points.slice(-2);
    if (timeframe === '3M') return points.slice(-3);
    if (timeframe === '1Y') return points.slice(-12);
    if (timeframe === '5Y') return points.slice(-60);
    return points;
  }, [points, timeframe]);

  const latestPoint = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;
  const latestNominal = latestPoint ? latestPoint.nominal : 0;

  const priceRange = useMemo(() => {
    if (!filteredPoints || filteredPoints.length === 0) return 1;
    const values = filteredPoints.flatMap((p) => [p.nominal, p.realValue]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Math.max(1, max - min);
  }, [filteredPoints]);

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toFixed(1);
  };

  const InflationTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as InflationPoint;
    return (
      <div className="p-3 rounded-xl bg-[#27272a] border border-[#3f3f46] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
        <div className="font-semibold text-white mb-1 border-b border-[#3f3f46] pb-1">
          {data.fullDate || label}
        </div>
        <div className="flex justify-between gap-4 text-[#089981]">
          <span>Nominal Value:</span>
          <strong className="text-white">
            {isPrivacy ? '••••••••' : `${displaySymbol}${data.nominal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-[#ff9800]">
          <span>Real Purchasing:</span>
          <strong className="text-white">
            {isPrivacy ? '••••••••' : `${displaySymbol}${data.realValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
          </strong>
        </div>
        <div className="flex justify-between gap-4 text-[#f23645]">
          <span>Inflation Drag:</span>
          <strong className="text-white">
            {isPrivacy ? '••••••••' : `-${displaySymbol}${data.inflationDrag.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${displaySuffix}`}
          </strong>
        </div>
      </div>
    );
  };

  const timeframes: Timeframe[] = ['1D', '1M', '3M', '1Y', '5Y', 'All'];

  return (
    <div className="w-full flex flex-col justify-start select-none bg-transparent space-y-3">
      {/* 1. Header with Legends and Inflation Rate Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
            <span>Nominal</span>
          </span>
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff9800]" />
            <span>Real Deflated</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-[#ff9800]/15 text-[#ff9800] border border-[#ff9800]/30 font-semibold tabular-nums">
            Effective: {activeEffectiveRate}%
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#f23645]/15 text-[#f23645] border border-[#f23645]/30 font-medium tabular-nums">
            £ CBE: {cbeAnnualInflation}% {wEgpPct !== undefined && `(${wEgpPct}%)`}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#089981]/15 text-[#089981] border border-[#089981]/30 font-medium tabular-nums">
            USD CPI: {usCpiAnnualInflation}% {wUsdPct !== undefined && `(${wUsdPct}%)`}
          </span>
        </div>
      </div>

      {/* 2. TradingView Chart Canvas */}
      <div className="w-full h-[340px] relative">
        {filteredPoints.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#787b86]">
            Historical purchasing-power data is not available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredPoints} margin={{ top: 12, right: 4, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="tvNominalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#089981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tvRealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9800" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#ff9800" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Minimalist Horizontal Gridlines matching TradingView */}
              <CartesianGrid
                stroke="#27272a"
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
                padding={{ left: 0, right: 0 }}
                dy={6}
              />

              {/* Y-Axis on RIGHT (TradingView Price Scale) */}
              <YAxis
                orientation="right"
                width={50}
                stroke="#787b86"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (isPrivacy) return '•••';
                  if (latestNominal && Math.abs(v - latestNominal) <= priceRange * 0.09) {
                    return '';
                  }
                  return formatPriceValue(v);
                }}
                dx={8}
                domain={['auto', 'auto']}
              />

              {/* Right-Axis Current Price Tag (TradingView Solid Green Badge) */}
              {latestPoint && latestNominal !== 0 && (
                <ReferenceLine
                  y={latestNominal}
                  stroke="#089981"
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  label={({ viewBox }: any) => {
                    if (!viewBox) return null;
                    const { x, y, width } = viewBox;
                    const posX = x + width + 2;
                    return (
                      <g transform={`translate(${posX}, ${y - 10})`}>
                        <rect width="46" height="20" rx="4" fill="#089981" />
                        <text
                          x="23"
                          y="14"
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

              <Tooltip content={<InflationTooltip />} />

              {/* Nominal Wealth Area */}
              <Area
                type="monotone"
                dataKey="nominal"
                stroke="#089981"
                strokeWidth={2}
                fill={chartStyle === 'area' ? 'url(#tvNominalGrad)' : 'transparent'}
                isAnimationActive={false}
              />

              {/* Real Purchasing Power Area / Line */}
              <Area
                type="monotone"
                dataKey="realValue"
                stroke="#ff9800"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill={chartStyle === 'area' ? 'url(#tvRealGrad)' : 'transparent'}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. TradingView Controls Row (Bottom Bar from Reference Snippet) */}
      <div className="flex items-center justify-between pt-2 border-t border-[#27272a] mt-1">
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
                    ? 'bg-[#3f3f46] text-white font-bold shadow-xs border border-[#3f3f46]'
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

            {/* Line Icon */}
            <button
              type="button"
              onClick={() => setChartStyle('line')}
              className={`p-1.5 rounded-md transition-all ${
                chartStyle === 'line'
                  ? 'bg-[#3f3f46] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
              title="Line style"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none">
                <path fill="currentColor" fillRule="evenodd" d="M11 4h-1v3H8.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5H10v3h1v-3h1.5a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5H11V4ZM9 8v12h3V8H9Zm10-1h-1v3h-1.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5H18v3h1v-3h1.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H19V7Zm-2 10v-6h3v6h-3Z" />
              </svg>
            </button>
          </div>

          {usdRate !== undefined && usdRate > 0 && (
            <span className="text-[11px] text-[#787b86] hidden sm:inline-block ml-1">
              1 USD = {usdRate.toFixed(2)} £
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

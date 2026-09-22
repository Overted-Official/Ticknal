'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
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

export type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'All';
export type ChartStyle = 'area' | 'bars' | 'line';

interface MonthlyInvestmentChartProps {
  data: MonthlyDataItem[];
}

export default function MonthlyInvestmentChart({ data }: MonthlyInvestmentChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('area');
  const { isPrivacy } = usePrivacyMode();

  // Summary Metrics Header
  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalRealized = 0;
    let latestUnrealized = 0;
    let latestRoi = 0;
    let latestMarketValue = 0;

    for (const d of data ?? []) {
      totalInvested += d.invested;
      totalRealized += d.pl;
      if (d.unrealizedPl !== undefined) latestUnrealized = d.unrealizedPl;
      if (d.roi !== undefined) latestRoi = d.roi;
      if (d.marketValue !== undefined && d.marketValue > 0) {
        latestMarketValue = d.marketValue;
      }
    }

    return {
      totalInvested,
      totalRealized,
      latestUnrealized,
      latestRoi,
      latestMarketValue,
    };
  }, [data]);

  // Filter Data by Timeframe
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (timeframe === '1M') return data.slice(-2);
    if (timeframe === '3M') return data.slice(-3);
    if (timeframe === '6M') return data.slice(-6);
    if (timeframe === '1Y') return data.slice(-12);
    return data;
  }, [data, timeframe]);

  const latestPoint = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const latestValue = latestPoint
    ? chartStyle === 'bars'
      ? latestPoint.pl
      : latestPoint.marketValue && latestPoint.marketValue > 0
      ? latestPoint.marketValue
      : latestPoint.cumulativeRealizedPl ?? latestPoint.invested
    : 0;

  const priceRange = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return 1;
    const values = filteredData.flatMap((d) => [
      d.marketValue ?? 0,
      d.invested ?? 0,
      d.cumulativeRealizedPl ?? 0,
      d.pl ?? 0,
      d.unrealizedPl ?? 0,
    ]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Math.max(1, max - min);
  }, [filteredData]);

  const formatPriceValue = (val: number) => {
    if (isPrivacy) return '••••';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
    if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(1)}k`;
    return `${sign}${absVal.toFixed(1)}`;
  };

  const timeframes: Timeframe[] = ['1M', '3M', '6M', '1Y', 'All'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload as MonthlyDataItem;
    return (
      <div className="p-3 rounded-xl bg-[#27272a] border border-[#3f3f46] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl min-w-[210px]">
        <div className="font-semibold text-white mb-1 border-b border-[#3f3f46] pb-1 flex justify-between items-center">
          <span>{d.month}</span>
          {d.roi !== undefined && (
            <span className={d.roi >= 0 ? 'text-[#ff9800]' : 'text-[#f23645]'}>
              {d.roi >= 0 ? '+' : ''}{d.roi.toFixed(1)}% ROI
            </span>
          )}
        </div>
        {d.marketValue !== undefined && d.marketValue > 0 && (
          <div className="flex justify-between gap-4 text-[#2962ff]">
            <span>Market Value:</span>
            <strong className="text-white">
              {isPrivacy ? '••••••••' : `${d.marketValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £`}
            </strong>
          </div>
        )}
        <div className="flex justify-between gap-4 text-[#089981]">
          <span>Realized P/L:</span>
          <strong className={d.pl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
            {isPrivacy ? '••••••••' : `${d.pl >= 0 ? '+' : ''}${d.pl.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £`}
          </strong>
        </div>
        {d.unrealizedPl !== undefined && d.unrealizedPl !== 0 && (
          <div className="flex justify-between gap-4 text-[#00bcd4]">
            <span>Unrealized P/L:</span>
            <strong className={d.unrealizedPl >= 0 ? 'text-[#00bcd4]' : 'text-[#f23645]'}>
              {isPrivacy ? '••••••••' : `${d.unrealizedPl >= 0 ? '+' : ''}${d.unrealizedPl.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £`}
            </strong>
          </div>
        )}
        {d.invested > 0 && (
          <div className="flex justify-between gap-4 text-[#787b86]">
            <span>Invested Capital:</span>
            <strong className="text-white">
              {isPrivacy ? '••••••••' : `${d.invested.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £`}
            </strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col justify-start select-none bg-transparent space-y-3">
      {/* 1. Header with Legends and Performance Metric Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        {/* Left: Dynamic Legends */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {chartStyle !== 'bars' && (
            <span className="flex items-center gap-1.5 text-white font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]" />
              <span>Market Value</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
            <span>Realized P/L</span>
          </span>
          {chartStyle === 'bars' && (
            <span className="flex items-center gap-1.5 text-white font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00bcd4]" />
              <span>Unrealized P/L</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-white font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff9800]" />
            <span>Cumulative ROI</span>
          </span>
        </div>

        {/* Right: Key Metric Pills */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-1 rounded-full bg-[#ff9800]/15 text-[#ff9800] border border-[#ff9800]/30 font-semibold tabular-nums">
            ROI: {summary.latestRoi >= 0 ? '+' : ''}{summary.latestRoi.toFixed(1)}%
          </span>
          <span
            className={`px-2.5 py-1 rounded-full border font-medium tabular-nums ${
              summary.totalRealized >= 0
                ? 'bg-[#089981]/15 text-[#089981] border-[#089981]/30'
                : 'bg-[#f23645]/15 text-[#f23645] border-[#f23645]/30'
            }`}
          >
            Realized: {isPrivacy ? '••••••' : `${summary.totalRealized >= 0 ? '+' : ''}${formatPriceValue(summary.totalRealized)} £`}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full border font-medium tabular-nums ${
              summary.latestUnrealized >= 0
                ? 'bg-[#00bcd4]/15 text-[#00bcd4] border-[#00bcd4]/30'
                : 'bg-[#f23645]/15 text-[#f23645] border-[#f23645]/30'
            }`}
          >
            Unrealized: {isPrivacy ? '••••••' : `${summary.latestUnrealized >= 0 ? '+' : ''}${formatPriceValue(summary.latestUnrealized)} £`}
          </span>
        </div>
      </div>

      {/* 2. TradingView Chart Canvas */}
      <div className="w-full h-[340px] relative">
        {filteredData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-[#787b86]">
            Historical performance progression is not available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 12, right: 4, left: 6, bottom: 0 }}
              barCategoryGap="22%"
              barGap={4}
            >
              <defs>
                <linearGradient id="tvMarketValGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2962ff" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#2962ff" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tvRealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#089981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
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
                padding={chartStyle === 'bars' ? { left: 16, right: 16 } : { left: 0, right: 0 }}
                dy={6}
              />

              {/* Y-Axis on LEFT: Cumulative ROI % */}
              <YAxis
                yAxisId="roi"
                orientation="left"
                width={36}
                stroke="#ff9800"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(0)}%`}
                dx={-8}
                domain={['auto', 'auto']}
              />

              {/* Y-Axis on RIGHT: Currency Scale (TradingView Price Scale) */}
              <YAxis
                yAxisId="currency"
                orientation="right"
                width={50}
                stroke="#787b86"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  if (isPrivacy) return '•••';
                  if (latestValue && Math.abs(v - latestValue) <= priceRange * 0.09) {
                    return '';
                  }
                  return formatPriceValue(v);
                }}
                dx={8}
                domain={['auto', 'auto']}
              />

              {/* Right-Axis Current Value Tag (TradingView Solid Badge) */}
              {latestPoint && latestValue !== 0 && (
                <ReferenceLine
                  yAxisId="currency"
                  y={latestValue}
                  stroke={chartStyle === 'bars' ? (latestValue >= 0 ? '#089981' : '#f23645') : '#2962ff'}
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  label={({ viewBox }: any) => {
                    if (!viewBox) return null;
                    const { x, y, width } = viewBox;
                    const posX = x + width + 2;
                    const badgeColor = chartStyle === 'bars' ? (latestValue >= 0 ? '#089981' : '#f23645') : '#2962ff';
                    return (
                      <g transform={`translate(${posX}, ${y - 10})`}>
                        <rect width="46" height="20" rx="4" fill={badgeColor} />
                        <text
                          x="23"
                          y="14"
                          fill="#ffffff"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {isPrivacy ? '••••' : formatPriceValue(latestValue)}
                        </text>
                      </g>
                    );
                  }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* Render Series based on Selected Chart Style */}
              {chartStyle === 'area' && (
                <>
                  <Area
                    yAxisId="currency"
                    type="monotone"
                    dataKey="marketValue"
                    name="Market Value"
                    stroke="#2962ff"
                    strokeWidth={2}
                    fill="url(#tvMarketValGrad)"
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="currency"
                    type="monotone"
                    dataKey="cumulativeRealizedPl"
                    name="Realized P/L"
                    stroke="#089981"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}

              {chartStyle === 'bars' && (
                <>
                  <Bar
                    yAxisId="currency"
                    dataKey="pl"
                    name="Realized P/L"
                    fill="#089981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  >
                    {filteredData.map((entry, index) => (
                      <Cell
                        key={`cell-realized-${index}`}
                        fill={entry.pl >= 0 ? '#089981' : '#f23645'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="currency"
                    dataKey="unrealizedPl"
                    name="Unrealized P/L"
                    fill="#00bcd4"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  >
                    {filteredData.map((entry, index) => (
                      <Cell
                        key={`cell-unrealized-${index}`}
                        fill={(entry.unrealizedPl ?? 0) >= 0 ? '#00bcd4' : '#f23645'}
                      />
                    ))}
                  </Bar>
                </>
              )}

              {chartStyle === 'line' && (
                <>
                  <Line
                    yAxisId="currency"
                    type="monotone"
                    dataKey="marketValue"
                    name="Market Value"
                    stroke="#2962ff"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="currency"
                    type="monotone"
                    dataKey="cumulativeRealizedPl"
                    name="Realized P/L"
                    stroke="#089981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}

              {/* Cumulative ROI Line (Always available across modes) */}
              <Line
                yAxisId="roi"
                type="monotone"
                dataKey="roi"
                name="Cumulative ROI"
                stroke="#ff9800"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ff9800', stroke: '#27272a', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: '#ff9800' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. TradingView Controls Row (Bottom Bar) */}
      <div className="flex items-center justify-between pt-2 border-t border-[#27272a] mt-1">
        {/* Timeframe Selectors (1M, 3M, 6M, 1Y, All) */}
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

        {/* Right Controls: Area vs Bars vs Line Switcher */}
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

            {/* Bars Icon */}
            <button
              type="button"
              onClick={() => setChartStyle('bars')}
              className={`p-1.5 rounded-md transition-all ${
                chartStyle === 'bars'
                  ? 'bg-[#3f3f46] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
              title="Bars style"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none">
                <path fill="currentColor" d="M7 21h2V11H7v10zm6 0h2V6h-2v15zm6 0h2V14h-2v7z" />
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

          <span className="text-[11px] text-[#787b86] hidden sm:inline-block ml-1">
            Monthly mark-to-market
          </span>
        </div>
      </div>
    </div>
  );
}

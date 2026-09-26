'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type MonthlyDataItem } from '../homeInvestmentsTypes';
import PerformanceChartTooltip from './PerformanceChartTooltip';
import PerformanceChartToolbar, { type Timeframe } from './PerformanceChartToolbar';

interface PerformanceChartProps {
  data: MonthlyDataItem[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
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
    ? latestPoint.marketValue && latestPoint.marketValue > 0
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

  const CHART_COLORS = {
    marketValue: 'var(--color-brand-blue)',
    realizedPl: 'var(--color-profit-chart)',
    roi: 'var(--color-accent-orange)',
    grid: 'var(--border-subtle)',
    axisText: 'var(--text-muted)',
    badgeFill: 'var(--color-brand-blue)',
    badgeText: 'var(--text-primary)',
  };

  return (
    <div className="w-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5">
      {/* 1. Header with Legends on Left, Square Timeframe Controls on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        {/* Left: Dynamic Legends */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="text-[13px] font-semibold text-text-primary tracking-tight mr-0.5">
            Portfolio Progression
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-brand-blue" />
            <span>Market Value</span>
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-profit-chart" />
            <span>Realized P/L</span>
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent-orange" />
            <span>ROI</span>
          </span>
        </div>

        {/* Right: Square Timeframe Switcher */}
        <PerformanceChartToolbar
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>

      {/* 2. Compact TradingView Chart Canvas */}
      <div className="w-full h-[210px] relative">
        {filteredData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
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
                  <stop offset="0%" stopColor={CHART_COLORS.marketValue} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={CHART_COLORS.marketValue} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tvRealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.realizedPl} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS.realizedPl} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke={CHART_COLORS.grid}
                strokeDasharray="2 2"
                vertical={false}
                strokeOpacity={0.7}
              />

              <XAxis
                dataKey="month"
                stroke={CHART_COLORS.axisText}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={6}
              />

              <YAxis
                yAxisId="roi"
                orientation="left"
                width={36}
                stroke={CHART_COLORS.axisText}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(0)}%`}
                dx={-8}
                domain={['auto', 'auto']}
              />

              <YAxis
                yAxisId="currency"
                orientation="right"
                width={50}
                stroke={CHART_COLORS.axisText}
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

              {latestPoint && latestValue !== 0 && (
                <ReferenceLine
                  yAxisId="currency"
                  y={latestValue}
                  stroke={CHART_COLORS.marketValue}
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  label={({ viewBox }: any) => {
                    if (!viewBox) return null;
                    const { x, y, width } = viewBox;
                    const posX = x + width + 2;
                    return (
                      <g transform={`translate(${posX}, ${y - 10})`}>
                        <rect width="46" height="20" rx="4" fill={CHART_COLORS.badgeFill} />
                        <text
                          x="23"
                          y="14"
                          fill={CHART_COLORS.badgeText}
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

              <Tooltip content={<PerformanceChartTooltip />} />

              <Area
                yAxisId="currency"
                type="monotone"
                dataKey="marketValue"
                name="Market Value"
                stroke={CHART_COLORS.marketValue}
                strokeWidth={2}
                fill="url(#tvMarketValGrad)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="currency"
                type="monotone"
                dataKey="cumulativeRealizedPl"
                name="Realized P/L"
                stroke={CHART_COLORS.realizedPl}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
              />

              <Line
                yAxisId="roi"
                type="monotone"
                dataKey="roi"
                name="Cumulative ROI"
                stroke={CHART_COLORS.roi}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.roi, stroke: CHART_COLORS.grid, strokeWidth: 1 }}
                activeDot={{ r: 5, fill: CHART_COLORS.roi }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

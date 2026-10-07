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
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export interface ProgressionPoint {
  label: string;
  newSignups: number;
  cumulativeSignups: number;
  mrr: number;
  arr: number;
  date?: string;
}

interface CommercialProgressionChartProps {
  monthlyData: ProgressionPoint[];
  daily30dData: ProgressionPoint[];
}

type MetricMode = 'revenue' | 'signups';
type Timeframe = '30D' | '90D' | '1Y' | 'All';
type ChartStyle = 'area' | 'bars' | 'line';

export default function CommercialProgressionChart({
  monthlyData,
  daily30dData,
}: CommercialProgressionChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('revenue');
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('area');
  const { isPrivacy } = usePrivacyMode();

  // Pick dataset based on timeframe
  const activeData = useMemo(() => {
    if (timeframe === '30D') {
      return daily30dData;
    }
    if (timeframe === '90D') {
      // If we have enough monthly data take last 3 months, or take daily
      return monthlyData.slice(-3);
    }
    if (timeframe === '1Y') {
      return monthlyData.slice(-12);
    }
    return monthlyData;
  }, [timeframe, monthlyData, daily30dData]);

  const latestPoint = activeData.length > 0 ? activeData[activeData.length - 1] : null;

  const latestValue = useMemo(() => {
    if (!latestPoint) return 0;
    if (metricMode === 'revenue') {
      return latestPoint.mrr;
    }
    return latestPoint.cumulativeSignups;
  }, [latestPoint, metricMode]);

  const primaryColor = metricMode === 'revenue' ? '#089981' : '#2962ff';

  return (
    <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {metricMode === 'revenue' ? 'Monthly Recurring Revenue Trajectory' : 'User Base & Signups Growth'}
            </h3>
            <span
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                metricMode === 'revenue'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {metricMode === 'revenue' ? 'EGP / Month' : 'Total Accounts'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {metricMode === 'revenue'
              ? 'Realized monthly subscription velocity and annualized run-rate'
              : 'Cumulative customer acquisition trajectory and cohort signups'}
          </p>
        </div>

        {/* Metric Selector Pill */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('revenue')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === 'revenue'
                ? 'bg-white/15 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Revenue (MRR)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('signups')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === 'signups'
                ? 'bg-white/15 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Signups (Users)
          </button>
        </div>
      </div>

      {/* 2. Chart Canvas */}
      <div className="w-full h-[280px] sm:h-[320px] relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={activeData}
            margin={{ top: 12, right: 64, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tvRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2 2"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#787b86"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={6}
            />

            <YAxis
              orientation="right"
              stroke="#787b86"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                if (isPrivacy) return '•••';
                if (metricMode === 'revenue') {
                  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
                }
                return `${v}`;
              }}
              dx={8}
              domain={['auto', 'auto']}
            />

            {/* Current-value badge on right axis */}
            {latestPoint && (
              <ReferenceLine
                y={latestValue}
                stroke={primaryColor}
                strokeDasharray="2 2"
                strokeOpacity={0.6}
                label={({ viewBox }: any) => {
                  if (!viewBox) return null;
                  const { x, y, width } = viewBox;
                  const posX = x + width + 4;
                  return (
                    <g transform={`translate(${posX}, ${y - 11})`}>
                      <rect width="56" height="22" rx="4" fill={primaryColor} />
                      <text
                        x="28"
                        y="15"
                        fill="#ffffff"
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {isPrivacy
                          ? '••••'
                          : metricMode === 'revenue'
                          ? `${latestValue}`
                          : `${latestValue}`}
                      </text>
                    </g>
                  );
                }}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ProgressionPoint;
                return (
                  <div className="p-3 rounded-xl bg-[#3D3D3D] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl min-w-[150px]">
                    <div className="font-semibold text-white mb-1 border-b border-white/10 pb-1">
                      {d.label}
                    </div>
                    {metricMode === 'revenue' ? (
                      <>
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>MRR:</span>
                          <strong className="text-white">
                            {isPrivacy ? '••••' : `EGP ${d.mrr.toLocaleString()}`}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-4 text-zinc-300 text-[11px]">
                          <span>ARR Run:</span>
                          <span className="text-zinc-200">
                            {isPrivacy ? '••••' : `EGP ${d.arr.toLocaleString()}`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between gap-4 text-blue-400">
                          <span>Total Users:</span>
                          <strong className="text-white">
                            {isPrivacy ? '••••' : d.cumulativeSignups}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-4 text-zinc-300 text-[11px]">
                          <span>New in period:</span>
                          <span className="text-zinc-200">
                            +{d.newSignups}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              }}
            />

            {/* Dynamic chart styles */}
            {chartStyle === 'area' && (
              <Area
                type="monotone"
                dataKey={metricMode === 'revenue' ? 'mrr' : 'cumulativeSignups'}
                stroke={primaryColor}
                strokeWidth={2}
                fill="url(#tvRevGrad)"
                isAnimationActive={false}
              />
            )}

            {chartStyle === 'bars' && (
              <Bar
                dataKey={metricMode === 'revenue' ? 'mrr' : 'cumulativeSignups'}
                fill={primaryColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            )}

            {chartStyle === 'line' && (
              <Line
                type="monotone"
                dataKey={metricMode === 'revenue' ? 'mrr' : 'cumulativeSignups'}
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: primaryColor, stroke: '#000000', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: primaryColor }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-white/10">
        {/* Timeframe switchers */}
        <div className="flex items-center gap-1">
          {(['30D', '90D', '1Y', 'All'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                timeframe === tf
                  ? 'bg-white/15 text-white font-bold shadow-xs border border-white/10'
                  : 'text-zinc-400 hover:text-white font-medium'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart style switchers */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15">
          {(['area', 'bars', 'line'] as ChartStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setChartStyle(st)}
              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md capitalize transition-colors ${
                chartStyle === st
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

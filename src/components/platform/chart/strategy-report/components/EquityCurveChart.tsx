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
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import type { EquityPoint } from '@/strategies/registry';

interface EquityCurveChartProps {
  equityCurve: EquityPoint[];
  initialCapital: number;
  currencySymbol: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatXAxisDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const parts = clean.split(/[-/ ]/);
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTH_NAMES[monthIdx]}-${year}`;
    }
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const m = MONTH_NAMES[parsed.getMonth()];
    const y = parsed.getFullYear();
    return `${m}-${y}`;
  }
  return dateStr;
}

function formatTooltipDate(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  const parts = clean.split(/[-/ ]/);
  if (parts.length >= 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
      return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
    }
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateStr;
}

export default function EquityCurveChart({
  equityCurve,
  initialCapital,
  currencySymbol,
}: EquityCurveChartProps) {
  const [showCumulativePnl, setShowCumulativePnl] = useState(true);
  const [showBuyHold, setShowBuyHold] = useState(true);

  // Transform data to percentage returns from initial capital
  const chartData = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return [];
    const cap = initialCapital > 0 ? initialCapital : 1000;

    return equityCurve.map((point) => {
      const equityPct = ((point.equity - cap) / cap) * 100;
      const buyHoldPct = ((point.buyHoldEquity - cap) / cap) * 100;

      return {
        ...point,
        equityPct,
        buyHoldPct,
      };
    });
  }, [equityCurve, initialCapital]);

  const latestPoint = useMemo(
    () => (chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null),
    [chartData]
  );
  const latestPct = latestPoint ? latestPoint.equityPct : 0;

  const pctRange = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    const values = chartData.flatMap((d) => [d.equityPct, d.buyHoldPct]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Math.max(1, max - min);
  }, [chartData]);

  return (
    <section id="section-strategy-equity-curve" className="space-y-3.5 pt-6 border-t border-border-subtle">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
            Cumulative Growth Curve
          </h3>
          <p className="text-xs text-white/50 leading-relaxed">
            Cumulative strategy performance compared against Buy &amp; Hold benchmark starting at{' '}
            {initialCapital.toLocaleString()} {currencySymbol}
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex items-center gap-4 text-xs select-none shrink-0">
          <button
            type="button"
            onClick={() => setShowCumulativePnl(!showCumulativePnl)}
            className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${
              showCumulativePnl ? 'text-white font-medium' : 'text-white/40 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-profit-num" />
            <span>Cumulative ROI</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBuyHold(!showBuyHold)}
            className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${
              showBuyHold ? 'text-white font-medium' : 'text-white/40 opacity-60'
}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]" />
            <span>Buy &amp; Hold</span>
          </button>
        </div>
      </div>

      {/* Seamless Chart Canvas (No Box Borders, Clean Left & Right Breathing Margins) */}
      <div className="w-full h-[260px] sm:h-[300px] relative select-none">
        {chartData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            Not enough historical backtest points in period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 14, right: 10, left: 10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="modularTvEquityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--palette-positive)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--palette-positive)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="var(--border-subtle)"
                strokeDasharray="2 2"
                vertical={false}
                strokeOpacity={0.7}
              />

              {/* 0% Baseline */}
              <ReferenceLine
                y={0}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
                minTickGap={50}
                tickFormatter={formatXAxisDate}
              />

              <YAxis
                orientation="right"
                width={56}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => {
                  if (latestPct !== null && Math.abs(v - latestPct) <= pctRange * 0.08) {
                    return '';
                  }
                  return `${v >= 0 ? '+' : ''}${Math.round(v)}%`;
                }}
                dx={6}
                domain={['auto', 'auto']}
              />

              {latestPoint && latestPct !== 0 && (
                <ReferenceLine
                  y={latestPct}
                  stroke="var(--palette-positive)"
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                  label={({ viewBox }: any) => {
                    if (!viewBox) return null;
                    const { x, y, width } = viewBox;
                    const posX = x + width + 4;
                    const text = `${latestPct >= 0 ? '+' : ''}${latestPct.toFixed(1)}%`;
                    return (
                      <g transform={`translate(${posX}, ${y - 10})`}>
                        <rect width="54" height="20" rx="3" fill="var(--palette-positive)" />
                        <text
                          x="27"
                          y="14"
                          fill="#ffffff"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  }}
                />
              )}

              <RechartsTooltip
                content={<StrategyChartTooltip currencySymbol={currencySymbol} />}
                cursor={{ stroke: 'rgba(255, 255, 255, 0.18)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              {showCumulativePnl && (
                <Area
                  type="monotone"
                  dataKey="equityPct"
                  name="Strategy ROI"
                  stroke="var(--palette-positive)"
                  strokeWidth={2}
                  fill="url(#modularTvEquityGrad)"
                  isAnimationActive={false}
                />
              )}

              {showBuyHold && (
                <Line
                  type="monotone"
                  dataKey="buyHoldPct"
                  name="Buy & Hold"
                  stroke="#2962ff"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function StrategyChartTooltip({
  active,
  payload,
  currencySymbol = 'EGP',
}: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload as EquityPoint & { equityPct: number; buyHoldPct: number };
    const dateFormatted = formatTooltipDate(d.date);

    return (
      <div className="p-3 rounded-xl bg-[#3D3D3D] shadow-2xl text-xs tabular-nums select-none font-sans min-w-[220px] space-y-2 border border-white/10">
        <div className="font-semibold text-white/90 text-xs border-b border-white/15 pb-1.5 flex items-center justify-between">
          <span>{dateFormatted}</span>
          <span className="text-[10px] text-white/50 font-normal uppercase tracking-wider">
            Report
          </span>
        </div>

        <div className="space-y-1.5">
          {/* Strategy Return */}
          <div className="flex justify-between items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-profit-num shrink-0" />
              <span>Strategy:</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-right">
              <span className="text-profit-num">
                {d.equityPct >= 0 ? '+' : ''}{d.equityPct.toFixed(2)}%
              </span>
              <span className="text-white/50 text-[11px] font-normal">
                ({d.equity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currencySymbol})
              </span>
            </div>
          </div>

          {/* Buy & Hold Return */}
          <div className="flex justify-between items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#2962ff] shrink-0" />
              <span>Buy &amp; Hold:</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-right">
              <span className="text-white">
                {d.buyHoldPct >= 0 ? '+' : ''}{d.buyHoldPct.toFixed(2)}%
              </span>
              <span className="text-white/50 text-[11px] font-normal">
                ({d.buyHoldEquity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currencySymbol})
              </span>
            </div>
          </div>

          {/* Drawdown */}
          {d.drawdown !== undefined && d.drawdown !== 0 && (
            <div className="flex justify-between items-center gap-4 text-xs pt-1 border-t border-white/10">
              <span className="text-zinc-400">Drawdown:</span>
              <span className="text-loss-num font-semibold">
                -{Math.abs(d.drawdown).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

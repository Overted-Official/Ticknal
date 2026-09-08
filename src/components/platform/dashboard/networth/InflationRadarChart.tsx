'use client';

import React from 'react';
import { Flame, Info, Globe } from '@/components/ui/icon-library';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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
}

export default function InflationRadarChart({
  points,
  cbeAnnualInflation = 14.9,
  usCpiAnnualInflation = 2.8,
  effectiveAnnualInflation,
  wEgpPct,
  wUsdPct,
  currencyMode,
}: InflationRadarChartProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const activeEffectiveRate = effectiveAnnualInflation !== undefined ? effectiveAnnualInflation : cbeAnnualInflation;

  return (
    <div className="card-widget select-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="widget-title">
            Historical Purchasing Power
          </h3>
          <p className="widget-subtitle mt-0.5">
            Recorded nominal net worth versus inflation-adjusted purchasing power using the same currency-weighted deflator as the wealth trajectory ({activeEffectiveRate}% effective annual rate).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2 py-2 rounded-xl bg-plt-warning/10 text-plt-warning border border-plt-warning/20 tabular-nums font-medium">
            Effective: {activeEffectiveRate}%
          </span>
          <span className="px-2 py-2 rounded-xl bg-plt-risk/10 text-plt-risk border border-plt-risk/20 tabular-nums text-caption">
            £ CBE: {cbeAnnualInflation}% {wEgpPct !== undefined && `(${wEgpPct}%)`}
          </span>
          <span className="px-2 py-2 rounded-xl bg-plt-profit/10 text-plt-profit border border-plt-profit/20 tabular-nums text-caption">
            USD CPI: {usCpiAnnualInflation}% {wUsdPct !== undefined && `(${wUsdPct}%)`}
          </span>
        </div>
      </div>

      {/* Area Chart: Nominal vs Real Purchasing Power */}
      <div className="h-[380px] w-full">
        {points.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-plt-muted font-sans">
            Historical purchasing-power data is not available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--plt-profit)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--plt-profit)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--plt-warning)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--plt-warning)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="month"
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--plt-text-faint)', fontSize: 'var(--text-size-mini)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={false}
            />
            <YAxis
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--plt-text-faint)', fontSize: 'var(--text-size-mini)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={false}
              tickFormatter={(v) => isPrivacy ? '***' : `${displaySymbol}${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as InflationPoint;
                return (
                  <div className="rounded-xl border border-plt-border bg-plt-base/90 p-4 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-48">
                    <div className="font-medium text-plt-text border-b border-plt-border pb-2 flex items-center justify-between">
                      <span>{data.fullDate || label}</span>
                      <span className="text-mini text-plt-muted tabular-nums">Real vs Nominal</span>
                    </div>
                    <div className="flex justify-between items-center text-plt-profit">
                      <span>Nominal Value:</span>
                      <span className="tabular-nums font-medium">
                        {isPrivacy ? '***' : `${displaySymbol}${data.nominal.toLocaleString('en-US', { maximumFractionDigits: 0 })}${displaySuffix}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-plt-warning">
                      <span>Real Purchasing Power:</span>
                      <span className="tabular-nums font-medium">
                        {isPrivacy ? '***' : `${displaySymbol}${data.realValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}${displaySuffix}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-plt-risk pt-2 border-t border-plt-border">
                      <span>Cumulative Drag:</span>
                      <span className="tabular-nums font-medium">
                        {isPrivacy ? '***' : `-${displaySymbol}${data.inflationDrag.toLocaleString('en-US', { maximumFractionDigits: 0 })}${displaySuffix}`}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 'var(--space-2)', fontSize: 'var(--text-size-caption)' }}
            />
            <Area
              type="monotone"
              dataKey="nominal"
              name="Nominal Wealth"
              stroke="var(--plt-profit)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#nominalGrad)"
            />
            <Area
              type="monotone"
              dataKey="realValue"
              name="Inflation-Adjusted Real Wealth"
              stroke="var(--plt-warning)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#realGrad)"
            />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

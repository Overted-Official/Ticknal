'use client';

import React from 'react';
import { Flame, Info, Globe } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type InflationPoint = {
  month: string;
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
  const displaySuffix = currencyMode === 'EGP' ? ' EGP' : '';

  const activeEffectiveRate = effectiveAnnualInflation !== undefined ? effectiveAnnualInflation : cbeAnnualInflation;

  return (
    <div className="glass-panel rounded-xl p-4 md:p-5 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Multi-Currency Inflation & Purchasing Power Radar
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Visualizing nominal wealth vs. real purchasing power using currency-weighted deflator ({activeEffectiveRate}% Effective YoY).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">
            Effective: {activeEffectiveRate}%
          </span>
          <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[11px]">
            EGP CBE: {cbeAnnualInflation}% {wEgpPct !== undefined && `(${wEgpPct}%)`}
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
            USD CPI: {usCpiAnnualInflation}% {wUsdPct !== undefined && `(${wUsdPct}%)`}
          </span>
        </div>
      </div>

      {/* Area Chart: Nominal vs Real Purchasing Power */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="month"
              stroke="#555"
              tick={{ fill: '#888', fontSize: 10 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <YAxis
              stroke="#555"
              tick={{ fill: '#888', fontSize: 10 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
              tickFormatter={(v) => isPrivacy ? '***' : `${displaySymbol}${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as InflationPoint;
                return (
                  <div className="rounded-lg border border-white/10 bg-black/90 p-3 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
                    <div className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
                      <span>{label}</span>
                      <span className="text-[10px] text-white/40 font-mono">Real vs Nominal</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Nominal Value:</span>
                      <span className="font-mono font-semibold">
                        {isPrivacy ? '***' : `${displaySymbol}${data.nominal.toLocaleString('en-US', { maximumFractionDigits: 0 })}${displaySuffix}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-amber-400">
                      <span>Real Purchasing Power:</span>
                      <span className="font-mono font-semibold">
                        {isPrivacy ? '***' : `${displaySymbol}${data.realValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}${displaySuffix}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-rose-400 pt-1 border-t border-white/10">
                      <span>Cumulative Drag:</span>
                      <span className="font-mono font-bold">
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
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Area
              type="monotone"
              dataKey="nominal"
              name="Nominal Wealth"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#nominalGrad)"
            />
            <Area
              type="monotone"
              dataKey="realValue"
              name="Inflation-Adjusted Real Wealth"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#realGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

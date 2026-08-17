'use client';

import React from 'react';
import { Flame, Info } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export type InflationPoint = {
  month: string;
  nominal: number;
  realValue: number;
  inflationDrag: number;
};

interface InflationRadarChartProps {
  points: InflationPoint[];
  cbeAnnualInflation: number;
  currencyMode: 'EGP' | 'USD';
}

export default function InflationRadarChart({
  points,
  cbeAnnualInflation,
  currencyMode,
}: InflationRadarChartProps) {
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' EGP' : '';

  return (
    <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            CBE Inflation & Purchasing Power Radar
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Visualizing nominal wealth vs. real inflation-adjusted purchasing power discounted by CBE headline rate ({cbeAnnualInflation}% Annually).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-bold">
            CBE Rate: {cbeAnnualInflation}%
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
              stroke="#666"
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: 8, fontSize: 12 }}
              formatter={(val: any, name: any) => [
                `${displaySymbol}${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}${displaySuffix}`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            <Area
              type="monotone"
              dataKey="nominal"
              name="Nominal Net Worth"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#nominalGrad)"
            />
            <Area
              type="monotone"
              dataKey="realValue"
              name="Real Purchasing Power"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#realGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-white/60 space-y-1.5">
        <div className="flex items-center gap-1.5 text-white font-semibold">
          <Info size={14} className="text-plt-orange" />
          How to interpret your purchasing power curve:
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed">
          The dashed orange line reveals the <strong>real purchasing power</strong> of your total balance. 
          Because inflation reduces the value of idle cash over time, having your wealth diversified into high-conviction EGX equities, mutual funds like Osoul, and USD reserves acts as an essential shield to keep your real purchasing power growing.
        </p>
      </div>
    </div>
  );
}

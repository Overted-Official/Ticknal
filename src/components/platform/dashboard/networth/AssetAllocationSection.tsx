'use client';

import React from 'react';
import { Layers, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

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
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' EGP' : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left 2 Cols: Asset Allocation Grid */}
      <div className="lg:col-span-2 glass-panel rounded-xl p-4 md:p-5 space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Asset Allocation & Wealth Composition
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Diversification across EGX stocks, money market mutual funds, USD cash reserves, and local bank balances.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
          {slices.map((slice) => (
            <div key={slice.name} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-xs font-bold text-white">{slice.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">{slice.percentage.toFixed(1)}%</span>
              </div>

              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ backgroundColor: slice.color, width: `${Math.min(100, Math.max(0, slice.percentage))}%` }}
                />
              </div>

              <div className="flex items-baseline justify-between text-[11px] font-mono pt-1">
                <span className="text-white/40">Value</span>
                <span className="text-white/90 font-medium">
                  {displaySymbol}
                  {slice.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {displaySuffix}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
          <span>Forex Valuation: 1 USD = {usdRate.toFixed(2)} EGP</span>
          <span className="text-emerald-400/80 font-medium">100% Mark-to-Market Live</span>
        </div>
      </div>

      {/* Right 1 Col: Donut Chart */}
      <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <PieChartIcon size={16} className="text-emerald-400" />
            Portfolio Split
          </h3>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
              >
                {slices.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: 8, fontSize: 12 }}
                formatter={(val: any) => [`${displaySymbol}${Number(val).toLocaleString()} ${displaySuffix}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1 text-[11px] pt-2 border-t border-white/[0.06]">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-white/60 truncate max-w-[130px]">{s.name}</span>
              </div>
              <span className="font-mono text-white/80 font-semibold">{s.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

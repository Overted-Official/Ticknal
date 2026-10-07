'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface TierDistributionItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  monthlyPrice?: number;
  mrrContribution?: number;
  color: string;
}

interface SubscriptionDonutChartProps {
  distribution: TierDistributionItem[];
  totalUsers: number;
}

export default function SubscriptionDonutChart({
  distribution,
  totalUsers,
}: SubscriptionDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeSlice = hoveredIndex !== null ? distribution[hoveredIndex] : null;

  return (
    <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Subscription Tier Allocation & Commercial Mix
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Breakdown of registered members across free and monetized membership tiers
          </p>
        </div>
        <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
          {totalUsers.toLocaleString()} Total Accounts
        </span>
      </div>

      {/* Grid: 5 cols donut + 7 cols table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Donut (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={distribution.length > 1 ? 2 : 0}
                  isAnimationActive={false}
                  onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {distribution.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                      strokeWidth={hoveredIndex === index ? 2 : 0}
                      className="cursor-pointer transition-all duration-150"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center hole label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-bold text-white tracking-tight leading-none tabular-nums">
                {activeSlice ? activeSlice.count.toLocaleString() : totalUsers.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium mt-1">
                {activeSlice ? activeSlice.name : 'Total Members'}
              </span>
            </div>
          </div>

          <div className="text-center py-0.5 min-h-[22px]">
            {activeSlice ? (
              <span className="text-xs font-semibold text-zinc-300 tracking-wide tabular-nums">
                {activeSlice.name} — {activeSlice.percentage.toFixed(1)}% of members
                {activeSlice.mrrContribution ? ` · EGP ${activeSlice.mrrContribution.toLocaleString()}/mo` : ''}
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                Hover over a slice or table row to inspect
              </span>
            )}
          </div>
        </div>

        {/* Right: Table (7 cols) */}
        <div className="lg:col-span-7 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
                <th className="pb-2 text-left font-medium">Tier Name</th>
                <th className="pb-2 text-right font-medium">Seats</th>
                <th className="pb-2 text-right font-medium">Share</th>
                <th className="pb-2 text-right font-medium">Price/mo</th>
                <th className="pb-2 text-right font-medium">MRR Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {distribution.map((item, idx) => (
                <tr
                  key={item.id}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                    hoveredIndex === idx ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  {/* Name with color swatch */}
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                    {item.count.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300 font-medium">
                    {item.percentage.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400 font-medium">
                    {item.monthlyPrice ? `EGP ${item.monthlyPrice}` : 'Free'}
                  </td>
                  <td className="py-2.5 pl-3 text-right tabular-nums text-emerald-400 font-semibold">
                    {item.mrrContribution ? `EGP ${item.mrrContribution.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

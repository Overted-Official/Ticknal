'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Calendar } from '@/components/ui/icon-library';

export interface UserCohortItem {
  month: string;
  signups: number;
  paidSeats: number;
  conversionRate: number;
}

export interface UserTierItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface UserCohortsPanelProps {
  cohorts: UserCohortItem[];
  tierDistribution: UserTierItem[];
  totalUsers: number;
}

export default function UserCohortsPanel({
  cohorts,
  tierDistribution,
  totalUsers,
}: UserCohortsPanelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeSlice = hoveredIndex !== null ? tierDistribution[hoveredIndex] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 1. Left (5 cols): Plan Tier & Commitment Mix */}
      <div className="lg:col-span-5 border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Customer Tier Distribution
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Breakdown of registered members across free and monetized membership tiers
          </p>
        </div>

        {/* Donut Chart */}
        <div className="relative w-full h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={tierDistribution}
                dataKey="count"
                nameKey="name"
                innerRadius={50}
                outerRadius={74}
                paddingAngle={tierDistribution.length > 1 ? 2 : 0}
                isAnimationActive={false}
                onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {tierDistribution.map((entry, index) => (
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

          {/* Center Hole Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-bold text-white tracking-tight leading-none tabular-nums">
              {activeSlice ? activeSlice.count : totalUsers}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium mt-1">
              {activeSlice ? activeSlice.name : 'Total Accounts'}
            </span>
          </div>
        </div>

        {/* Active Slice Label */}
        <div className="text-center min-h-[20px]">
          {activeSlice ? (
            <span className="text-xs font-semibold text-zinc-300 tracking-wide tabular-nums">
              {activeSlice.name} — {activeSlice.percentage.toFixed(1)}% of total
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500">
              Hover over a slice to inspect tier share
            </span>
          )}
        </div>

        {/* Compact Table */}
        <div className="overflow-x-auto custom-scrollbar pt-1">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
                <th className="pb-1.5 text-left font-medium">Tier</th>
                <th className="pb-1.5 text-right font-medium">Members</th>
                <th className="pb-1.5 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {tierDistribution.map((item, idx) => (
                <tr
                  key={item.id}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                    hoveredIndex === idx ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <td className="py-2 pr-2">
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
                  <td className="py-2 px-2 text-right tabular-nums text-white font-semibold">
                    {item.count}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums text-zinc-300 font-medium">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Right (7 cols): Onboarding Cohorts Table */}
      <div className="lg:col-span-7 border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Monthly Registration Cohorts
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Customer acquisition cohorts and paid subscriber conversion rates over time
            </p>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
            {cohorts.length} Cohorts Recorded
          </span>
        </div>

        {/* Cohort Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
                <th className="pb-2 text-left font-medium">Cohort Month</th>
                <th className="pb-2 text-right font-medium">New Profiles</th>
                <th className="pb-2 text-right font-medium">Paying Seats</th>
                <th className="pb-2 text-right font-medium">Paid Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {cohorts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-zinc-500">
                    No monthly cohorts recorded yet.
                  </td>
                </tr>
              ) : (
                cohorts.map((c) => (
                  <tr
                    key={c.month}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-white font-medium">{c.month}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-white font-semibold">
                      +{c.signups}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-emerald-400 font-semibold">
                      {c.paidSeats}
                    </td>
                    <td className="py-3 pl-3 text-right tabular-nums">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {c.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-white/10 text-[11px] text-zinc-400 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Consistent cohort conversion indicates high product intent upon signup and zero friction onboarding.
          </span>
        </div>
      </div>
    </div>
  );
}

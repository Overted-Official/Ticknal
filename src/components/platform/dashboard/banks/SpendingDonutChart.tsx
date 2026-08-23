'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

const PIE_COLORS = [
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#14b8a6',
];

export type CategorySplit = {
  name: string;
  value: number;
  percentage: number;
};

interface SpendingDonutChartProps {
  splits: CategorySplit[];
}

export default function SpendingDonutChart({ splits }: SpendingDonutChartProps) {
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="card-widget select-none h-full flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="widget-title">
          Spending Category Splits
        </h3>
        <p className="widget-subtitle mt-0.5">
          Breakdown of outflows by category
        </p>
      </div>

      {splits.length === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-xs text-plt-muted font-sans">
          No expense entries logged.
        </div>
      ) : (
        <div className="h-[320px] flex flex-col justify-between">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={splits}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {splits.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--plt-bg-surface-elevated)',
                    borderColor: 'var(--plt-border)',
                    borderRadius: 'var(--radius-surface)',
                    fontSize: 'var(--text-12)',
                    fontFamily: 'var(--font-sans-token)',
                  }}
                  formatter={(val: any) => [isPrivacy ? '****** £' : `${Number(val).toLocaleString()} £`, 'Spent']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend list */}
          <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar pt-2 border-t border-plt-border-soft">
            {splits.slice(0, 5).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-plt-hover/50 text-[11px] font-sans transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-plt-muted truncate">{cat.name}</span>
                </div>
                <div className="tabular-nums text-plt-text shrink-0 font-semibold">
                  {cat.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

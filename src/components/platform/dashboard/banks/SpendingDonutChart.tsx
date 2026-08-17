'use client';

import React from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const PIE_COLORS = [
  '#22c55e', // green
  '#38bdf8', // sky
  '#ff640d', // orange
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#64748b', // slate
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
  return (
    <div className="glass-panel rounded-xl p-4 md:p-5 space-y-2 flex flex-col">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Spending Category Splits
        </h3>
        <p className="text-[11px] text-white/40 mt-0.5">
          Breakdown of outflows by category.
        </p>
      </div>

      {splits.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-white/40">
          No expense entries logged.
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={splits}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {splits.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: 8, fontSize: 12 }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} EGP`, 'Spent']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend list */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pt-2 border-t border-white/[0.06]">
            {splits.slice(0, 5).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-white/70 truncate">{cat.name}</span>
                </div>
                <div className="font-mono text-white/90 shrink-0 font-medium">
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

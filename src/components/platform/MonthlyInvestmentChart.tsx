'use client';

import { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export type MonthlyDataItem = {
  month: string;
  invested: number;
  pl: number;
  unrealizedPl?: number;
  roi: number;
};

const TIME_FILTERS = ['All', 'Y', 'Q', 'M'] as const;
export type TimeFilter = typeof TIME_FILTERS[number];

const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatEGP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0a]/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md min-w-[170px]">
      <div className="font-medium text-white mb-1.5 pb-1 border-b border-white/5">{label}</div>
      {payload.map((entry, index) => {
        const value = entry.value as number;
        const isRoi = entry.name === 'Cumulative ROI';
        const isRealized = entry.name === 'Realized P/L';
        const isUnrealized = entry.name === 'Unrealized P/L';
        
        let color = entry.color;
        if (isRoi) {
          color = value >= 0 ? '#f59e0b' : '#ef4444';
        } else if (isRealized) {
          color = value >= 0 ? '#22c55e' : '#ef4444';
        } else if (isUnrealized) {
          color = value >= 0 ? '#3b82f6' : '#ef4444';
        }
        
        const formatted = isRoi 
          ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` 
          : `${value >= 0 && (isRealized || isUnrealized) ? '+' : ''}${value.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP`;
          
        return (
          <div key={index} style={{ color }} className="mt-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="opacity-90">{entry.name}:</span>
            <span className="font-mono font-medium">{formatted}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyInvestmentChart({ data }: { data: MonthlyDataItem[] }) {
  const [filter, setFilter] = useState<TimeFilter>('All');

  const filteredData = useMemo(() => {
    if (filter === 'All' || !data.length) return data;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-11
    const currentQuarter = Math.floor(currentMonthIdx / 3);

    return data.filter((item) => {
      const [mStr, yStrWithApos] = item.month.split(" '");
      const mIdx = MONTH_ORDER.indexOf(mStr);
      const yNum = Number(yStrWithApos);
      const fullYear = 2000 + (isNaN(yNum) ? 0 : yNum);

      if (filter === 'Y') {
        return fullYear === currentYear;
      }
      if (filter === 'Q') {
        return fullYear === currentYear && Math.floor(mIdx / 3) === currentQuarter;
      }
      if (filter === 'M') {
        return fullYear === currentYear && mIdx === currentMonthIdx;
      }
      return true;
    });
  }, [data, filter]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-white tracking-[-0.02em]">Monthly Investment</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/[0.04] rounded-md p-0.5 border border-white/[0.08]">
            {TIME_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-sm transition-all ${
                  filter === f 
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm' 
                    : 'text-white/40 hover:text-white/80'
                }`}
                title={
                  f === 'All' ? 'All History' :
                  f === 'Y' ? 'This Year' :
                  f === 'Q' ? 'This Quarter' :
                  'This Month'
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 240 }} className="relative">
        {!filteredData.length ? (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            No data for this {filter === 'Y' ? 'year' : filter === 'Q' ? 'quarter' : filter === 'M' ? 'month' : 'period'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="15%">
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#8b929f', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#8b929f', fontSize: 10 }}
                tickFormatter={formatEGP}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#8b929f', fontSize: 10 }}
                tickFormatter={(val) => `${val}%`}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} iconType="circle" />
              <Bar yAxisId="left" dataKey="invested" name="Invested" fill="#00d2ff" radius={[2, 2, 0, 0]} maxBarSize={24} />
              <Bar yAxisId="left" dataKey="pl" name="Realized P/L" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={24}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-realized-${index}`} fill={entry.pl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
              <Bar yAxisId="left" dataKey="unrealizedPl" name="Unrealized P/L" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={24}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-unrealized-${index}`} fill={(entry.unrealizedPl ?? 0) >= 0 ? '#3b82f6' : '#ef4444'} />
                ))}
              </Bar>
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="roi" 
                name="Cumulative ROI"
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

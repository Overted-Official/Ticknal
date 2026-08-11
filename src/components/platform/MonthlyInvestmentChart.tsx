'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export type MonthlyDataItem = {
  month: string; // e.g. "Jan '25"
  invested: number;
  orders: number;
};

function formatEGP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1e2d3d] bg-[#121C26] px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-white">{label}</div>
      <div className="mt-1 text-[#00FFA7]">{payload[0].value.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP</div>
    </div>
  );
}

export default function MonthlyInvestmentChart({ data }: { data: MonthlyDataItem[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[#8899aa]">
        No data to display
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.invested));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#1e2d3d" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#8899aa', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8899aa', fontSize: 10 }}
          tickFormatter={formatEGP}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="invested" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.invested === maxValue ? '#00FFA7' : '#3B82F6'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

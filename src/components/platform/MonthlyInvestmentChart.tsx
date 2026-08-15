'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

export type MonthlyDataItem = {
  month: string;
  invested: number;
  pl: number;
  roi: number;
};

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
    <div className="rounded-lg border border-plt-border bg-plt-card px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="font-medium text-plt-text mb-1">{label}</div>
      {payload.map((entry, index) => {
        const value = entry.value as number;
        const isRoi = entry.name === 'ROI';
        const color = isRoi 
          ? (value >= 0 ? '#00e676' : '#ea3943')
          : entry.color;
        const formatted = isRoi 
          ? `${value.toFixed(2)}%` 
          : `${value.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP`;
          
        return (
          <div key={index} style={{ color }} className="mt-0.5">
            {entry.name}: {formatted}
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyInvestmentChart({ data }: { data: MonthlyDataItem[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-plt-muted">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
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
        <Bar yAxisId="left" dataKey="invested" name="Invested" fill="#00d2ff" radius={[2, 2, 0, 0]} maxBarSize={32} />
        <Bar yAxisId="left" dataKey="pl" name="P/L" fill="#00e676" radius={[2, 2, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pl >= 0 ? '#00e676' : '#ea3943'} />
          ))}
        </Bar>
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="roi" 
          name="ROI"
          stroke="#f59e0b" 
          strokeWidth={2}
          dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

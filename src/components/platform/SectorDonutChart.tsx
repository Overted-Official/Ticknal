'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export type SectorDataItem = {
  sector: string;
  value: number;
  percentage: number;
};

const SECTOR_COLORS = [
  '#00FFA7', // mint green - accent
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EC4899', // pink
  '#8B5CF6', // purple
  '#10B981', // emerald
  '#F97316', // orange
  '#06B6D4', // cyan
  '#EF4444', // red
  '#84CC16', // lime
];

function formatEGP(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M EGP`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K EGP`;
  return `${value.toFixed(0)} EGP`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SectorDataItem;
    value: number;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#1e2d3d] bg-[#121C26] px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-white">{item.sector}</div>
      <div className="mt-1 text-[#00FFA7]">{formatEGP(item.value)}</div>
      <div className="text-[#8899aa]">{item.percentage.toFixed(1)}%</div>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: SectorDataItem;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-[10px] text-[#8899aa]">
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate max-w-[80px]">{entry.value}</span>
          <span className="text-[#aabbcc]">{entry.payload.percentage.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function SectorDonutChart({ data }: { data: SectorDataItem[] }) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[#8899aa]">
        No open positions
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="52%"
          outerRadius="72%"
          paddingAngle={2}
          dataKey="value"
          nameKey="sector"
          strokeWidth={0}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
              opacity={0.9}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

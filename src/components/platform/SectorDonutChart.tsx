'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap } from 'recharts';
import { PieChart as PieChartIcon, Grid } from 'lucide-react';

export type SectorDataItem = {
  sector: string;
  value: number;
  percentage: number;
};

const SECTOR_COLORS = [
  '#22c55e', // green
  '#00d2ff', // cyan
  '#f59e0b', // amber
  '#a855f7', // violet
  '#ea3943', // crimson
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f97316', // orange
  '#84cc16', // lime
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
    <div className="rounded-lg border border-plt-border bg-plt-card px-3 py-2 text-xs shadow-xl z-50 backdrop-blur-md">
      <div className="font-medium text-plt-text">{item.sector}</div>
      <div className="mt-1 text-plt-green">{formatEGP(item.value)}</div>
      <div className="text-plt-muted">{item.percentage.toFixed(1)}%</div>
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
    <div className="flex flex-col justify-center gap-y-2.5 h-full pl-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-[11px] text-plt-muted">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate max-w-[110px]" title={entry.value}>{entry.value}</span>
          <span className="text-plt-text ml-auto font-medium">{entry.payload.percentage.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

// Custom content for Treemap
function CustomizedTreemapContent(props: any) {
  const { root, depth, x, y, width, height, index, name, value } = props;

  // Don't render text if the block is too small
  const isLargeEnough = width > 42 && height > 32;
  
  // recharts treemap passes the data in a nested way, but since ours is flat, we get depth=1
  // If it's a leaf node, render it
  if (depth === 1) {
    const item = root?.children?.[index];
    const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: '#000000',
            strokeWidth: 2,
            strokeOpacity: 1,
            opacity: 0.85,
          }}
        />
        {isLargeEnough && (
          <>
            <text 
              x={x + 6} 
              y={y + 16} 
              fill="#ffffff" 
              fontSize={11} 
              fontWeight={500} 
              className="pointer-events-none select-none tracking-tight font-sans"
            >
              {name && name.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + '…' : name}
            </text>
            <text 
              x={x + 6} 
              y={y + 30} 
              fill="rgba(255,255,255,0.7)" 
              fontSize={10} 
              fontWeight={400}
              className="pointer-events-none select-none font-mono"
            >
              {item?.percentage ? `${item.percentage.toFixed(1)}%` : ''}
            </text>
          </>
        )}
      </g>
    );
  }
  
  return null;
}

export default function SectorDonutChart({ data }: { data: SectorDataItem[] }) {
  const [view, setView] = useState<'donut' | 'treemap'>('donut');

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-plt-text">Sector Allocation</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-plt-muted hidden sm:inline">by current value</span>
          <div className="flex bg-plt-base rounded-md p-0.5 border border-plt-border">
            <button
              type="button"
              onClick={() => setView('donut')}
              className={`p-1 rounded-sm transition-colors ${view === 'donut' ? 'bg-plt-surface text-plt-text shadow-sm' : 'text-plt-muted hover:text-plt-text'}`}
              title="Donut View"
            >
              <PieChartIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => setView('treemap')}
              className={`p-1 rounded-sm transition-colors ${view === 'treemap' ? 'bg-plt-surface text-plt-text shadow-sm' : 'text-plt-muted hover:text-plt-text'}`}
              title="Treemap View"
            >
              <Grid size={14} />
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ height: 240 }} className="relative">
        {!data.length ? (
          <div className="flex h-full items-center justify-center text-xs text-plt-muted">
            No open positions
          </div>
        ) : view === 'donut' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="35%"
                cy="50%"
                innerRadius="58%"
                outerRadius="80%"
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
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right" 
                wrapperStyle={{ width: '45%', right: 0 }}
                content={<CustomLegend />} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data.map(item => ({ ...item, name: item.sector, size: item.value }))}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              isAnimationActive={false}
              content={<CustomizedTreemapContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

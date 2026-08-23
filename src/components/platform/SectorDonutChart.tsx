'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap } from 'recharts';
import { PieChart as PieChartIcon, Grid } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type SectorDataItem = {
  sector: string;
  value: number;
  percentage: number;
};

const SECTOR_COLORS = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
  'var(--chart-series-6)',
  'var(--chart-series-7)',
  'var(--chart-series-8)',
];

function formatEGP(value: number, isPrivacy = false): string {
  if (isPrivacy) return '****** EGP';
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
  isPrivacy?: boolean;
}

function CustomTooltip({ active, payload, isPrivacy }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-plt-border bg-plt-card px-4 py-2 text-xs shadow-xl z-50 backdrop-blur-md">
      <div className="font-medium text-plt-text">{item.sector}</div>
      <div className="mt-2 text-plt-profit">{formatEGP(item.value, isPrivacy)}</div>
      <div className="text-plt-muted tabular-nums">{item.percentage.toFixed(1)}%</div>
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
    <div className="flex flex-col justify-center gap-y-2 h-full pl-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-caption text-plt-muted">
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate max-w-28" title={entry.value}>{entry.value}</span>
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
            stroke: 'var(--plt-bg-base)',
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
              fill="var(--plt-text-primary)"
              fontSize="var(--text-size-caption)"
              fontWeight="var(--font-weight-medium-token)"
              className="pointer-events-none select-none tracking-tight font-sans"
            >
              {name && name.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + '…' : name}
            </text>
            <text
              x={x + 6}
              y={y + 30}
              fill="var(--plt-text-secondary)"
              fontSize="var(--text-size-mini)"
              fontWeight="var(--font-weight-regular)"
              className="pointer-events-none select-none tabular-nums"
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
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="widget-title">Sector Allocation</h2>
          <p className="widget-subtitle mt-0.5">Asset weight distribution by industry sector</p>
        </div>
        <div className="pill-switch">
          <button
            type="button"
            onClick={() => setView('donut')}
            className={`pill-switch-btn p-1.5 ${view === 'donut' ? 'pill-switch-btn-active' : ''}`}
            title="Donut View"
          >
            <PieChartIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => setView('treemap')}
            className={`pill-switch-btn p-1.5 ${view === 'treemap' ? 'pill-switch-btn-active' : ''}`}
            title="Treemap View"
          >
            <Grid size={14} />
          </button>
        </div>
      </div>

      <div className="relative h-[320px] w-full">
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
              <Tooltip content={<CustomTooltip isPrivacy={isPrivacy} />} />
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
              stroke="var(--plt-bg-base)"
              fill="var(--chart-series-1)"
              isAnimationActive={false}
              content={<CustomizedTreemapContent />}
            >
              <Tooltip content={<CustomTooltip isPrivacy={isPrivacy} />} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

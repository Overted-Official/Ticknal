'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Treemap } from 'recharts';
import { PieChart as PieChartIcon, Grid } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type SectorDataItem = {
  sector: string;
  value: number;
  percentage: number;
};

// Refined, cohesive institutional color palette for dark mode
const SECTOR_COLORS = [
  '#3b82f6', // Sapphire Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Warm Amber
  '#06b6d4', // Cyan
  '#ec4899', // Rose
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Coral
  '#84cc16', // Lime
];

function formatEGP(value: number, isPrivacy = false): string {
  if (isPrivacy) return '****** £';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M £`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K £`;
  return `${value.toFixed(0)} £`;
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
    <div className="rounded-xl border border-plt-border bg-plt-card/95 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-xl z-50 min-w-36">
      <div className="font-semibold text-plt-text font-sans">{item.sector}</div>
      <div className="mt-1.5 flex items-center justify-between gap-4 font-mono text-[11px]">
        <span className="text-plt-muted">Allocation:</span>
        <span className="text-plt-text font-bold">{item.percentage.toFixed(1)}%</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-mono text-[11px] mt-0.5">
        <span className="text-plt-muted">Market Value:</span>
        <span className="text-plt-profit font-semibold">{formatEGP(item.value, isPrivacy)}</span>
      </div>
    </div>
  );
}

// Custom Treemap Tile with rounded edges, clear typography, and clean contrast
function CustomizedTreemapContent(props: any) {
  const { root, depth, x, y, width, height, index, name } = props;

  if (depth !== 1) return null;

  const item: SectorDataItem | undefined = root?.children?.[index];
  const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
  const isWideEnough = width > 55;
  const isTallEnough = height > 40;

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={6}
        ry={6}
        style={{
          fill: color,
          fillOpacity: 0.85,
          stroke: 'var(--plt-bg-base)',
          strokeWidth: 2,
          transition: 'fill-opacity 0.2s ease',
        }}
      />
      {isWideEnough && isTallEnough && (
        <g className="pointer-events-none select-none font-sans">
          {/* Sector Title */}
          <text
            x={x + 8}
            y={y + 18}
            fill="#ffffff"
            fontSize={width > 90 ? '11px' : '10px'}
            fontWeight="600"
            className="tracking-tight"
          >
            {name && name.length > Math.floor(width / 7.5)
              ? name.substring(0, Math.floor(width / 7.5)) + '…'
              : name}
          </text>
          {/* Percentage & Value Badge */}
          {height > 52 && (
            <text
              x={x + 8}
              y={y + 34}
              fill="rgba(255, 255, 255, 0.85)"
              fontSize="10px"
              fontWeight="500"
              className="font-mono"
            >
              {item?.percentage ? `${item.percentage.toFixed(1)}%` : ''}
              {width > 110 && item?.value ? ` · ${formatEGP(item.value).replace(' £', '£')}` : ''}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export default function SectorDonutChart({ data }: { data: SectorDataItem[] }) {
  const [view, setView] = useState<'donut' | 'treemap'>('donut');
  const { isPrivacy } = usePrivacyMode();

  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="flex h-full flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2 pb-2 border-b border-plt-border-soft shrink-0">
        <div>
          <h2 className="widget-title">Capital Allocation</h2>
          <p className="widget-subtitle mt-0.5">Asset weight distribution across 25 GICS Industry Groups</p>
        </div>
        <div className="pill-switch">
          <button
            type="button"
            onClick={() => setView('donut')}
            className={`pill-switch-btn p-1.5 cursor-pointer ${view === 'donut' ? 'pill-switch-btn-active' : ''}`}
            title="Donut View"
          >
            <PieChartIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => setView('treemap')}
            className={`pill-switch-btn p-1.5 cursor-pointer ${view === 'treemap' ? 'pill-switch-btn-active' : ''}`}
            title="Treemap View"
          >
            <Grid size={14} />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative flex-1 min-h-0 w-full flex items-center">
        {!data.length ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-plt-muted font-sans">
            No open positions to allocate
          </div>
        ) : view === 'donut' ? (
          <div className="w-full h-full flex items-center">
            {/* Donut Chart with Center Label */}
            <div className="relative w-[55%] h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sortedData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="86%"
                    paddingAngle={2.5}
                    dataKey="value"
                    nameKey="sector"
                    strokeWidth={0}
                  >
                    {sortedData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                        className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isPrivacy={isPrivacy} />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Donut Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold font-mono text-plt-text tracking-tight">
                  {formatEGP(totalValue, isPrivacy)}
                </span>
                <span className="text-[10px] text-plt-muted font-sans font-medium mt-0.5">
                  {data.length} {data.length === 1 ? 'Industry' : 'Industries'}
                </span>
              </div>
            </div>

            {/* Clean Modern Custom Legend on Right */}
            <div className="w-[45%] h-full flex flex-col justify-center gap-2 pl-2 pr-1 overflow-y-auto custom-scrollbar">
              {sortedData.map((entry, idx) => {
                const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
                return (
                  <div key={entry.sector} className="flex flex-col gap-0.5 group">
                    <div className="flex items-center justify-between text-[11px] font-sans">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-plt-text font-medium truncate max-w-[95px]" title={entry.sector}>
                          {entry.sector}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-plt-text text-[11px]">
                        {entry.percentage.toFixed(1)}%
                      </span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full h-1 rounded-full bg-plt-border-soft overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, entry.percentage)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={sortedData.map(item => ({ ...item, name: item.sector, size: item.value }))}
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

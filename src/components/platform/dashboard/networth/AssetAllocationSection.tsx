'use client';

import React, { useState, useCallback } from 'react';
import { PieChart as PieChartIcon, LayoutGrid } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Treemap } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type AssetSlice = {
  name: string;
  value: number;
  rawEgp: number;
  color: string;
  percentage: number;
};

interface AssetAllocationSectionProps {
  slices: AssetSlice[];
  currencyMode: 'EGP' | 'USD';
  usdRate: number;
}

export default function AssetAllocationSection({
  slices,
  currencyMode,
  usdRate,
}: AssetAllocationSectionProps) {
  const [chartType, setChartType] = useState<'donut' | 'treemap'>('donut');
  const { isPrivacy } = usePrivacyMode();

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' EGP' : '';

  // Custom Sleek Tooltip showing Category Name, Value & Percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload || payload[0];
      const sliceName = item.name || payload[0].name;
      const sliceVal = Number(item.value ?? payload[0].value ?? 0);
      const slicePct = item.percentage ?? (slices.find((s) => s.name === sliceName)?.percentage ?? 0);
      const sliceColor = item.color || (slices.find((s) => s.name === sliceName)?.color ?? '#fff');

      return (
        <div className="p-2.5 rounded-lg bg-[#141414] border border-white/15 shadow-xl text-xs font-mono">
          <div className="flex items-center gap-1.5 font-bold text-white mb-1 font-sans">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sliceColor }} />
            <span>{sliceName}</span>
          </div>
          <div className="text-white/80">
            {isPrivacy ? (
              <span className="tracking-wider">****** {displaySuffix}</span>
            ) : (
              <>
                {displaySymbol}
                {sliceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {displaySuffix}
              </>
            )}
            <span className="text-emerald-400 font-bold ml-1.5">({slicePct.toFixed(1)}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Crisp Treemap Node Renderer (Fast, no duplicate text, adaptive label sizing)
  const TreemapContentNode = useCallback((props: any) => {
    const { x, y, width, height, name, color, percentage, index } = props;

    if (width <= 4 || height <= 4) return null;

    const matchedSlice = slices.find((s) => s.name === name) || slices[index];
    const nodeColor = matchedSlice?.color || color || '#3b82f6';
    const nodePct = matchedSlice?.percentage ?? percentage ?? 0;
    const rawName = matchedSlice?.name || name || '';

    // Smart adaptive label
    const shortLabel = 
      rawName.includes('USD') ? 'USD Cash' :
      rawName.includes('EGP') ? 'EGP Cash' :
      rawName.includes('Mutual') ? 'Funds' :
      rawName.includes('Equities') ? 'Equities' :
      rawName;

    const isVerySmall = width < 45 || height < 28;
    const isNarrow = width < 85 || height < 44;

    return (
      <g>
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={Math.max(0, height - 2)}
          rx={5}
          ry={5}
          fill={nodeColor}
          fillOpacity={0.92}
          stroke="#000000"
          strokeWidth={1.5}
          style={{ cursor: 'pointer' }}
        />
        {!isVerySmall && (
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={x + width / 2}
              y={isNarrow ? y + height / 2 : y + height / 2 - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize={isNarrow ? 10 : 11}
              fontWeight="700"
              style={{ userSelect: 'none' }}
            >
              {isNarrow ? shortLabel : rawName}
            </text>
            {!isNarrow && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255, 255, 255, 0.85)"
                fontSize={10}
                fontWeight="600"
                fontFamily="monospace"
                style={{ userSelect: 'none' }}
              >
                {nodePct.toFixed(1)}%
              </text>
            )}
          </g>
        )}
      </g>
    );
  }, [slices]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Left 2 Cols: Asset Allocation Grid */}
      <div className="lg:col-span-2 glass-panel rounded-xl p-4 md:p-5 space-y-2 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Asset Allocation & Wealth Composition
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Diversification across EGX stocks, money market mutual funds, USD cash reserves, and local bank balances.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
          {slices.map((slice) => (
            <div key={slice.name} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span className="text-xs font-bold text-white">{slice.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">{slice.percentage.toFixed(1)}%</span>
              </div>

              <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ backgroundColor: slice.color, width: `${Math.min(100, Math.max(0, slice.percentage))}%` }}
                />
              </div>

              <div className="flex items-baseline justify-between text-[11px] font-mono pt-1">
                <span className="text-white/40">Value</span>
                <span className="text-white/90 font-medium">
                  {isPrivacy ? (
                    <span className="tracking-wider">****** {displaySuffix}</span>
                  ) : (
                    <>
                      {displaySymbol}
                      {slice.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {displaySuffix}
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/40">
          <span>Forex Valuation: 1 USD = {usdRate.toFixed(2)} EGP</span>
          <span className="text-emerald-400/80 font-medium">100% Mark-to-Market Live</span>
        </div>
      </div>

      {/* Right 1 Col: Donut or Treemap Chart */}
      <div className="glass-panel rounded-xl p-4 md:p-5 space-y-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Portfolio Split
          </h3>

          {/* View Switcher: Donut vs Treemap */}
          <div className="flex items-center bg-black border border-white/[0.08] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-md text-xs transition ${
                chartType === 'donut' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/40 hover:text-white'
              }`}
              title="Donut Chart"
            >
              <PieChartIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('treemap')}
              className={`p-1.5 rounded-md text-xs transition ${
                chartType === 'treemap' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/40 hover:text-white'
              }`}
              title="Treemap"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'donut' ? (
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
              <Treemap
                data={slices}
                dataKey="value"
                nameKey="name"
                isAnimationActive={false}
                content={<TreemapContentNode />}
              >
                <Tooltip content={<CustomTooltip />} />
              </Treemap>
            )}
          </ResponsiveContainer>
        </div>

        <div className="space-y-1 text-[11px] pt-2 border-t border-white/[0.06]">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-white/60 truncate max-w-[130px]">{s.name}</span>
              </div>
              <span className="font-mono text-white/80 font-semibold">{s.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

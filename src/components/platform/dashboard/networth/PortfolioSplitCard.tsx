'use client';

import React, { useState } from 'react';
import { PieChart as PieChartIcon, LayoutGrid } from '@/components/ui/icon-library';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Treemap,
} from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type AssetSlice } from './AssetAllocationSection';

interface PortfolioSplitCardProps {
  slices: AssetSlice[];
  currencyMode: 'EGP' | 'USD';
  selectedSliceName?: string;
  onSelectSlice?: (name: string) => void;
}

export default function PortfolioSplitCard({
  slices,
  currencyMode,
  selectedSliceName,
  onSelectSlice,
}: PortfolioSplitCardProps) {
  const [chartType, setChartType] = useState<'donut' | 'treemap'>('donut');
  const { isPrivacy } = usePrivacyMode();

  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload || payload[0];
      const sliceName = item.name || payload[0].name;
      const sliceVal = Number(item.value ?? payload[0].value ?? 0);
      const slicePct = item.percentage ?? (slices.find((s) => s.name === sliceName)?.percentage ?? 0);
      const sliceColor = item.color || (slices.find((s) => s.name === sliceName)?.color ?? 'var(--plt-profit)');

      return (
        <div className="p-2.5 rounded-xl bg-plt-card border border-plt-border-strong shadow-popover text-xs tabular-nums select-none">
          <div className="flex items-center gap-2 font-semibold text-plt-text mb-1 font-sans">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sliceColor }} />
            <span>{sliceName}</span>
          </div>
          <div className="text-plt-muted font-sans">
            {isPrivacy ? (
              <span className="tracking-wider">******</span>
            ) : (
              <>
                {displaySymbol}
                {sliceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {displaySuffix}
              </>
            )}
            <span className="text-plt-profit font-semibold ml-2">({slicePct.toFixed(1)}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-widget h-full flex flex-col justify-start select-none space-y-3">
      {/* 1. Card Header with View Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft">
        <h3 className="widget-title">
          Portfolio Split
        </h3>

        <div className="pill-switch">
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`pill-switch-btn p-1.5 ${
              chartType === 'donut' ? 'pill-switch-btn-active' : ''
            }`}
            title="Donut Chart"
          >
            <PieChartIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => setChartType('treemap')}
            className={`pill-switch-btn p-1.5 ${
              chartType === 'treemap' ? 'pill-switch-btn-active' : ''
            }`}
            title="Treemap"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* 2. Visual Chart Canvas */}
      <div className="h-48 w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'donut' ? (
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
                isAnimationActive={false}
              >
                {slices.map((entry) => {
                  const isSelected = selectedSliceName === entry.name;
                  return (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={isSelected ? 'var(--plt-text-primary)' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      className="cursor-pointer transition-all"
                      onClick={() => onSelectSlice && onSelectSlice(isSelected ? 'ALL' : entry.name)}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <Treemap
              data={slices}
              dataKey="value"
              nameKey="name"
              isAnimationActive={false}
              onClick={(node: any) => {
                if (node && node.name && onSelectSlice) {
                  onSelectSlice(selectedSliceName === node.name ? 'ALL' : node.name);
                }
              }}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          )}
        </ResponsiveContainer>
      </div>

      {/* 3. Slice Breakdown List */}
      <div className="space-y-1.5 text-xs pt-2 border-t border-plt-border-soft">
        {slices.map((s) => {
          const isSelected = selectedSliceName === s.name;
          return (
            <div
              key={s.name}
              onClick={() => onSelectSlice && onSelectSlice(isSelected ? 'ALL' : s.name)}
              className={`flex items-center justify-between text-[11px] font-sans p-1 rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'bg-plt-hover' : 'hover:bg-plt-hover/50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className={`truncate max-w-36 ${isSelected ? 'text-plt-text font-semibold' : 'text-plt-text'}`}>{s.name}</span>
              </div>
              <span className="text-plt-text font-semibold tabular-nums">{s.percentage.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

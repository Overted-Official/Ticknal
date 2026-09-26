'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type HomeInvestmentOrder, type SectorDataItem } from '../homeInvestmentsTypes';

export interface SectorItem {
  id: string;
  name: string;
  value: number;
  percentage: number;
  unrealizedGain?: number;
  positionsCount?: number;
  color: string;
}

export interface SectorBreakdownChartProps {
  openOrders?: HomeInvestmentOrder[];
  sectorData?: SectorDataItem[];
  totalValue?: number;
}

const SECTOR_PALETTE = [
  '#2962ff', // TradingView blue
  '#089981', // Mint green
  '#ff9800', // Amber orange
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#e91e63', // Rose pink
  '#f59e0b', // Gold
  '#3f51b5', // Indigo
  '#009688', // Teal
  '#787b86', // Neutral gray
];

export default function SectorBreakdownChart({
  openOrders = [],
  sectorData = [],
  totalValue: propTotalValue,
}: SectorBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isPrivacy } = usePrivacyMode();

  // Resolve total portfolio market value
  const totalValue = useMemo(() => {
    if (propTotalValue !== undefined && propTotalValue > 0) return propTotalValue;
    if (openOrders.length > 0) {
      return openOrders.reduce((sum, o) => sum + o.currentPrice * o.quantity, 0);
    }
    return sectorData.reduce((sum, item) => sum + item.value, 0);
  }, [propTotalValue, openOrders, sectorData]);

  // Aggregate orders by sector
  const sectors: SectorItem[] = useMemo(() => {
    const total = totalValue > 0 ? totalValue : 1;

    if (openOrders.length > 0) {
      const sectorMap = new Map<
        string,
        { value: number; gain: number; count: number }
      >();

      for (const order of openOrders) {
        const sec = order.sector || 'Equities';
        const val = order.currentPrice * order.quantity;
        const gain = order.profitLoss || 0;

        if (!sectorMap.has(sec)) {
          sectorMap.set(sec, { value: 0, gain: 0, count: 0 });
        }
        const item = sectorMap.get(sec)!;
        item.value += val;
        item.gain += gain;
        item.count += 1;
      }

      const items: SectorItem[] = [];
      let idx = 0;
      for (const [sec, d] of sectorMap.entries()) {
        items.push({
          id: `sec-${sec}`,
          name: sec,
          value: d.value,
          percentage: (d.value / total) * 100,
          unrealizedGain: d.gain,
          positionsCount: d.count,
          color: SECTOR_PALETTE[idx % SECTOR_PALETTE.length],
        });
        idx++;
      }
      return items.sort((a, b) => b.value - a.value);
    }

    // Fallback to sectorData
    return sectorData
      .map((item, idx) => ({
        id: `sec-${item.sector}`,
        name: item.sector,
        value: item.value,
        percentage: (item.value / total) * 100,
        color: SECTOR_PALETTE[idx % SECTOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [openOrders, sectorData, totalValue]);

  // Format currency helper
  const formatMoney = (val: number, showSign: boolean = false): string => {
    if (isPrivacy) {
      if (val === 0) return '•••••• £';
      const sign = showSign && val > 0 ? '+' : val < 0 ? '-' : '';
      return `${sign}•••••• £`;
    }
    const formatted = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && val > 0 ? '+' : val < 0 ? '-' : '';
    return `${sign}${formatted} £`;
  };

  const activeSlice =
    hoveredIndex !== null && sectors[hoveredIndex]
      ? sectors[hoveredIndex]
      : null;

  return (
    <div className="w-full h-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5">
      {/* 1. Header: Title + Total Allocation Value */}
      <div className="flex items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">Sector Breakdown</span>
          <span className="badge-count">
            {sectors.length}
          </span>
        </div>

        <div className="text-xs text-text-muted">
          Total:{' '}
          <span className="text-text-primary font-semibold tabular-nums">
            {formatMoney(totalValue)}
          </span>
        </div>
      </div>

      {/* 2. Body: Donut Chart (Left) + Sector Table (Right) */}
      <div className="w-full h-[210px] flex items-center gap-3 min-h-0">
        {sectors.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
            No sector allocation data available.
          </div>
        ) : (
          <>
            {/* Donut Chart Canvas */}
            <div className="w-[140px] sm:w-[160px] h-full relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectors}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={sectors.length > 1 ? 2 : 0}
                    isAnimationActive={false}
                    onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {sectors.map((entry, index) => {
                      const isHighlighted =
                        hoveredIndex === index ||
                        (hoveredIndex === null && index === 0);
                      return (
                        <Cell
                          key={entry.id}
                          fill={entry.color}
                          stroke={isHighlighted ? 'var(--text-primary)' : 'transparent'}
                          strokeWidth={isHighlighted ? 2 : 0}
                          className="cursor-pointer transition-all duration-150"
                          onClick={() => setHoveredIndex(index)}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xl font-bold text-text-primary tracking-tight leading-none tabular-nums">
                  {activeSlice
                    ? `${activeSlice.percentage.toFixed(0)}%`
                    : `${sectors.length}`}
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1 truncate max-w-[80px] px-1">
                  {activeSlice ? activeSlice.name : 'Sectors'}
                </span>
              </div>
            </div>

            {/* Sector Breakdown Table */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pr-1">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[10px] font-medium sticky top-0 bg-surface-base z-10">
                    <th className="pb-1.5 text-left font-medium">Sector</th>
                    <th className="pb-1.5 text-right font-medium">Value</th>
                    <th className="pb-1.5 text-right font-medium">Alloc.</th>
                    <th className="pb-1.5 text-right font-medium hidden sm:table-cell">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {sectors.map((sec, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <tr
                        key={sec.id}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => setHoveredIndex(idx)}
                        className={`hover:bg-surface-active/40 transition-colors cursor-pointer group ${
                          isHovered ? 'bg-surface-active/50' : ''
                        }`}
                      >
                        {/* 1. Sector Color Dot + Name */}
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sec.color }}
                            />
                            <span className="text-text-primary text-[11px] font-medium truncate max-w-[90px] sm:max-w-[120px] group-hover:text-brand-blue transition-colors">
                              {sec.name}
                            </span>
                          </div>
                        </td>

                        {/* 2. Holding Value */}
                        <td className="py-1.5 px-1.5 text-right tabular-nums text-text-primary text-[11px] font-semibold whitespace-nowrap">
                          {isPrivacy ? (
                            '••••'
                          ) : (
                            <>
                              {sec.value.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                              <span className="text-[9px] text-text-muted ml-0.5">£</span>
                            </>
                          )}
                        </td>

                        {/* 3. Allocation Percentage */}
                        <td className="py-1.5 px-1.5 text-right tabular-nums text-text-secondary text-[11px] font-medium whitespace-nowrap">
                          {sec.percentage.toFixed(1)}%
                        </td>

                        {/* 4. Unrealized Gain/Loss */}
                        <td className="py-1.5 pl-1.5 text-right tabular-nums text-[11px] font-semibold whitespace-nowrap hidden sm:table-cell">
                          {sec.unrealizedGain !== undefined ? (
                            <span
                              className={
                                sec.unrealizedGain >= 0
                                  ? 'text-profit-chart'
                                  : 'text-loss-chart'
                              }
                            >
                              {sec.unrealizedGain >= 0 ? '+' : ''}
                              {isPrivacy
                                ? '••••'
                                : sec.unrealizedGain.toLocaleString('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })}
                              {!isPrivacy && (
                                <span className="text-[9px] ml-0.5">£</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-muted font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

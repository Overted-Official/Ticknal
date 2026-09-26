'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type IndustryGroupStake } from '@/types/bank';
import { type DashboardOrder } from '@/components/platform/home/investments/homeInvestmentsTypes';

export type SectorDataItem = {
  sector: string;
  value: number;
  percentage: number;
};

export type CapitalAllocationTab = 'industry' | 'sectors' | 'holdings';

export interface DistributionItem {
  id: string;
  name: string;
  secondaryName?: string;
  value: number;
  percentage: number;
  unrealizedGain?: number;
  color: string;
  tickers?: string[];
  positionsCount?: number;
}

export interface SectorDonutChartProps {
  data?: SectorDataItem[];
  sectorData?: SectorDataItem[];
  industryGroupData?: IndustryGroupStake[];
  openOrders?: DashboardOrder[];
  totalValue?: number;
}

const PALETTE = [
  '#448aff', // TradingView electric blue
  '#9c27b0', // Grapes purple
  '#089981', // Minty green
  '#ff9800', // Tan orange
  '#00bcd4', // Sky blue
  '#e91e63', // Rose
  '#ff5722', // Deep orange
  '#3f51b5', // Indigo
  '#009688', // Teal
  '#ffeb3b', // Amber
];

export default function SectorDonutChart({
  data = [],
  sectorData = [],
  industryGroupData = [],
  openOrders = [],
  totalValue: propTotalValue,
}: SectorDonutChartProps) {
  const [activeTab, setActiveTab] = useState<CapitalAllocationTab>('industry');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isPrivacy } = usePrivacyMode();

  // Resolve total portfolio market value
  const totalValue = useMemo(() => {
    if (propTotalValue !== undefined && propTotalValue > 0) return propTotalValue;
    if (openOrders.length > 0) {
      return openOrders.reduce((sum, o) => sum + (o.currentPrice * o.quantity), 0);
    }
    if (industryGroupData.length > 0) {
      return industryGroupData.reduce((sum, item) => sum + item.value, 0);
    }
    const sourceData = sectorData.length > 0 ? sectorData : data;
    return sourceData.reduce((sum, item) => sum + item.value, 0);
  }, [propTotalValue, openOrders, industryGroupData, sectorData, data]);

  // Compute active items based on selected tab
  const activeItems: DistributionItem[] = useMemo(() => {
    const total = totalValue > 0 ? totalValue : 1;

    // TAB 1: 25 GICS Industry Groups
    if (activeTab === 'industry') {
      if (industryGroupData.length > 0) {
        return industryGroupData.map((ig, idx) => {
          let unrealizedGain: number | undefined = undefined;
          if (openOrders.length > 0) {
            const matches = openOrders.filter(
              (o) => (o.industryGroup || o.sector || 'Unclassified') === ig.industryGroup
            );
            if (matches.length > 0) {
              unrealizedGain = matches.reduce((sum, o) => sum + (o.profitLoss || 0), 0);
            }
          }
          return {
            id: `ig-${ig.industryGroup}`,
            name: ig.industryGroup,
            value: ig.value,
            percentage: (ig.value / total) * 100,
            unrealizedGain,
            color: PALETTE[idx % PALETTE.length],
            tickers: ig.tickers,
            positionsCount: ig.positionsCount,
          };
        }).sort((a, b) => b.value - a.value);
      }

      // Fallback to sectorData or data
      const source = sectorData.length > 0 ? sectorData : data;
      return source.map((item, idx) => ({
        id: `sec-${item.sector}`,
        name: item.sector,
        value: item.value,
        percentage: (item.value / total) * 100,
        color: PALETTE[idx % PALETTE.length],
      })).sort((a, b) => b.value - a.value);
    }

    // TAB 2: Broad Sectors
    if (activeTab === 'sectors') {
      if (openOrders.length > 0) {
        const sectorMap = new Map<string, { value: number; gain: number; tickers: Set<string> }>();
        for (const order of openOrders) {
          const sec = order.sector || 'Unclassified';
          const val = order.currentPrice * order.quantity;
          const gain = order.profitLoss || 0;
          if (!sectorMap.has(sec)) {
            sectorMap.set(sec, { value: 0, gain: 0, tickers: new Set() });
          }
          const item = sectorMap.get(sec)!;
          item.value += val;
          item.gain += gain;
          item.tickers.add(order.tickerSymbol.replace('.CA', ''));
        }

        const items: DistributionItem[] = [];
        let idx = 0;
        for (const [sec, d] of sectorMap.entries()) {
          items.push({
            id: `sec-${sec}`,
            name: sec,
            value: d.value,
            percentage: (d.value / total) * 100,
            unrealizedGain: d.gain,
            color: PALETTE[idx % PALETTE.length],
            tickers: Array.from(d.tickers),
            positionsCount: d.tickers.size,
          });
          idx++;
        }
        return items.sort((a, b) => b.value - a.value);
      }

      const source = sectorData.length > 0 ? sectorData : data;
      return source.map((item, idx) => ({
        id: `sec-${item.sector}`,
        name: item.sector,
        value: item.value,
        percentage: (item.value / total) * 100,
        color: PALETTE[idx % PALETTE.length],
      })).sort((a, b) => b.value - a.value);
    }

    // TAB 3: Individual Open Holdings
    if (activeTab === 'holdings') {
      if (openOrders.length > 0) {
        return openOrders.map((order, idx) => {
          const val = order.currentPrice * order.quantity;
          return {
            id: `ord-${order.id || order.tickerSymbol}`,
            name: order.tickerSymbol.replace('.CA', ''),
            secondaryName: order.companyName,
            value: val,
            percentage: (val / total) * 100,
            unrealizedGain: order.profitLoss,
            color: PALETTE[idx % PALETTE.length],
          };
        }).sort((a, b) => b.value - a.value);
      }

      const source = sectorData.length > 0 ? sectorData : data;
      return source.map((item, idx) => ({
        id: `holding-${item.sector}`,
        name: item.sector,
        value: item.value,
        percentage: (item.value / total) * 100,
        color: PALETTE[idx % PALETTE.length],
      })).sort((a, b) => b.value - a.value);
    }

    return [];
  }, [activeTab, industryGroupData, openOrders, sectorData, data, totalValue]);

  // Tab configurations
  const tabs: Array<{ key: CapitalAllocationTab; label: string }> = [
    { key: 'industry', label: '25 Industry Groups' },
    { key: 'sectors', label: 'Broad Sectors' },
    { key: 'holdings', label: 'Open Holdings' },
  ];

  const activeTabTitle = {
    industry: 'Total industry groups',
    sectors: 'Total sectors',
    holdings: 'Total holdings',
  }[activeTab];

  const currentSlice = hoveredIndex !== null && activeItems[hoveredIndex]
    ? activeItems[hoveredIndex]
    : activeItems[0];

  return (
    <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent">
      {/* 1. Square Tabs Bar (Replicates TradingView top tabs from PortfolioSplitCard) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-b border-[#27272a] pb-2">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveTab(tab.key);
                setHoveredIndex(null);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#27272a] text-white font-semibold shadow-xs border border-[#3f3f46]'
                  : 'text-[#787b86] hover:text-white font-medium'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. Side-by-Side: Donut on Left (col-span-5), Table on Right (col-span-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-1">
        {/* Left Column: Donut Chart Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeItems}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={activeItems.length > 1 ? 2 : 0}
                  isAnimationActive={false}
                  onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {activeItems.map((entry, index) => {
                    const isHighlighted = hoveredIndex === index || (hoveredIndex === null && index === 0);
                    return (
                      <Cell
                        key={entry.id || entry.name}
                        fill={entry.color}
                        stroke={isHighlighted ? '#ffffff' : 'transparent'}
                        strokeWidth={isHighlighted ? 2 : 0}
                        className="cursor-pointer transition-all duration-150"
                        onClick={() => setHoveredIndex(index)}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text inside Donut Hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-3xl font-bold text-white tracking-tight leading-none">
                {activeItems.length}
              </span>
              <span className="text-xs text-[#787b86] font-medium mt-1">
                {activeTabTitle}
              </span>
            </div>
          </div>

          {/* Bottom Arc Label */}
          <div className="text-center py-1 min-h-[26px]">
            {currentSlice && (
              <span className="text-sm font-semibold text-white tracking-wide">
                {currentSlice.name} {currentSlice.secondaryName ? `· ${currentSlice.secondaryName}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Distribution Table (Replicates TradingView table-QQFNVkgh) */}
        <div className="lg:col-span-7 overflow-x-auto overflow-y-auto max-h-[280px] custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] text-[#787b86] text-[11px] font-medium">
                <th className="pb-2 text-left font-medium">
                  {activeTab === 'industry'
                    ? 'Industry group'
                    : activeTab === 'sectors'
                    ? 'Sector'
                    : 'Holding'}
                </th>
                <th className="pb-2 text-right font-medium">Holding value</th>
                <th className="pb-2 text-right font-medium">Allocation</th>
                <th className="pb-2 text-right font-medium">Unrealized gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {activeItems.map((item, idx) => (
                <tr
                  key={item.id || item.name}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(idx)}
                  className={`hover:bg-[#27272a]/30 transition-colors cursor-pointer group ${
                    hoveredIndex === idx ? 'bg-[#27272a]/40' : ''
                  }`}
                >
                  {/* 1. Name with Color Swatch & Tickers Pill */}
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white font-medium truncate max-w-[150px] group-hover:text-[#2962ff] transition-colors">
                          {item.name}
                        </span>
                        {item.tickers && item.tickers.length > 0 && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-[#868993] bg-[#27272a] border border-white/5 truncate max-w-[90px]">
                            {item.tickers.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 2. Holding Value */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                    {isPrivacy ? (
                      '••••••'
                    ) : (
                      <>
                        {item.value.toLocaleString('en-US', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="text-[10px] text-[#787b86] ml-1 uppercase font-normal">
                          EGP
                        </span>
                      </>
                    )}
                  </td>

                  {/* 3. Allocation Percentage */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#d1d4dc] font-medium">
                    {item.percentage.toFixed(1)}%
                  </td>

                  {/* 4. Unrealized Gain */}
                  <td className="py-2.5 pl-3 text-right tabular-nums font-semibold">
                    {item.unrealizedGain !== undefined ? (
                      <span
                        className={
                          item.unrealizedGain >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                        }
                      >
                        {item.unrealizedGain >= 0 ? '+' : ''}
                        {item.unrealizedGain.toLocaleString('en-US', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        <span className="text-[10px] text-[#787b86] ml-0.5 uppercase font-normal">
                          EGP
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#787b86] font-normal">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

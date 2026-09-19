'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import {
  money,
  number,
  regimeTone,
  type Grouping,
  type Regime,
  type HoldingRow,
} from './portfolioTypes';

interface PortfolioAllocationsCardWidgetProps {
  holdings?: HoldingRow[];
  grouping: Grouping;
  allocation: Array<[string, number]>;
  investedValue: number;
  leadingRegimes: Array<[Regime, number]>;
}

type AllocationTab = 'industryGroup' | 'sector' | 'regime';

const PALETTE = [
  '#448aff', // Electric blue
  '#9c27b0', // Purple
  '#089981', // Mint green
  '#ff9800', // Tan orange
  '#00bcd4', // Sky blue
  '#e91e63', // Rose
  '#ff5722', // Deep orange
  '#3f51b5', // Indigo
  '#009688', // Teal
  '#ffeb3b', // Amber
];

export default function PortfolioAllocationsCardWidget({
  holdings = [],
  grouping,
  allocation,
  investedValue,
  leadingRegimes,
}: PortfolioAllocationsCardWidgetProps) {
  const { isPrivacy } = usePrivacyMode();
  const [activeTab, setActiveTab] = useState<AllocationTab>('industryGroup');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tabs: Array<{ key: AllocationTab; label: string }> = [
    { key: 'industryGroup', label: '25 Industry Groups' },
    { key: 'sector', label: '11 Broad Sectors' },
    { key: 'regime', label: 'Rotation Regimes' },
  ];

  // Aggregate distribution items for Donut & Table
  const distributionItems = useMemo(() => {
    const total = investedValue > 0 ? investedValue : 1;

    if (activeTab === 'industryGroup') {
      const groupMap = new Map<string, { value: number; gain: number; regime?: Regime; tickers: string[] }>();
      for (const h of holdings) {
        const key = h.industryGroup || 'Unclassified';
        const existing = groupMap.get(key) || { value: 0, gain: 0, regime: h.regime, tickers: [] };
        existing.value += h.marketValue;
        existing.gain += h.unrealizedPnl;
        existing.tickers.push(h.symbol);
        groupMap.set(key, existing);
      }
      return Array.from(groupMap.entries())
        .map(([name, data], idx) => ({
          id: `ig-${name}`,
          name,
          value: data.value,
          percentage: (data.value / total) * 100,
          gain: data.gain,
          regime: data.regime,
          tickers: data.tickers,
          color: PALETTE[idx % PALETTE.length],
        }))
        .sort((a, b) => b.value - a.value);
    }

    if (activeTab === 'sector') {
      const sectorMap = new Map<string, { value: number; gain: number; tickers: string[] }>();
      for (const h of holdings) {
        const key = h.sector || 'Unclassified';
        const existing = sectorMap.get(key) || { value: 0, gain: 0, tickers: [] };
        existing.value += h.marketValue;
        existing.gain += h.unrealizedPnl;
        existing.tickers.push(h.symbol);
        sectorMap.set(key, existing);
      }
      return Array.from(sectorMap.entries())
        .map(([name, data], idx) => ({
          id: `sec-${name}`,
          name,
          value: data.value,
          percentage: (data.value / total) * 100,
          gain: data.gain,
          regime: undefined as Regime | undefined,
          tickers: data.tickers,
          color: PALETTE[idx % PALETTE.length],
        }))
        .sort((a, b) => b.value - a.value);
    }

    // TAB: Rotation Regimes
    const regimeMap = new Map<string, { value: number; gain: number; tickers: string[] }>();
    for (const h of holdings) {
      const key = h.regime || 'Leading';
      const existing = regimeMap.get(key) || { value: 0, gain: 0, tickers: [] };
      existing.value += h.marketValue;
      existing.gain += h.unrealizedPnl;
      existing.tickers.push(h.symbol);
      regimeMap.set(key, existing);
    }
    return Array.from(regimeMap.entries())
      .map(([name, data], idx) => ({
        id: `reg-${name}`,
        name,
        value: data.value,
        percentage: (data.value / total) * 100,
        gain: data.gain,
        regime: name as Regime,
        tickers: data.tickers,
        color:
          name === 'Leading'
            ? '#089981'
            : name === 'Improving'
            ? '#2962ff'
            : name === 'Weakening'
            ? '#ff9800'
            : '#f23645',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeTab, holdings, investedValue]);

  const currentSlice = hoveredIndex !== null ? distributionItems[hoveredIndex] : null;

  // Largest allocation check
  const largestItem = distributionItems[0];
  const isHighConcentration = largestItem && largestItem.percentage > 30;

  return (
    <div className="w-full min-w-0 relative select-none font-sans space-y-4 pt-1">
      {/* 1. Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Capital Allocation & Exposure</h3>
          <p className="text-xs text-[#787b86] mt-0.5">Diversification breakdown by industry groups, broad sectors, and macro regimes</p>
        </div>

        {/* Pill Tab Switcher */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-[#14171f] border border-[#2a2e39] self-start sm:self-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#2a2e39] text-white shadow-xs'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {distributionItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-[#787b86]">
          <span>No active positions to display allocation breakdown.</span>
        </div>
      ) : (
        /* 2. Side-by-side grid: Donut (5 cols) + Table (7 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-1">
          {/* Left: Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionItems}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={distributionItems.length > 1 ? 2 : 0}
                    isAnimationActive={false}
                    onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {distributionItems.map((entry, index) => (
                      <Cell
                        key={entry.id}
                        fill={entry.color}
                        stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                        strokeWidth={hoveredIndex === index ? 2 : 0}
                        className="cursor-pointer transition-all duration-150"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center hole label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-3xl font-bold text-white tracking-tight leading-none tabular-nums">
                  {distributionItems.length}
                </span>
                <span className="text-[11px] text-[#787b86] font-medium mt-1">
                  {activeTab === 'industryGroup' ? 'Groups' : activeTab === 'sector' ? 'Sectors' : 'Regimes'}
                </span>
              </div>
            </div>

            {/* Hovered slice name below donut */}
            <div className="text-center py-1 min-h-[26px]">
              {currentSlice ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: currentSlice.color }} />
                  <span className="text-sm font-semibold text-white tracking-wide">
                    {currentSlice.name}: {currentSlice.percentage.toFixed(1)}%
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[#787b86]">Hover over any slice for details</span>
              )}
            </div>
          </div>

          {/* Right: Breakdown Table */}
          <div className="lg:col-span-7 overflow-x-auto overflow-y-auto max-h-[280px] custom-scrollbar">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#1e222d] text-[#787b86] text-[11px] font-medium">
                  <th className="pb-2 text-left font-medium">Name</th>
                  <th className="pb-2 text-right font-medium">Market Value</th>
                  <th className="pb-2 text-right font-medium">Allocation</th>
                  <th className="pb-2 text-right font-medium">Gain / Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222d]/60">
                {distributionItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`transition-colors cursor-pointer group ${
                      hoveredIndex === idx ? 'bg-[#1e222d]/60' : 'hover:bg-[#1e222d]/30'
                    }`}
                  >
                    {/* Name with color swatch */}
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-white font-medium truncate max-w-[160px] group-hover:text-[#2962ff] transition-colors">
                            {item.name}
                          </span>
                          {item.tickers && item.tickers.length > 0 && (
                            <span className="text-[10px] text-[#787b86] font-mono">
                              {item.tickers.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Market Value */}
                    <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                      {isPrivacy ? '••••••••' : money(item.value)}
                    </td>

                    {/* Allocation % */}
                    <td className="py-2.5 px-3 text-right tabular-nums text-[#d1d4dc] font-medium">
                      {item.percentage.toFixed(1)}%
                    </td>

                    {/* Gain / Regime */}
                    <td className="py-2.5 pl-3 text-right tabular-nums font-semibold">
                      {item.regime ? (
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] ${regimeTone(item.regime)}`}>
                          {item.regime}
                        </span>
                      ) : (
                        <span className={item.gain >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                          {isPrivacy ? (item.gain >= 0 ? '+••••••••' : '-••••••••') : (
                            <>{item.gain > 0 ? '+' : ''}{money(item.gain)}</>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Concentration Risk Diagnostic Footer */}
      {largestItem && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1e222d] text-[11px] text-[#787b86]">
          <div>
            Largest exposure: <strong className="text-white">{largestItem.name}</strong> ({largestItem.percentage.toFixed(1)}%).{' '}
            {isHighConcentration ? (
              <span className="text-amber-400 font-semibold">Concentration warning above 30% guardrail.</span>
            ) : (
              <span className="text-[#089981]">Well-diversified within the 30% concentration guardrail.</span>
            )}
          </div>
          <span className="text-[10px] text-[#787b86]">Based on open holdings mark-to-market</span>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type PositionItem, type BankAccount } from '@/types/bank';
import { type AssetSlice } from './AssetAllocationSection';

export type DistributionTab = 'assets' | 'types' | 'sectors' | 'currency';

interface DistributionItem {
  id: string;
  name: string;
  value: number;
  rawEgp: number;
  percentage: number;
  unrealizedGain?: number;
  color: string;
}

interface PortfolioSplitCardProps {
  slices?: AssetSlice[];
  currencyMode: 'EGP' | 'USD';
  selectedSliceName?: string;
  onSelectSlice?: (name: string) => void;
  openPositions?: PositionItem[];
  accounts?: BankAccount[];
  usdRate?: number;
  totalNetWorthEgp?: number;
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

export default function PortfolioSplitCard({
  slices = [],
  currencyMode,
  selectedSliceName,
  onSelectSlice,
  openPositions = [],
  accounts = [],
  usdRate = 50.0,
  totalNetWorthEgp = 0,
}: PortfolioSplitCardProps) {
  const [activeTab, setActiveTab] = useState<DistributionTab>('types');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isPrivacy } = usePrivacyMode();

  const fxMultiplier = currencyMode === 'USD' ? (1 / usdRate) : 1;
  const currencyCode = currencyMode === 'USD' ? 'USD' : 'EGP';

  const mutualFundSymbols = new Set(['OSOUL', 'CI_QUANT', 'COF']);
  const isBrokerageAccount = (account: BankAccount) => ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType);

  // Compute Distribution Items based on Active Tab
  const activeItems: DistributionItem[] = useMemo(() => {
    const netWorth = totalNetWorthEgp > 0 ? totalNetWorthEgp : 1;

    // TAB 1: ASSET TYPES (Stock, Mutual Funds, USD Reserves, EGP Cash, Brokerage Cash)
    if (activeTab === 'types') {
      let equitiesEgp = 0;
      let equitiesGainEgp = 0;
      let fundsEgp = 0;
      let fundsGainEgp = 0;

      for (const pos of openPositions) {
        const isFund = mutualFundSymbols.has(pos.tickerSymbol.toUpperCase());
        const posVal = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
        const entryVal = Number(pos.quantity) * Number(pos.entryPrice);
        const gain = posVal - entryVal;

        if (isFund) {
          fundsEgp += posVal;
          fundsGainEgp += gain;
        } else {
          equitiesEgp += posVal;
          equitiesGainEgp += gain;
        }
      }

      let usdReservesEgp = 0;
      let egpCashEgp = 0;
      let brokerageCashEgp = 0;

      for (const acc of accounts) {
        const bal = Number(acc.balance);
        const isBrokerage = isBrokerageAccount(acc);
        if (acc.currency === 'USD') {
          const valInEgp = bal * usdRate;
          if (isBrokerage) {
            brokerageCashEgp += valInEgp;
          } else {
            usdReservesEgp += valInEgp;
          }
        } else {
          if (isBrokerage) {
            brokerageCashEgp += bal;
          } else {
            egpCashEgp += bal;
          }
        }
      }

      const items: DistributionItem[] = [];

      if (equitiesEgp > 0) {
        items.push({
          id: 'stock',
          name: 'Stock',
          value: equitiesEgp * fxMultiplier,
          rawEgp: equitiesEgp,
          percentage: (equitiesEgp / netWorth) * 100,
          unrealizedGain: equitiesGainEgp * fxMultiplier,
          color: '#448aff', // TradingView electric blue
        });
      }

      if (fundsEgp > 0) {
        items.push({
          id: 'funds',
          name: 'Mutual Funds',
          value: fundsEgp * fxMultiplier,
          rawEgp: fundsEgp,
          percentage: (fundsEgp / netWorth) * 100,
          unrealizedGain: fundsGainEgp !== 0 ? fundsGainEgp * fxMultiplier : undefined,
          color: '#9c27b0',
        });
      }

      if (usdReservesEgp > 0) {
        items.push({
          id: 'usd-cash',
          name: 'USD Reserves',
          value: usdReservesEgp * fxMultiplier,
          rawEgp: usdReservesEgp,
          percentage: (usdReservesEgp / netWorth) * 100,
          color: '#089981',
        });
      }

      if (egpCashEgp > 0) {
        items.push({
          id: 'egp-cash',
          name: 'EGP Cash',
          value: egpCashEgp * fxMultiplier,
          rawEgp: egpCashEgp,
          percentage: (egpCashEgp / netWorth) * 100,
          color: '#ff9800',
        });
      }

      if (brokerageCashEgp > 0) {
        items.push({
          id: 'brokerage-cash',
          name: 'Brokerage Cash',
          value: brokerageCashEgp * fxMultiplier,
          rawEgp: brokerageCashEgp,
          percentage: (brokerageCashEgp / netWorth) * 100,
          color: '#00bcd4',
        });
      }

      // Fallback to slices if no positions/accounts provided
      if (items.length === 0 && slices.length > 0) {
        return slices.map((s, i) => ({
          id: `slice-${i}`,
          name: s.name,
          value: s.value,
          rawEgp: s.value / fxMultiplier,
          percentage: s.percentage,
          color: s.color || PALETTE[i % PALETTE.length],
        }));
      }

      return items;
    }

    // TAB 2: INDIVIDUAL ASSETS
    if (activeTab === 'assets') {
      const items: DistributionItem[] = [];

      for (const pos of openPositions) {
        const valEgp = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
        const entryVal = Number(pos.quantity) * Number(pos.entryPrice);
        items.push({
          id: `pos-${pos.id || pos.tickerSymbol}`,
          name: pos.tickerSymbol,
          value: valEgp * fxMultiplier,
          rawEgp: valEgp,
          percentage: (valEgp / netWorth) * 100,
          unrealizedGain: (valEgp - entryVal) * fxMultiplier,
          color: PALETTE[items.length % PALETTE.length],
        });
      }

      for (const acc of accounts) {
        const valEgp = acc.currency === 'USD' ? Number(acc.balance) * usdRate : Number(acc.balance);
        items.push({
          id: `acc-${acc.id}`,
          name: acc.accountName || acc.bankName || 'Cash Account',
          value: valEgp * fxMultiplier,
          rawEgp: valEgp,
          percentage: (valEgp / netWorth) * 100,
          color: PALETTE[items.length % PALETTE.length],
        });
      }

      return items.sort((a, b) => b.rawEgp - a.rawEgp);
    }

    // TAB 3: SECTORS
    if (activeTab === 'sectors') {
      const sectorMap = new Map<string, { rawEgp: number; gainEgp: number }>();

      for (const pos of openPositions) {
        const sector = pos.sector || 'Equities';
        const valEgp = Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
        const gain = valEgp - (Number(pos.quantity) * Number(pos.entryPrice));
        const prev = sectorMap.get(sector) || { rawEgp: 0, gainEgp: 0 };
        sectorMap.set(sector, { rawEgp: prev.rawEgp + valEgp, gainEgp: prev.gainEgp + gain });
      }

      let cashEgp = 0;
      for (const acc of accounts) {
        cashEgp += acc.currency === 'USD' ? Number(acc.balance) * usdRate : Number(acc.balance);
      }
      if (cashEgp > 0) {
        sectorMap.set('Cash & Reserves', { rawEgp: cashEgp, gainEgp: 0 });
      }

      const items: DistributionItem[] = [];
      let idx = 0;
      for (const [sector, data] of sectorMap.entries()) {
        items.push({
          id: `sector-${sector}`,
          name: sector,
          value: data.rawEgp * fxMultiplier,
          rawEgp: data.rawEgp,
          percentage: (data.rawEgp / netWorth) * 100,
          unrealizedGain: data.gainEgp !== 0 ? data.gainEgp * fxMultiplier : undefined,
          color: PALETTE[idx % PALETTE.length],
        });
        idx += 1;
      }

      return items.sort((a, b) => b.rawEgp - a.rawEgp);
    }

    // TAB 4: CURRENCY (EGP vs USD)
    if (activeTab === 'currency') {
      let egpTotal = 0;
      let usdTotal = 0;

      for (const pos of openPositions) {
        egpTotal += Number(pos.quantity) * Number(pos.currentPrice || pos.entryPrice);
      }
      for (const acc of accounts) {
        if (acc.currency === 'USD') {
          usdTotal += Number(acc.balance) * usdRate;
        } else {
          egpTotal += Number(acc.balance);
        }
      }

      const items: DistributionItem[] = [];
      if (egpTotal > 0) {
        items.push({
          id: 'curr-egp',
          name: 'EGP',
          value: egpTotal * fxMultiplier,
          rawEgp: egpTotal,
          percentage: (egpTotal / netWorth) * 100,
          color: '#ff9800',
        });
      }
      if (usdTotal > 0) {
        items.push({
          id: 'curr-usd',
          name: 'USD',
          value: usdTotal * fxMultiplier,
          rawEgp: usdTotal,
          percentage: (usdTotal / netWorth) * 100,
          color: '#089981',
        });
      }
      return items;
    }

    return [];
  }, [activeTab, openPositions, accounts, usdRate, fxMultiplier, totalNetWorthEgp, slices]);

  // Center & Bottom Slice Labels
  const activeTabTitle = {
    types: 'Total assets',
    assets: 'Total assets',
    sectors: 'Total sectors',
    currency: 'Total currencies',
  }[activeTab];

  const currentSlice = hoveredIndex !== null && activeItems[hoveredIndex]
    ? activeItems[hoveredIndex]
    : (selectedSliceName ? activeItems.find((i) => i.name === selectedSliceName) : activeItems[0]);

  const tabs: Array<{ key: DistributionTab; label: string }> = [
    { key: 'assets', label: 'Assets' },
    { key: 'types', label: 'Asset types' },
    { key: 'sectors', label: 'Sectors' },
    { key: 'currency', label: 'Currency' },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-start select-none space-y-4 bg-transparent">
      {/* 1. Square Tabs Bar */}
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
                        onClick={() => onSelectSlice && onSelectSlice(entry.name)}
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
                {currentSlice.name}
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
                  {activeTab === 'types'
                    ? 'Asset type'
                    : activeTab === 'sectors'
                    ? 'Sector'
                    : activeTab === 'currency'
                    ? 'Currency'
                    : 'Asset'}
                </th>
                <th className="pb-2 text-right font-medium">Holding value</th>
                <th className="pb-2 text-right font-medium">Allocation</th>
                <th className="pb-2 text-right font-medium">Unrealized gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60">
              {activeItems.map((item) => (
                <tr
                  key={item.id || item.name}
                  onClick={() => onSelectSlice && onSelectSlice(item.name)}
                  className="hover:bg-[#27272a]/30 transition-colors cursor-pointer group"
                >
                  {/* 1. Name with Color Swatch */}
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-white font-medium truncate max-w-[140px] group-hover:text-[#2962ff] transition-colors">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {/* 2. Holding Value */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
                    {isPrivacy ? (
                      '••••••'
                    ) : (
                      <>
                        {item.value.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[10px] text-[#787b86] ml-1 uppercase font-normal">
                          {currencyCode}
                        </span>
                      </>
                    )}
                  </td>

                  {/* 3. Allocation Percentage */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#d1d4dc] font-medium">
                    {item.percentage.toFixed(2)}%
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
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[10px] text-[#787b86] ml-0.5 uppercase font-normal">
                          {currencyCode}
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

'use client';

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type BankAccount } from '@/types/bank';
import { type HomeInvestmentOrder } from '../../homeInvestmentsTypes';

export interface AssetAllocationSlice {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  itemCount: number;
}

interface NetWorthBreakdownChartProps {
  accounts?: BankAccount[];
  openOrders?: HomeInvestmentOrder[];
  usdRate?: number;
}

const ASSET_CLASS_CONFIG: Record<string, { name: string; color: string }> = {
  STOCKS: { name: 'EGX Equities', color: '#2962ff' },
  FUNDS: { name: 'Mutual Funds & ETFs', color: '#00bcd4' },
  BROKERAGE: { name: 'Brokerage Cash', color: '#f59e0b' },
  USD_CASH: { name: 'USD Cash Reserves', color: '#089981' },
  EGP_CASH: { name: 'EGP Liquid Cash', color: '#9c27b0' },
  CDS: { name: 'Certificates & Deposits', color: '#e91e63' },
};

export default function NetWorthBreakdownChart({
  accounts = [],
  openOrders = [],
  usdRate = 50.20,
}: NetWorthBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isPrivacy } = usePrivacyMode();

  // Aggregate assets into slices
  const { slices, totalValue } = useMemo(() => {
    let stocksVal = 0;
    let fundsVal = 0;
    let brokerageVal = 0;
    let usdCashVal = 0;
    let egpCashVal = 0;
    let cdsVal = 0;

    let fundsCount = 0;
    let brokerageCount = 0;
    let usdCashCount = 0;
    let egpCashCount = 0;
    let cdsCount = 0;

    // 1. Equities
    for (const o of openOrders) {
      stocksVal += Number(o.currentPrice || 0) * Number(o.quantity || 0);
    }

    // 2. Accounts
    for (const acc of accounts) {
      const bal = Number(acc.balance || 0);
      const isUsd = (acc.currency || '').toUpperCase() === 'USD';
      const balEgp = isUsd ? bal * usdRate : bal;
      const type = (acc.accountType || '').toUpperCase();

      if (type.includes('FUND') || type.includes('ETF')) {
        fundsVal += balEgp;
        fundsCount++;
      } else if (type.includes('BROKERAGE') || type.includes('TRADING') || type.includes('INVEST')) {
        brokerageVal += balEgp;
        brokerageCount++;
      } else if (type.includes('CD') || type.includes('DEPOSIT') || type.includes('CERTIFICATE')) {
        cdsVal += balEgp;
        cdsCount++;
      } else if (isUsd) {
        usdCashVal += balEgp;
        usdCashCount++;
      } else {
        egpCashVal += balEgp;
        egpCashCount++;
      }
    }

    const total = stocksVal + fundsVal + brokerageVal + usdCashVal + egpCashVal + cdsVal;
    const safeTotal = total > 0 ? total : 1;

    const rawList: AssetAllocationSlice[] = [
      {
        id: 'stocks',
        name: ASSET_CLASS_CONFIG.STOCKS.name,
        value: stocksVal,
        percentage: (stocksVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.STOCKS.color,
        itemCount: openOrders.length,
      },
      {
        id: 'funds',
        name: ASSET_CLASS_CONFIG.FUNDS.name,
        value: fundsVal,
        percentage: (fundsVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.FUNDS.color,
        itemCount: fundsCount,
      },
      {
        id: 'brokerage',
        name: ASSET_CLASS_CONFIG.BROKERAGE.name,
        value: brokerageVal,
        percentage: (brokerageVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.BROKERAGE.color,
        itemCount: brokerageCount,
      },
      {
        id: 'usd_cash',
        name: ASSET_CLASS_CONFIG.USD_CASH.name,
        value: usdCashVal,
        percentage: (usdCashVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.USD_CASH.color,
        itemCount: usdCashCount,
      },
      {
        id: 'egp_cash',
        name: ASSET_CLASS_CONFIG.EGP_CASH.name,
        value: egpCashVal,
        percentage: (egpCashVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.EGP_CASH.color,
        itemCount: egpCashCount,
      },
      {
        id: 'cds',
        name: ASSET_CLASS_CONFIG.CDS.name,
        value: cdsVal,
        percentage: (cdsVal / safeTotal) * 100,
        color: ASSET_CLASS_CONFIG.CDS.color,
        itemCount: cdsCount,
      },
    ].filter((s) => s.value > 0);

    return {
      slices: rawList.sort((a, b) => b.value - a.value),
      totalValue: total,
    };
  }, [accounts, openOrders, usdRate]);

  const formatMoney = (val: number): string => {
    if (isPrivacy) return '•••••• £';
    const formatted = Math.round(val).toLocaleString('en-US');
    return `${formatted} £`;
  };

  const activeSlice =
    hoveredIndex !== null && slices[hoveredIndex]
      ? slices[hoveredIndex]
      : null;

  return (
    <div className="w-full h-full flex flex-col justify-start select-none bg-surface-base rounded-2xl p-3.5 sm:p-4 space-y-2.5">
      {/* 1. Header: Title + Total Net Worth */}
      <div className="flex items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">Asset Allocation</span>
          <span className="badge-count">
            {slices.length}
          </span>
        </div>

        <div className="text-xs text-text-muted">
          Total:{' '}
          <span className="text-text-primary font-semibold tabular-nums">
            {formatMoney(totalValue)}
          </span>
        </div>
      </div>

      {/* 2. Body: Donut Chart (Left) + Asset Class Table (Right) */}
      <div className="w-full h-[210px] flex items-center gap-3 min-h-0">
        {slices.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
            No asset allocation data available.
          </div>
        ) : (
          <>
            {/* Donut Chart Canvas */}
            <div className="w-[140px] sm:w-[160px] h-full relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={slices.length > 1 ? 2 : 0}
                    isAnimationActive={false}
                    onMouseEnter={(_, idx) => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {slices.map((entry, index) => {
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
                    : `${slices.length}`}
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1 truncate max-w-[80px] px-1">
                  {activeSlice ? activeSlice.name : 'Assets'}
                </span>
              </div>
            </div>

            {/* Asset Allocation Table */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pr-1">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-[10px] font-medium sticky top-0 bg-surface-base z-10">
                    <th className="pb-1.5 text-left font-medium">Asset Class</th>
                    <th className="pb-1.5 text-right font-medium">Value</th>
                    <th className="pb-1.5 text-right font-medium">Alloc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {slices.map((slice, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <tr
                        key={slice.id}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`group transition-colors cursor-pointer ${
                          isHovered ? 'bg-surface-elevated/80' : 'hover:bg-surface-elevated/40'
                        }`}
                      >
                        <td className="py-1.5 text-left pr-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="font-medium text-text-primary text-[11px] truncate">
                              {slice.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right font-medium text-text-primary text-[11px] tabular-nums whitespace-nowrap">
                          {formatMoney(slice.value)}
                        </td>
                        <td className="py-1.5 text-right text-[11px] text-text-secondary font-medium tabular-nums pl-1.5">
                          {slice.percentage.toFixed(1)}%
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

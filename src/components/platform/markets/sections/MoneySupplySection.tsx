'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { MoneySupplyData, SectorsPerformanceResponse } from '@/lib/finance/sectors-math';
import { ChevronRight } from '@/components/ui/icon-library';
import SectionLoadingState from '@/components/ui/SectionLoadingState';

export type SelectedMoneySupplySymbol = 'M2' | 'M1' | 'M0';
export type MoneySupplyHorizon = '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';

const HORIZONS: { key: MoneySupplyHorizon; label: string; count: number }[] = [
  { key: '1Y', label: '1Y', count: 12 },
  { key: '3Y', label: '3Y', count: 36 },
  { key: '5Y', label: '5Y', count: 60 },
  { key: '10Y', label: '10Y', count: 120 },
  { key: 'ALL', label: 'ALL', count: 9999 },
];

interface MoneySupplySectionProps {
  id?: string;
  macroData?: SectorsPerformanceResponse;
  isLoading?: boolean;
}

export default function MoneySupplySection({
  id = 'money-supply',
  macroData,
  isLoading = false,
}: MoneySupplySectionProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<SelectedMoneySupplySymbol>('M2');
  const [horizon, setHorizon] = useState<MoneySupplyHorizon>('5Y');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const moneySupply = macroData?.moneySupply;

  const supplyList: MoneySupplyData[] = useMemo(() => {
    if (!moneySupply) return [];
    const keys: SelectedMoneySupplySymbol[] = ['M2', 'M1', 'M0'];
    return keys
      .map((k) => moneySupply[k])
      .filter((item): item is MoneySupplyData => Boolean(item));
  }, [moneySupply]);

  const activeItem = moneySupply?.[selectedSymbol] || supplyList[0] || null;

  // Filter series according to horizon
  const chartData = useMemo(() => {
    if (!activeItem || !activeItem.history || activeItem.history.length === 0) {
      return [];
    }

    const selectedPreset = HORIZONS.find((h) => h.key === horizon);
    const count = selectedPreset ? selectedPreset.count : 60;
    const sliced = activeItem.history.slice(-count);

    return sliced.map((h) => ({
      date: h.date,
      value: h.value,
      change: h.change,
      changePercent: h.changePercent,
    }));
  }, [activeItem, horizon]);

  // Determine trend color from latest change
  const isPositive = (activeItem?.changePercent ?? 0) >= 0;
  // Authentic TradingView ripe red (#f23645) and pine green (#089981)
  const strokeColor = isPositive ? '#089981' : '#f23645';
  const gradientId = `tv-area-grad-money-supply-${selectedSymbol}-${isPositive ? 'up' : 'down'}`;

  // Compute clean Y-axis ticks scaled in Trillions (EGP)
  const { yMin, yMax, latestVal, yTicks } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 0, yMax: 100, latestVal: 0, yTicks: [] };
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || min * 0.05 || 1e12;
    const padding = spread * 0.12;

    const rawMin = Math.max(0, min - padding);
    const rawMax = max + padding;

    // Pick clean step in Trillions
    const rawStep = spread / 6;
    let step = 1e12;
    if (rawStep < 2e11) step = 1e11;
    else if (rawStep < 5e11) step = 2.5e11;
    else if (rawStep < 1e12) step = 5e11;
    else if (rawStep < 2e12) step = 1e12;
    else if (rawStep < 5e12) step = 2e12;
    else step = 5e12;

    const startTick = Math.floor(rawMin / step) * step;
    const ticks: number[] = [];
    for (let t = startTick; t <= rawMax + step; t += step) {
      if (t >= rawMin * 0.98 && t <= rawMax * 1.02) {
        ticks.push(t);
      }
    }

    const last = values[values.length - 1];
    return {
      yMin: Math.min(...ticks, rawMin),
      yMax: Math.max(...ticks, rawMax),
      latestVal: last,
      yTicks: ticks,
    };
  }, [chartData]);

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  return (
    <div id={id} className="w-full pt-3 select-none font-sans">
      <div className="w-full bg-transparent p-0 border-0">
        {/* 1. Header: 'Money supply (M2) ›' + Horizon Switcher */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1 cursor-pointer group w-fit">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              Money supply
            </h3>
            <ChevronRight
              size={16}
              className="text-neutral-400 group-hover:text-white transition-colors translate-y-[0.5px]"
            />
          </div>

          {/* Time Horizon Pills */}
          <div className="flex items-center gap-1">
            <div className="seg-control h-7 py-0.5 px-1 rounded-lg">
              {HORIZONS.map((h) => {
                const isSelected = horizon === h.key;
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => setHorizon(h.key)}
                    className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-active text-white font-semibold shadow-xs'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Selectable Money Supply Row (1-to-1 with Major Indices) */}
        <div className="flex items-center justify-between gap-3 relative">
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar select-none flex-1"
          >
            {supplyList.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              const isItemPos = item.changePercent >= 0;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(item.symbol as SelectedMoneySupplySymbol)}
                  className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-full transition-all shrink-0 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-surface-active border border-white/10 shadow-lg'
                      : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Left Circular Badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-surface-raised text-white border border-neutral-600'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-700/80'
                    }`}
                  >
                    {item.badge}
                  </div>

                  {/* Right Info Block */}
                  <div className="flex flex-col justify-center">
                    {/* Top Line: Name + Amber M Tag (Monthly) + Dash */}
                    <div className="flex items-center gap-1 leading-none">
                      <span
                        className={`text-xs font-medium tracking-tight whitespace-nowrap ${
                          isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 ml-0.5">M</span>
                      <span className="text-neutral-500 text-xs ml-0.5">-</span>
                    </div>

                    {/* Bottom Line: Trillions Value + T EGP + MoM Return % */}
                    <div className="flex items-center gap-1.5 mt-1 leading-none">
                      <span className="text-xs font-bold text-white tabular-nums">
                        {(item.value / 1e12).toLocaleString('en-US', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}
                      </span>
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight">
                        T EGP
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ml-1 ${
                          isItemPos ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isItemPos ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Carousel Right Arrow Button */}
          <button
            type="button"
            onClick={scrollRight}
            className="w-8 h-8 rounded-full bg-black hover:bg-surface-raised border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0 cursor-pointer mb-2"
            title="Next indicators"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 3. TradingView-Style Clean Area Chart Canvas */}
        <div className="relative mt-2 w-full min-w-0 h-[380px] sm:h-[420px] bg-black overflow-hidden pt-2">
          {isLoading ? (
            <SectionLoadingState className="h-full" label="Loading money supply data…" />
          ) : chartData.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              No historical data available for this timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
                    <stop offset="50%" stopColor={strokeColor} stopOpacity={0.10} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Right Y-Axis (TradingView Trillions Scale) */}
                <YAxis
                  orientation="right"
                  domain={[yMin, yMax]}
                  ticks={yTicks.length > 0 ? yTicks : undefined}
                  width={64}
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                  tickFormatter={(val: number) => {
                    const inT = val / 1e12;
                    return Number.isInteger(inT) ? `${inT} T` : `${inT.toFixed(2)} T`;
                  }}
                  dx={2}
                />

                {/* Bottom X-Axis (TradingView Clean Dates) */}
                <XAxis
                  dataKey="date"
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'sans-serif' }}
                  dy={10}
                  tickFormatter={(dateStr: string) => {
                    if (!dateStr) return '';
                    const parts = dateStr.split('-');
                    if (parts.length >= 2) {
                      const year = parts[0];
                      const monthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                      ];
                      const mIdx = parseInt(parts[1], 10) - 1;
                      if (horizon === 'ALL' || horizon === '10Y') {
                        return `'${year.slice(2)}`;
                      }
                      return `${monthNames[mIdx]} '${year.slice(2)}`;
                    }
                    return dateStr;
                  }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />

                {/* Horizontal Latest Guideline */}
                {latestVal > 0 && (
                  <ReferenceLine
                    y={latestVal}
                    stroke={strokeColor}
                    strokeDasharray="2 3"
                    strokeWidth={1}
                  />
                )}

                {/* Interactive Tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    const isValPos = (data.changePercent ?? 0) >= 0;

                    const formattedTotal = Number(data.value).toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    });
                    const inTrillions = (Number(data.value) / 1e12).toFixed(3);
                    const formattedChg = Number(data.change).toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    });

                    return (
                      <div className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50">
                        <div className="text-neutral-400 font-medium pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span>{data.date}</span>
                          <span className="font-semibold text-neutral-200">{activeItem?.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <span className="text-neutral-400">Total Supply:</span>
                          <span className="font-bold text-white tabular-nums text-sm">
                            {inTrillions}{' '}
                            <span className="text-[10px] text-neutral-400">TRILLION EGP</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 tabular-nums flex items-center justify-between gap-4">
                          <span>Exact Value:</span>
                          <span className="text-neutral-200">{formattedTotal} EGP</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/5">
                          <span className="text-neutral-400">Monthly Change:</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isValPos ? 'text-profit-num' : 'text-loss-num'
                            }`}
                          >
                            {isValPos ? '+' : ''}
                            {formattedChg} EGP ({isValPos ? '+' : ''}
                            {Number(data.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Main Area Series (Linear interpolation for crisp TradingView styling) */}
                <Area
                  type="linear"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={1.8}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Solid TradingView-style Price Badge Pinned on the Right Axis */}
          {latestVal > 0 && (
            <div
              className="absolute right-0 pointer-events-none pr-1 flex items-center z-10"
              style={{
                top: `calc(16px + (100% - 36px) * ${Math.max(
                  0,
                  Math.min(1, (yMax - latestVal) / (yMax - yMin || 1))
                )})`,
                transform: 'translateY(-50%)',
              }}
            >
              <div
                className="px-1.5 py-0.5 rounded-[2px] text-[10px] sm:text-[11px] font-bold text-white shadow-lg tabular-nums tracking-tight"
                style={{ backgroundColor: strokeColor }}
              >
                {(latestVal / 1e12).toFixed(3)} T
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

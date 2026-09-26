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
import type { MajorIndexData, SectorsPerformanceResponse } from '@/lib/finance/sectors-math';
import { ChevronRight } from '@/components/ui/icon-library';

export type SelectedIndexSymbol = 'EGX30' | 'EGX70' | 'EGX100';

interface MajorIndicesSectionProps {
  id?: string;
  macroData?: SectorsPerformanceResponse;
  isLoading?: boolean;
}

export default function MajorIndicesSection({
  id = 'major-indices',
  macroData,
  isLoading = false,
}: MajorIndicesSectionProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<SelectedIndexSymbol>('EGX30');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const majorIndices = macroData?.majorIndices;

  const indexList: MajorIndexData[] = useMemo(() => {
    if (!majorIndices) return [];
    const keys: SelectedIndexSymbol[] = ['EGX30', 'EGX70', 'EGX100'];
    return keys
      .map((k) => majorIndices[k])
      .filter((item): item is MajorIndexData => Boolean(item));
  }, [majorIndices]);

  const activeIndex = majorIndices?.[selectedSymbol] || indexList[0] || null;

  // Format data series for chart
  const chartData = useMemo(() => {
    if (!activeIndex || !activeIndex.history || activeIndex.history.length === 0) {
      return [];
    }
    return activeIndex.history.map((h, i, arr) => {
      const prev = i > 0 ? arr[i - 1].close : h.open;
      const chg = h.close - prev;
      const chgPct = prev > 0 ? (chg / prev) * 100 : 0;
      return {
        date: h.date,
        close: h.close,
        open: h.open,
        high: h.high,
        low: h.low,
        volume: h.volume,
        change: chg,
        changePercent: chgPct,
      };
    });
  }, [activeIndex]);

  // Determine trend color from latest daily change or period return
  const isPositive = (activeIndex?.dailyChangePercent ?? 0) >= 0;
  // Authentic TradingView ripe red (#f23645) and pine green (#089981)
  const strokeColor = isPositive ? '#089981' : '#f23645';
  const gradientId = `tv-area-grad-${selectedSymbol}-${isPositive ? 'up' : 'down'}`;

  // Compute min, max, and exact tick steps for clean right-aligned Y-axis price scale
  const { yMin, yMax, latestClose, yTicks } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 0, yMax: 100, latestClose: 0, yTicks: [] };
    const values = chartData.map((d) => d.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || min * 0.05 || 100;
    const padding = spread * 0.12;

    const rawMin = Math.max(0, min - padding);
    const rawMax = max + padding;

    // Generate ~6-7 clean ticks matching TradingView intervals
    const step = Math.round(spread / 6 / 100) * 100 || 50;
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
      latestClose: last,
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
        {/* 1. Header: 'Major indices›' (Clean, smaller title) */}
        <div className="flex items-center gap-1 mb-3 cursor-pointer group w-fit">
          <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
            Major indices
          </h3>
          <ChevronRight
            size={16}
            className="text-neutral-400 group-hover:text-white transition-colors translate-y-[0.5px]"
          />
        </div>

        {/* 2. Selectable Indices Row (1-to-1 with TradingView reference image) */}
        <div className="flex items-center justify-between gap-3 relative">
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar select-none flex-1"
          >
            {indexList.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              const isDailyPos = item.dailyChangePercent >= 0;

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(item.symbol as SelectedIndexSymbol)}
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

                  {/* Right Index Info Block */}
                  <div className="flex flex-col justify-center">
                    {/* Top Line: Index Name + Amber D Tag + Dash */}
                    <div className="flex items-center gap-1 leading-none">
                      <span
                        className={`text-xs font-medium tracking-tight whitespace-nowrap ${
                          isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 ml-0.5">D</span>
                      <span className="text-neutral-500 text-xs ml-0.5">-</span>
                    </div>

                    {/* Bottom Line: Price Points + Daily Return % */}
                    <div className="flex items-center gap-1.5 mt-1 leading-none">
                      <span className="text-xs font-bold text-white tabular-nums">
                        {item.points.toLocaleString('en-US', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}
                      </span>
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight">
                        POINT
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ml-1 ${
                          isDailyPos ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isDailyPos ? '+' : ''}
                        {item.dailyChangePercent.toFixed(2)}%
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
            title="Next indices"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 3. TradingView-Style Clean Area Chart Canvas */}
        <div className="relative mt-2 w-full min-w-0 h-[380px] sm:h-[420px] bg-black overflow-hidden pt-2">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              Loading market index data...
            </div>
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

                {/* Right Y-Axis (TradingView Price Scale) */}
                <YAxis
                  orientation="right"
                  domain={[yMin, yMax]}
                  ticks={yTicks.length > 0 ? yTicks : undefined}
                  width={64}
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                  tickFormatter={(val: number) =>
                    val.toLocaleString('en-US', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })
                  }
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
                    if (parts.length === 3) {
                      const day = parts[2];
                      const monthNames = [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                      ];
                      const mIdx = parseInt(parts[1], 10) - 1;
                      if (day === '01') return monthNames[mIdx];
                      return `${parseInt(day, 10)}`;
                    }
                    return dateStr;
                  }}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />

                {/* Horizontal Latest Price Guideline */}
                {latestClose > 0 && (
                  <ReferenceLine
                    y={latestClose}
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
                    const isPtPos = (data.changePercent ?? 0) >= 0;

                    return (
                      <div className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1 z-50">
                        <div className="text-neutral-400 font-medium pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span>{data.date}</span>
                          <span className="font-semibold text-neutral-200">{activeIndex?.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-neutral-400">Close:</span>
                          <span className="font-bold text-white tabular-nums text-sm">
                            {Number(data.close).toLocaleString('en-US', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}{' '}
                            <span className="text-[10px] text-neutral-400">POINT</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-neutral-400">Daily Change:</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isPtPos ? 'text-profit-num' : 'text-loss-num'
                            }`}
                          >
                            {isPtPos ? '+' : ''}
                            {Number(data.change).toFixed(2)} ({isPtPos ? '+' : ''}
                            {Number(data.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                        {data.open && (
                          <div className="flex items-center justify-between gap-4 text-neutral-500 text-[11px] pt-1 border-t border-white/5">
                            <span>O: {Number(data.open).toFixed(1)}</span>
                            <span>H: {Number(data.high).toFixed(1)}</span>
                            <span>L: {Number(data.low).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Main Area Series (Linear interpolation for crisp TradingView styling) */}
                <Area
                  type="linear"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={1.8}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Solid TradingView-style Price Badge Pinned on the Right Axis */}
          {latestClose > 0 && (
            <div
              className="absolute right-0 pointer-events-none pr-1 flex items-center z-10"
              style={{
                top: `calc(16px + (100% - 36px) * ${Math.max(
                  0,
                  Math.min(1, (yMax - latestClose) / (yMax - yMin || 1))
                )})`,
                transform: 'translateY(-50%)',
              }}
            >
              <div
                className="px-1.5 py-0.5 rounded-[2px] text-[10px] sm:text-[11px] font-bold text-white shadow-lg tabular-nums tracking-tight"
                style={{ backgroundColor: strokeColor }}
              >
                {latestClose.toLocaleString('en-US', {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';

interface IndicatorVisualizerChartProps {
  readonly indicatorId: string;
  readonly locale: 'en' | 'ar';
}

interface PriceBar {
  readonly id: number;
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly rsi: number;
  readonly note?: string;
  readonly signal?: 'buy' | 'sell' | 'divergence';
}

const SAMPLE_DATA: readonly PriceBar[] = [
  { id: 1, date: 'May 02', open: 68.5, high: 69.2, low: 67.8, close: 68.0, rsi: 48 },
  { id: 2, date: 'May 05', open: 68.0, high: 68.4, low: 66.5, close: 66.8, rsi: 42 },
  { id: 3, date: 'May 06', open: 66.8, high: 67.0, low: 64.2, close: 64.5, rsi: 35 },
  { id: 4, date: 'May 07', open: 64.5, high: 65.0, low: 62.0, close: 62.2, rsi: 26, note: 'Deep oversold panic' },
  { id: 5, date: 'May 08', open: 62.2, high: 63.8, low: 61.5, close: 63.5, rsi: 29 },
  { id: 6, date: 'May 09', open: 63.5, high: 65.5, low: 63.0, close: 65.2, rsi: 36, signal: 'buy', note: 'BUY: Cross > 30' },
  { id: 7, date: 'May 12', open: 65.2, high: 67.0, low: 64.8, close: 66.8, rsi: 44 },
  { id: 8, date: 'May 13', open: 66.8, high: 68.5, low: 66.2, close: 68.0, rsi: 49 },
  { id: 9, date: 'May 14', open: 68.0, high: 70.2, low: 67.9, close: 69.8, rsi: 55, note: 'Cross > 50 Bull Regime' },
  { id: 10, date: 'May 15', open: 69.8, high: 71.5, low: 69.4, close: 71.2, rsi: 61 },
  { id: 11, date: 'May 16', open: 71.2, high: 73.0, low: 70.8, close: 72.8, rsi: 67 },
  { id: 12, date: 'May 19', open: 72.8, high: 75.5, low: 72.5, close: 75.0, rsi: 74, note: 'Overbought (> 70)' },
  { id: 13, date: 'May 20', open: 75.0, high: 77.2, low: 74.5, close: 76.8, rsi: 78, note: 'Peak Momentum 78' },
  { id: 14, date: 'May 21', open: 76.8, high: 76.9, low: 73.8, close: 74.2, rsi: 68, signal: 'sell', note: 'EXIT: Cross < 70' },
  { id: 15, date: 'May 22', open: 74.2, high: 75.0, low: 72.5, close: 73.0, rsi: 60 },
  { id: 16, date: 'May 23', open: 73.0, high: 74.2, low: 72.0, close: 73.8, rsi: 63 },
  { id: 17, date: 'May 26', open: 73.8, high: 77.8, low: 73.5, close: 77.5, rsi: 67, signal: 'divergence', note: 'Bearish Divergence' },
  { id: 18, date: 'May 27', open: 77.5, high: 77.6, low: 74.0, close: 74.5, rsi: 52 },
];

export default function IndicatorVisualizerChart({ indicatorId, locale }: IndicatorVisualizerChartProps) {
  const isAr = locale === 'ar';
  const isRsi = indicatorId.toLowerCase().includes('rsi') || indicatorId === 'psi' || indicatorId === 'typhon-rsi';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(12);

  const activeBar = hoveredIndex !== null ? SAMPLE_DATA[hoveredIndex] : SAMPLE_DATA[SAMPLE_DATA.length - 1];

  // SVG Chart Dimensions
  const svgWidth = 560;
  const priceHeight = 120;
  const spacerHeight = 16;
  const rsiHeight = 130;
  const totalHeight = priceHeight + spacerHeight + rsiHeight;
  const padLeft = 46;
  const padRight = 16;
  const plotWidth = svgWidth - padLeft - padRight;

  // Price Scale Calculations
  const minPrice = 60.0;
  const maxPrice = 80.0;
  const priceY = (p: number) => {
    return priceHeight - ((p - minPrice) / (maxPrice - minPrice)) * (priceHeight - 16) - 8;
  };

  // RSI Scale Calculations
  const rsiTop = priceHeight + spacerHeight;
  const rsiY = (r: number) => {
    return rsiTop + (rsiHeight - 20) - (r / 100) * (rsiHeight - 20);
  };

  const barX = (idx: number) => {
    return padLeft + (idx / (SAMPLE_DATA.length - 1)) * plotWidth;
  };

  // Generate RSI Path
  const rsiPoints = SAMPLE_DATA.map((d, i) => `${barX(i)},${rsiY(d.rsi)}`).join(' ');

  return (
    <div className="w-full flex flex-col rounded-xl border border-white/10 bg-black overflow-hidden font-sans select-none">
      {/* Top Bar: Live Inspector Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.08] bg-white/[0.02] text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-blue animate-pulse" />
          <span className="font-semibold text-white text-[11px] uppercase tracking-wider">
            {isRsi ? (isAr ? 'محاكي مؤشر RSI المتزامن' : 'Synchronized RSI Visualizer') : (isAr ? 'هيكل الشموع السعرية' : 'OHLC Candlestick Engine')}
          </span>
          <span className="text-[10px] text-plt-muted font-normal">
            ({activeBar.date})
          </span>
        </div>
        <div className="flex items-center gap-3 tabular-nums text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-white/40">{isAr ? 'الإغلاق:' : 'Close:'}</span>
            <span className="font-bold text-white">{activeBar.close.toFixed(2)} EGP</span>
          </div>
          {isRsi && (
            <div className="flex items-center gap-1">
              <span className="text-white/40">RSI(14):</span>
              <span
                className={`font-bold ${
                  activeBar.rsi >= 70
                    ? 'text-plt-risk'
                    : activeBar.rsi <= 30
                    ? 'text-plt-profit'
                    : 'text-brand-blue'
                }`}
              >
                {activeBar.rsi.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main SVG Plotting Area */}
      <div className="relative w-full p-2 bg-black">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Overbought Red Wash */}
            <linearGradient id="overboughtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
            </linearGradient>
            {/* Oversold Green Wash */}
            <linearGradient id="oversoldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.22" />
            </linearGradient>
            {/* RSI Line Glow */}
            <linearGradient id="rsiLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {/* ================= 1. PANE 1: PRICE CANDLESTICKS ================= */}
          {/* Price Gridlines */}
          <line x1={padLeft} y1={priceY(75)} x2={svgWidth - padRight} y2={priceY(75)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <line x1={padLeft} y1={priceY(70)} x2={svgWidth - padRight} y2={priceY(70)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <line x1={padLeft} y1={priceY(65)} x2={svgWidth - padRight} y2={priceY(65)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

          {/* Price Axis Labels */}
          <text x={padLeft - 6} y={priceY(75) + 3} textAnchor="end" className="text-[9px] fill-white/40 tabular-nums">75.0</text>
          <text x={padLeft - 6} y={priceY(70) + 3} textAnchor="end" className="text-[9px] fill-white/40 tabular-nums">70.0</text>
          <text x={padLeft - 6} y={priceY(65) + 3} textAnchor="end" className="text-[9px] fill-white/40 tabular-nums">65.0</text>

          {/* Candlesticks */}
          {SAMPLE_DATA.map((bar, i) => {
            const x = barX(i);
            const isBull = bar.close >= bar.open;
            const topBody = priceY(Math.max(bar.open, bar.close));
            const bottomBody = priceY(Math.min(bar.open, bar.close));
            const bodyHeight = Math.max(2.5, bottomBody - topBody);
            const highY = priceY(bar.high);
            const lowY = priceY(bar.low);
            const color = isBull ? '#10b981' : '#ef4444';

            return (
              <g
                key={bar.id}
                onMouseEnter={() => setHoveredIndex(i)}
                className="cursor-pointer"
              >
                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.2" />
                {/* Body */}
                <rect
                  x={x - 4}
                  y={topBody}
                  width="8"
                  height={bodyHeight}
                  fill={isBull ? color : color}
                  stroke={color}
                  strokeWidth="1"
                  rx="1"
                />
              </g>
            );
          })}

          {/* Price Pane Label */}
          <text x={padLeft + 4} y="14" className="text-[10px] font-semibold fill-white/70 tracking-wide uppercase">
            {isAr ? 'حركة السعر (EGP)' : 'Price Action (COMI)'}
          </text>

          {/* ================= 2. PANE DIVIDER ================= */}
          <line
            x1={padLeft}
            y1={priceHeight + spacerHeight / 2}
            x2={svgWidth - padRight}
            y2={priceHeight + spacerHeight / 2}
            stroke="rgba(255,255,255,0.14)"
          />

          {/* ================= 3. PANE 2: RSI OSCILLATOR ================= */}
          {/* Overbought Band (≥ 70) */}
          <rect
            x={padLeft}
            y={rsiY(100)}
            width={plotWidth}
            height={rsiY(70) - rsiY(100)}
            fill="url(#overboughtGradient)"
          />
          <line
            x1={padLeft}
            y1={rsiY(70)}
            x2={svgWidth - padRight}
            y2={rsiY(70)}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4 3"
            strokeOpacity="0.8"
          />
          <text x={padLeft - 6} y={rsiY(70) + 3} textAnchor="end" className="text-[9px] font-bold fill-red-400 tabular-nums">70</text>
          <text x={svgWidth - padRight - 4} y={rsiY(70) - 4} textAnchor="end" className="text-[8px] font-semibold fill-red-400 uppercase tracking-wider">
            {isAr ? 'ذروة الشراء (70)' : 'Overbought (70)'}
          </text>

          {/* Centerline (50) */}
          <line
            x1={padLeft}
            y1={rsiY(50)}
            x2={svgWidth - padRight}
            y2={rsiY(50)}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <text x={padLeft - 6} y={rsiY(50) + 3} textAnchor="end" className="text-[9px] fill-white/50 tabular-nums">50</text>

          {/* Oversold Band (≤ 30) */}
          <rect
            x={padLeft}
            y={rsiY(30)}
            width={plotWidth}
            height={rsiY(0) - rsiY(30)}
            fill="url(#oversoldGradient)"
          />
          <line
            x1={padLeft}
            y1={rsiY(30)}
            x2={svgWidth - padRight}
            y2={rsiY(30)}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="4 3"
            strokeOpacity="0.8"
          />
          <text x={padLeft - 6} y={rsiY(30) + 3} textAnchor="end" className="text-[9px] font-bold fill-emerald-400 tabular-nums">30</text>
          <text x={svgWidth - padRight - 4} y={rsiY(30) + 10} textAnchor="end" className="text-[8px] font-semibold fill-emerald-400 uppercase tracking-wider">
            {isAr ? 'ذروة البيع (30)' : 'Oversold (30)'}
          </text>

          {/* RSI Curve */}
          <polyline
            points={rsiPoints}
            fill="none"
            stroke="url(#rsiLineGradient)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Key Signal Pins */}
          {/* 1. Buy Signal Pin at bar index 5 */}
          <g>
            <circle cx={barX(5)} cy={rsiY(SAMPLE_DATA[5].rsi)} r="5" fill="#10b981" className="animate-ping opacity-75" />
            <circle cx={barX(5)} cy={rsiY(SAMPLE_DATA[5].rsi)} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <rect x={barX(5) - 34} y={rsiY(SAMPLE_DATA[5].rsi) - 22} width="68" height="15" rx="3" fill="#10b981" />
            <text x={barX(5)} y={rsiY(SAMPLE_DATA[5].rsi) - 11} textAnchor="middle" className="text-[8px] font-bold fill-black uppercase tracking-tight">
              BUY: CROSS &gt; 30
            </text>
          </g>

          {/* 2. Sell Signal Pin at bar index 13 */}
          <g>
            <circle cx={barX(13)} cy={rsiY(SAMPLE_DATA[13].rsi)} r="5" fill="#ef4444" className="animate-ping opacity-75" />
            <circle cx={barX(13)} cy={rsiY(SAMPLE_DATA[13].rsi)} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <rect x={barX(13) - 34} y={rsiY(SAMPLE_DATA[13].rsi) + 9} width="68" height="15" rx="3" fill="#ef4444" />
            <text x={barX(13)} y={rsiY(SAMPLE_DATA[13].rsi) + 20} textAnchor="middle" className="text-[8px] font-bold fill-white uppercase tracking-tight">
              EXIT: CROSS &lt; 70
            </text>
          </g>

          {/* 3. Bearish Divergence Line between peak 12 and peak 16 */}
          <line
            x1={barX(12)}
            y1={rsiY(SAMPLE_DATA[12].rsi)}
            x2={barX(16)}
            y2={rsiY(SAMPLE_DATA[16].rsi)}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <text x={(barX(12) + barX(16)) / 2} y={rsiY(SAMPLE_DATA[12].rsi) - 8} textAnchor="middle" className="text-[7.5px] font-bold fill-amber-300">
            {isAr ? 'انفراج سلبي' : 'BEARISH DIVERGENCE'}
          </text>

          {/* Active Hover Crosshair Line */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={barX(hoveredIndex)}
                y1={0}
                x2={barX(hoveredIndex)}
                y2={totalHeight}
                stroke="rgba(255,255,255,0.4)"
                strokeDasharray="2 2"
              />
              <circle
                cx={barX(hoveredIndex)}
                cy={priceY(SAMPLE_DATA[hoveredIndex].close)}
                r="3.5"
                fill="#ffffff"
              />
              <circle
                cx={barX(hoveredIndex)}
                cy={rsiY(SAMPLE_DATA[hoveredIndex].rsi)}
                r="3.5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Footer Callout Note */}
      {activeBar.note && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/[0.06] bg-white/[0.03] text-[10px] text-neutral-300">
          <span className="font-semibold text-brand-blue">{isAr ? 'ملاحظة تعليمية:' : 'Setup Note:'}</span>
          <span className="truncate">{activeBar.note}</span>
        </div>
      )}
    </div>
  );
}

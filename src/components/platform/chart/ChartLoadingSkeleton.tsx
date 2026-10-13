'use client';

import React from 'react';

interface ChartLoadingSkeletonProps {
  isLoading: boolean;
  displaySymbol: string;
}

const CANDLE_HEIGHTS = [
  45, 62, 55, 78, 50, 70, 60, 88, 45, 74, 82, 60, 72, 54, 86, 64, 48, 76, 62, 94, 55, 70, 46, 80, 60, 84, 50, 68, 76, 58
];

export default function ChartLoadingSkeleton({ isLoading, displaySymbol }: ChartLoadingSkeletonProps) {
  if (!isLoading) return null;

  const label = `Updating ${displaySymbol} chart`;

  return (
    <div
      className="absolute inset-0 z-30 flex select-none flex-col justify-between overflow-hidden bg-black/85 backdrop-blur-[2px] transition-opacity duration-200"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Top Status Pill */}
      <div className="p-4 flex items-center justify-start pointer-events-none">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-white/80 font-sans animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 animate-ping" />
          <span>{label}…</span>
        </div>
      </div>

      {/* Grid Lines */}
      <div aria-hidden="true" className="absolute inset-x-6 top-14 bottom-12 flex flex-col justify-between opacity-40 pointer-events-none">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-px w-full bg-white/[0.06]" />
        ))}
      </div>

      {/* Candlestick Shimmer Silhouettes */}
      <div aria-hidden="true" className="absolute bottom-8 left-8 right-12 flex h-3/5 items-end gap-1 px-4 opacity-30 pointer-events-none">
        {CANDLE_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className="flex-1 bg-white/[0.20] rounded-xs animate-pulse"
            style={{
              height: `${height}%`,
              animationDelay: `${(index % 6) * 150}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'All';

interface PerformanceChartToolbarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  className?: string;
}

const TIMEFRAMES: Timeframe[] = ['1M', '3M', '6M', '1Y', 'All'];

export default function PerformanceChartToolbar({
  timeframe,
  onTimeframeChange,
  className = '',
}: PerformanceChartToolbarProps) {
  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      <div className="seg-control">
        {TIMEFRAMES.map((tf) => {
          const isSelected = timeframe === tf;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
}

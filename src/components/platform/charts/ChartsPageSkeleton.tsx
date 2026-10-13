import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function ChartsPageSkeleton() {
  return (
    <div className="flex-1 h-full w-full flex flex-row bg-black text-white overflow-hidden pb-[calc(56px+var(--ticknal-safe-area-bottom))] md:pb-0 select-none">
      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 border-r border-white/[0.08]">
        {/* Top Control Bar */}
        <div className="h-12 border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Ticker Selector */}
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="h-6 w-6 shrink-0" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20 hidden sm:block" />
            </div>

            {/* Price & Change */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          {/* Timeframe & Strategy Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Timeframe Pills */}
            <div className="hidden sm:flex items-center gap-1">
              {['15m', '1h', 'D', 'W'].map((tf) => (
                <Skeleton key={tf} className="h-7 w-8 rounded-sm" />
              ))}
            </div>

            {/* Strategy Badge */}
            <Skeleton className="h-7 w-20 rounded-md" />

            {/* Indicators Button */}
            <Skeleton className="h-7 w-16 rounded-md hidden md:block" />
          </div>
        </div>

        {/* Main Chart Canvas Area */}
        <div className="flex-1 relative flex flex-col justify-between p-6 overflow-hidden">
          {/* Subtle Horizontal Grid Hairlines */}
          <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 pointer-events-none opacity-40">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-px w-full bg-white/[0.06]" />
            ))}
          </div>

          {/* Candlestick & Volume Shimmer Silhouettes */}
          <div className="absolute bottom-10 left-6 right-16 flex items-end gap-1.5 h-1/2 opacity-25 pointer-events-none">
            {[40, 55, 48, 65, 52, 70, 60, 85, 62, 78, 90, 72, 80, 65, 88, 75, 58, 82, 68, 92].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-white/[0.16] rounded-xs"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          {/* Y-Axis Price Labels Placeholder on Right */}
          <div className="absolute top-8 bottom-8 right-2 w-12 flex flex-col justify-between items-end pointer-events-none opacity-40">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-2.5 w-10" />
            ))}
          </div>

          {/* Time Scale Bar Placeholder at Bottom */}
          <div className="absolute bottom-0 left-0 right-14 h-6 border-t border-white/[0.06] flex items-center justify-between px-6 pointer-events-none opacity-40">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-2 w-8" />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Watchlist Rail Skeleton */}
      <div className="hidden xl:flex w-72 flex-col h-full bg-black shrink-0 border-l border-white/[0.08]">
        <div className="h-12 border-b border-white/[0.08] px-4 flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton variant="circular" className="h-5 w-5" />
        </div>
        <div className="p-3 space-y-2.5 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-2 border border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <Skeleton variant="circular" className="h-6 w-6" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto" />
                <Skeleton className="h-2.5 w-10 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

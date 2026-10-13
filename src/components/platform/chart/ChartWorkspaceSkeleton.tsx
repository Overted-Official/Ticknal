import React from 'react';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';

export default function ChartWorkspaceSkeleton() {
  return (
    <div className="flex-1 h-full w-full flex flex-row bg-black text-white overflow-hidden pb-[calc(56px+var(--ticknal-safe-area-bottom))] md:pb-0 select-none font-sans">
      {/* Left: Main Chart Canvas & Toolbars */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Top Header Toolbar Skeleton */}
        <div className="h-10 shrink-0 border-b border-white/[0.06] bg-black px-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 rounded-md bg-white/[0.08] animate-pulse" />
            <div className="h-4 w-14 rounded-xs bg-white/[0.04] animate-pulse" />
            <div className="hidden sm:flex items-center gap-1 border-l border-white/[0.08] pl-2 ml-1">
              <div className="h-5 w-8 rounded-xs bg-white/[0.06] animate-pulse" />
              <div className="h-5 w-8 rounded-xs bg-white/[0.04] animate-pulse" />
              <div className="h-5 w-8 rounded-xs bg-white/[0.04] animate-pulse" />
            </div>
            <div className="hidden md:flex items-center gap-1.5 border-l border-white/[0.08] pl-2 ml-1">
              <div className="h-6 w-24 rounded-md bg-white/[0.06] animate-pulse" />
              <div className="h-6 w-20 rounded-md bg-white/[0.04] animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 rounded-md bg-white/[0.06] animate-pulse" />
            <div className="h-6 w-20 rounded-md bg-brand-blue/30 animate-pulse" />
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="flex-1 relative w-full h-full min-h-0 bg-black overflow-hidden">
          <ChartLoadingSkeleton isLoading={true} displaySymbol="EGX" />
        </div>

        {/* Bottom Toolbar Skeleton */}
        <div className="h-[28px] shrink-0 w-full bg-black border-t border-white/[0.06] flex items-center justify-between px-3">
          <div className="flex items-center gap-1">
            <div className="h-4 w-7 rounded-xs bg-white/10 animate-pulse" />
            <div className="h-4 w-7 rounded-xs bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-7 rounded-xs bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-7 rounded-xs bg-white/[0.04] animate-pulse" />
          </div>
          <div className="hidden sm:block h-3 w-16 rounded-xs bg-white/[0.05] animate-pulse" />
        </div>
      </div>

      {/* Right: Watchlist Sidebar Skeleton */}
      <div className="hidden lg:flex flex-col h-full shrink-0 w-72 xl:w-80 border-l border-white/[0.06] bg-black">
        {/* Sidebar Header & Search */}
        <div className="p-3 border-b border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 rounded-xs bg-white/[0.08] animate-pulse" />
            <div className="h-4 w-12 rounded-xs bg-white/[0.04] animate-pulse" />
          </div>
          <div className="h-7 w-full rounded-md bg-white/[0.04] border border-white/[0.06] animate-pulse" />
        </div>

        {/* Watchlist Item Rows Skeleton */}
        <div className="flex-1 overflow-hidden divide-y divide-white/[0.04] p-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="p-2.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/[0.06] shrink-0 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-14 rounded-xs bg-white/[0.08] animate-pulse" />
                  <div className="h-2 w-24 rounded-xs bg-white/[0.04] animate-pulse" />
                </div>
              </div>
              <div className="space-y-1 text-right shrink-0">
                <div className="h-3 w-12 rounded-xs bg-white/[0.08] ml-auto animate-pulse" />
                <div className="h-2.5 w-14 rounded-xs bg-white/[0.04] ml-auto animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

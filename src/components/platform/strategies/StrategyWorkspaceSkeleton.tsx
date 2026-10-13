import React from 'react';

export default function StrategyWorkspaceSkeleton() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-black text-white overflow-hidden pb-[calc(64px+max(var(--ticknal-safe-area-bottom),0.5rem))] md:pb-0 select-none font-sans">
      {/* Top Header & Toolbar Skeleton */}
      <div className="border-b border-white/[0.06] bg-black px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-4 w-12 rounded-xs bg-white/[0.04] animate-pulse" />
          <span className="text-white/20">/</span>
          <div className="h-7 w-36 sm:w-44 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="hidden sm:flex items-center gap-1 border-l border-white/[0.08] pl-3 ml-1">
            <div className="h-6 w-16 rounded-md bg-white/[0.05] animate-pulse" />
            <div className="h-6 w-16 rounded-md bg-white/[0.04] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-20 sm:w-24 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-7 w-24 sm:w-28 rounded-lg bg-brand-blue/30 animate-pulse" />
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 space-y-4">
        {/* Flow Canvas Skeleton */}
        <div className="flex-1 border border-white/[0.06] rounded-xl bg-white/[0.01] p-4 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <div className="space-y-1">
              <div className="h-4 w-32 rounded-xs bg-white/[0.08] animate-pulse" />
              <div className="h-2.5 w-48 rounded-xs bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-6 w-20 rounded-md bg-white/[0.06] animate-pulse" />
          </div>

          {/* Node Cards Row */}
          <div className="flex-1 flex flex-wrap items-center justify-center gap-4 py-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-56 sm:w-64 p-3.5 border border-white/[0.08] rounded-xl bg-black space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-white/[0.08] animate-pulse" />
                    <div className="h-3 w-20 rounded-xs bg-white/[0.08] animate-pulse" />
                  </div>
                  <div className="h-3 w-8 rounded-xs bg-white/[0.04] animate-pulse" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 w-full rounded-xs bg-white/[0.05] animate-pulse" />
                  <div className="h-2.5 w-3/4 rounded-xs bg-white/[0.04] animate-pulse" />
                </div>
                <div className="h-6 w-full rounded-md bg-white/[0.04] border border-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs text-white/40">
            <div className="h-3 w-24 rounded-xs bg-white/[0.04] animate-pulse" />
            <div className="h-3 w-16 rounded-xs bg-white/[0.04] animate-pulse" />
          </div>
        </div>

        {/* Results Deck KPI Skeleton */}
        <div className="h-24 sm:h-28 shrink-0 border border-white/[0.06] rounded-xl bg-black p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-28 rounded-xs bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-20 rounded-xs bg-white/[0.04] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-14 rounded-xs bg-white/[0.04] animate-pulse" />
                <div className="h-4 w-20 rounded-xs bg-white/[0.08] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

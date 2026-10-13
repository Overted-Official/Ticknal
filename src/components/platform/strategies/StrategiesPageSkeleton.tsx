import React from 'react';
import Skeleton from '@/components/ui/Skeleton';

export default function StrategiesPageSkeleton() {
  return (
    <div className="flex-1 h-full w-full flex flex-col bg-black text-white overflow-hidden pb-[calc(56px+var(--ticknal-safe-area-bottom))] md:pb-0 select-none">
      {/* Top Toolbar Skeleton */}
      <div className="h-12 border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
      </div>

      {/* Main Flow Canvas & Visualizer Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Node Catalog Rail on Desktop */}
        <div className="hidden lg:flex w-64 border-r border-white/[0.08] flex-col p-4 space-y-3 shrink-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full rounded-md" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-2.5 border border-white/[0.06] flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
          {/* Subtle Grid Dots / Matrix Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-full h-full bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:20px_20px]" />
          </div>

          {/* Simulated Flow Node Placeholders */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-8 my-auto">
            <div className="w-48 border border-white/[0.12] p-4 space-y-2.5 shadow-2xl bg-black">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:block h-px w-12 bg-white/[0.18]" />
            <div className="w-56 border border-white/[0.12] p-4 space-y-2.5 shadow-2xl bg-black">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>

          {/* Bottom Results Deck Placeholder */}
          <div className="relative z-10 border border-white/[0.08] p-4 flex items-center justify-between shrink-0 bg-black">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-1 hidden sm:block">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

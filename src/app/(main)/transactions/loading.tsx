import React from 'react';

export default function TransactionsLoading() {
  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-black text-white select-none font-sans">
      {/* Header Skeleton */}
      <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 rounded-xs bg-white/[0.04] animate-pulse" />
          <span className="text-white/20">/</span>
          <div className="h-5 w-24 rounded-xs bg-white/[0.08] animate-pulse" />
        </div>
        <div className="h-7 w-20 rounded-md bg-white/[0.06] animate-pulse" />
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* KPI Rail Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-white/[0.08] rounded-xl bg-black space-y-2">
              <div className="h-3 w-20 rounded-xs bg-white/[0.05] animate-pulse" />
              <div className="h-6 w-28 rounded-xs bg-white/[0.08] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Ledger Table Skeleton */}
        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-black">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="h-4 w-28 rounded-xs bg-white/[0.08] animate-pulse" />
            <div className="h-6 w-36 rounded-md bg-white/[0.04] animate-pulse" />
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-16 rounded-xs bg-white/[0.08] animate-pulse" />
                    <div className="h-2.5 w-24 rounded-xs bg-white/[0.04] animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3.5 w-16 rounded-xs bg-white/[0.08] ml-auto animate-pulse" />
                  <div className="h-2.5 w-12 rounded-xs bg-white/[0.04] ml-auto animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

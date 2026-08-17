import React from 'react';

export default function BankAccountsSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse select-none">
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-plt-orange/40" />
            <div className="h-6 w-48 bg-white/[0.08] rounded-md" />
          </div>
          <div className="h-3.5 w-64 bg-white/[0.04] rounded-md mt-1" />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-44 bg-white/[0.06] rounded-lg border border-white/[0.09]" />
          <div className="h-8 w-28 bg-white/[0.04] rounded-lg border border-white/[0.09]" />
        </div>
      </div>

      {/* 2. KPIs Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-white/[0.09] rounded-xl bg-black/60 p-5 space-y-2">
            <div className="h-3 w-28 bg-white/[0.06] rounded" />
            <div className="h-7 w-36 bg-white/[0.1] rounded-md" />
            <div className="h-3 w-20 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>

      {/* 3. Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-white/[0.09] rounded-xl bg-black/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.08]" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-white/[0.08] rounded" />
                  <div className="h-3 w-16 bg-white/[0.04] rounded" />
                </div>
              </div>
              <div className="h-6 w-14 bg-white/[0.06] rounded-full" />
            </div>
            <div className="space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="h-3 w-20 bg-white/[0.04] rounded" />
              <div className="h-6 w-32 bg-white/[0.1] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Ledger Table Skeleton */}
      <div className="border border-white/[0.09] rounded-xl bg-black/60 p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="h-4 w-36 bg-white/[0.08] rounded" />
          <div className="h-3 w-20 bg-white/[0.04] rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-white/[0.02] rounded-lg border border-white/[0.04] flex items-center justify-between px-3">
              <div className="h-3 w-24 bg-white/[0.05] rounded" />
              <div className="h-3 w-32 bg-white/[0.05] rounded" />
              <div className="h-3 w-20 bg-white/[0.05] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

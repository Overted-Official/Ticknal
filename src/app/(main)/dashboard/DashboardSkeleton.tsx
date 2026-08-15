import React from 'react';

function MetricSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-5 animate-pulse">
      <div className="h-2.5 w-16 bg-white/[0.06] rounded mb-2"></div>
      <div className="h-6 w-24 bg-white/[0.1] rounded mb-1.5"></div>
      <div className="h-3 w-20 bg-white/[0.04] rounded"></div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-transparent text-white pb-8">
      {/* Top Header Banner */}
      <div className="border-b border-white/[0.06] px-6 py-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="animate-pulse">
            <div className="h-7 w-36 bg-white/[0.08] rounded-xl mb-2"></div>
            <div className="h-3 w-64 bg-white/[0.04] rounded-lg"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-white/[0.04] border border-white/[0.08] rounded-full animate-pulse"></div>
            <div className="h-8 w-28 bg-white/[0.04] border border-white/[0.08] rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Canvas: 24px outer padding (p-6), 8px widget gap (space-y-2) */}
      <div className="flex-1 p-6 space-y-3">
        {/* 1. Metric Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-1">
            <MetricSkeleton />
          </div>
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>

        {/* 2. Portfolio Stats Bar Skeleton */}
        <div className="glass-panel rounded-xl p-6 flex flex-col md:flex-row gap-4 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 md:px-5 first:pl-0 flex flex-col justify-center">
              <div className="h-2.5 w-16 bg-white/[0.06] rounded mb-2"></div>
              <div className="h-6 w-20 bg-white/[0.1] rounded"></div>
            </div>
          ))}
        </div>

        {/* 3. Analytics Charts */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="glass-panel rounded-xl p-6 animate-pulse">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-32 bg-white/[0.08] rounded"></div>
              <div className="h-3 w-20 bg-white/[0.04] rounded"></div>
            </div>
            <div style={{ height: 240 }} className="flex items-center justify-center">
              <div className="h-44 w-44 rounded-full border-8 border-white/[0.06]"></div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6 animate-pulse">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-36 bg-white/[0.08] rounded"></div>
              <div className="h-3 w-24 bg-white/[0.04] rounded"></div>
            </div>
            <div style={{ height: 240 }} className="flex items-end justify-between px-2 pb-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-8 bg-white/[0.06] rounded-t-lg" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Two-Column Grid */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="animate-pulse glass-panel rounded-xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-32 bg-white/[0.08] rounded"></div>
              <div className="h-3 w-16 bg-white/[0.04] rounded"></div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-white/[0.03] rounded-xl border border-white/[0.04]"></div>
              ))}
            </div>
          </section>

          <section className="animate-pulse glass-panel rounded-xl p-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-36 bg-white/[0.08] rounded"></div>
              <div className="h-3 w-20 bg-white/[0.04] rounded"></div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-white/[0.03] rounded-xl border border-white/[0.04]"></div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

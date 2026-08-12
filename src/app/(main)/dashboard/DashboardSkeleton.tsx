import React from 'react';

function MetricSkeleton() {
  return (
    <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3 animate-pulse">
      <div className="h-3 w-16 bg-tv-border rounded mb-2"></div>
      <div className="h-6 w-24 bg-tv-border/80 rounded mb-1"></div>
      <div className="h-3 w-20 bg-tv-border/50 rounded"></div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-tv-base text-tv-text">
      <div className="border-b border-tv-border px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-tv-border rounded mb-2"></div>
            <div className="h-3 w-64 bg-tv-border/50 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-tv-surface border border-tv-border rounded-tv-sm animate-pulse"></div>
            <div className="h-8 w-24 bg-tv-surface border border-tv-border rounded-tv-sm animate-pulse"></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <MetricSkeleton />
          </div>
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pt-4 md:grid-cols-2">
        <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-4 animate-pulse">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-32 bg-tv-border rounded"></div>
            <div className="h-3 w-20 bg-tv-border/50 rounded"></div>
          </div>
          <div style={{ height: 240 }} className="flex items-center justify-center">
            <div className="h-48 w-48 rounded-full bg-tv-border/30"></div>
          </div>
        </div>

        <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-4 animate-pulse">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-36 bg-tv-border rounded"></div>
            <div className="h-3 w-24 bg-tv-border/50 rounded"></div>
          </div>
          <div style={{ height: 240 }} className="flex items-end justify-between px-2 pb-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-8 bg-tv-border/40 rounded-t-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="animate-pulse">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-4 w-32 bg-tv-border rounded"></div>
            <div className="h-3 w-12 bg-tv-border/50 rounded"></div>
          </div>
          <div className="overflow-hidden rounded-tv-lg border border-tv-border">
            <div className="h-10 bg-tv-surface border-b border-tv-border"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-tv-base border-b border-tv-border/50"></div>
            ))}
          </div>
        </section>

        <section className="animate-pulse">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-4 w-36 bg-tv-border rounded"></div>
            <div className="h-3 w-20 bg-tv-border/50 rounded"></div>
          </div>
          <div className="overflow-hidden rounded-tv-lg border border-tv-border">
            <div className="h-10 bg-tv-surface border-b border-tv-border"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-tv-base border-b border-tv-border/50"></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import React from 'react';

const chartBarHeights = ['h-8', 'h-12', 'h-16', 'h-10', 'h-20', 'h-14'];

function MetricSkeleton() {
  return (
    <div className="card-shell animate-pulse">
      <div className="h-2 w-16 bg-plt-hover rounded-xl mb-2"></div>
      <div className="h-6 w-24 bg-plt-hover rounded-xl mb-2"></div>
      <div className="h-4 w-20 bg-plt-hover rounded-xl"></div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-transparent text-plt-text">
      {/* Top Header Banner */}
      <div className="app-page shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-plt-hover rounded-xl mb-2"></div>
            <div className="h-4 w-56 bg-plt-hover rounded-xl"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-plt-hover border border-plt-border rounded-xl animate-pulse"></div>
            <div className="h-8 w-28 bg-plt-hover border border-plt-border rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="app-page app-page-stack flex-1">
        {/* 1. Master Metric Strip Skeleton */}
        <div className="card-shell surface-flush divide-y md:divide-y-0 md:divide-x divide-plt-border-soft grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 overflow-hidden animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="metric-card flex flex-col justify-between">
              <div className="h-2 w-16 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-6 w-24 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-4 w-16 bg-plt-hover rounded-xl"></div>
            </div>
          ))}
        </div>

        {/* 2. Portfolio Stats Bar Skeleton */}
        <div className="card-shell surface-flush flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-plt-border-soft animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 p-2 flex flex-col justify-center">
              <div className="h-2 w-16 bg-plt-hover rounded-xl mb-2"></div>
              <div className="h-6 w-20 bg-plt-hover rounded-xl"></div>
            </div>
          ))}
        </div>

        {/* 3. Analytics Charts */}
        <div className="widget-grid grid-cols-1 lg:grid-cols-2">
          <div className="card-shell animate-pulse">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-32 bg-plt-hover rounded-xl"></div>
              <div className="h-4 w-20 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="flex h-60 items-center justify-center">
              <div className="h-44 w-44 rounded-full border-8 border-plt-border"></div>
            </div>
          </div>

          <div className="card-shell animate-pulse">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-36 bg-plt-hover rounded-xl"></div>
              <div className="h-4 w-24 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="flex h-60 items-end justify-between px-2 pb-2">
              {chartBarHeights.map((height) => (
                <div key={height} className={`w-8 bg-plt-hover rounded-xl ${height}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Two-Column Grid */}
        <div className="widget-grid grid-cols-1 xl:grid-cols-2">
          <section className="card-shell animate-pulse">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-32 bg-plt-hover rounded-xl"></div>
              <div className="h-4 w-16 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-plt-hover rounded-xl border border-plt-border-soft"></div>
              ))}
            </div>
          </section>

          <section className="card-shell animate-pulse">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-36 bg-plt-hover rounded-xl"></div>
              <div className="h-4 w-20 bg-plt-hover rounded-xl"></div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-plt-hover rounded-xl border border-plt-border-soft"></div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

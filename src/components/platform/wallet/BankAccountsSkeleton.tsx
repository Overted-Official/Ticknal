import React from 'react';

export default function BankAccountsSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse select-none">
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            <div className="h-6 w-48 bg-plt-hover rounded-xl" />
          </div>
          <div className="h-4 w-64 bg-plt-hover rounded-xl mt-2" />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-8 w-44 bg-plt-hover rounded-xl border border-plt-border" />
          <div className="h-8 w-28 bg-plt-hover rounded-xl border border-plt-border" />
        </div>
      </div>

      {/* 2. KPIs Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-shell space-y-2">
            <div className="h-4 w-28 bg-plt-hover rounded-xl" />
            <div className="h-8 w-36 bg-plt-hover rounded-xl" />
            <div className="h-4 w-20 bg-plt-hover rounded-xl" />
          </div>
        ))}
      </div>

      {/* 3. Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-shell space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-plt-hover" />
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-plt-hover rounded-xl" />
                  <div className="h-4 w-16 bg-plt-hover rounded-xl" />
                </div>
              </div>
              <div className="h-6 w-14 bg-plt-hover rounded-full" />
            </div>
            <div className="space-y-2 pt-2 border-t border-plt-border-soft">
              <div className="h-4 w-20 bg-plt-hover rounded-xl" />
              <div className="h-6 w-32 bg-plt-hover rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Ledger Table Skeleton */}
      <div className="card-shell space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-plt-border-soft">
          <div className="h-4 w-36 bg-plt-hover rounded-xl" />
          <div className="h-4 w-20 bg-plt-hover rounded-xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-plt-hover rounded-xl border border-plt-border-soft flex items-center justify-between px-4">
              <div className="h-4 w-24 bg-plt-hover rounded-xl" />
              <div className="h-4 w-32 bg-plt-hover rounded-xl" />
              <div className="h-4 w-20 bg-plt-hover rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

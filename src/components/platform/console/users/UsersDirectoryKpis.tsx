'use client';

import React from 'react';
import type { ConsoleUsersPageData } from '@/lib/server/console-queries';

interface UsersDirectoryKpisProps {
  kpis: ConsoleUsersPageData['kpis'];
}

export default function UsersDirectoryKpis({ kpis }: UsersDirectoryKpisProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {/* KPI 1: Total Registered Accounts */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Total Accounts
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Profiles
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {kpis.totalUsers.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Verified Accounts
          </span>
        </div>
      </div>

      {/* KPI 2: Monetized Subscribers */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Paying Subscribers
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {kpis.paidConversionRate}% Paid Rate
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {kpis.paidCount.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium leading-none">
            Active Passes
          </span>
        </div>
      </div>

      {/* KPI 3: Free Exploration Pipeline */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Free Members Pipeline
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-white/10 text-zinc-300 border border-white/10">
            Pipeline
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {kpis.freeCount.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Unmonetized
          </span>
        </div>
      </div>

      {/* KPI 4: Privileged Staff Seats */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Privileged Staff
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Security
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {kpis.adminCount}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Console Staff
          </span>
        </div>
      </div>
    </div>
  );
}

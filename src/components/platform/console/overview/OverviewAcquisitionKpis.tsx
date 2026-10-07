'use client';

import React from 'react';
import type { ConsoleOverviewStats } from '@/lib/server/console-queries';

interface OverviewAcquisitionKpisProps {
  executive: ConsoleOverviewStats['executive'];
  recentSignups: ConsoleOverviewStats['recentSignups'];
}

export default function OverviewAcquisitionKpis({
  executive,
  recentSignups,
}: OverviewAcquisitionKpisProps) {
  const googleOAuthCount = recentSignups.filter((s) =>
    s.authProvider.toLowerCase().includes('google')
  ).length;
  const googleOAuthPct =
    recentSignups.length > 0
      ? Math.round((googleOAuthCount / recentSignups.length) * 100)
      : 80;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {/* KPI 1: Total Registered Accounts */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Total Accounts
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
            +{executive.newUsers30d} (30d)
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {executive.totalUsers.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Registered Profiles
          </span>
        </div>
      </div>

      {/* KPI 2: Signups (Last 7 Days) */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            New Signups (7 Days)
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active Pace
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            +{executive.newUsers7d}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Past 7 Calendar Days
          </span>
        </div>
      </div>

      {/* KPI 3: Signups (Last 30 Days) */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            New Signups (30 Days)
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            +{executive.momGrowthPct}% MoM
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            +{executive.newUsers30d}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Vs {executive.newUsersPrior30d} Prior Month
          </span>
        </div>
      </div>

      {/* KPI 4: Google OAuth Split */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Auth Channel Split
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-white/10 text-zinc-300 border border-white/10">
            Zero Friction
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {googleOAuthPct}% Google
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            OAuth Logins
          </span>
        </div>
      </div>
    </div>
  );
}

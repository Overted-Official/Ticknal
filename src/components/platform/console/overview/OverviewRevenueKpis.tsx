'use client';

import React from 'react';
import type { ConsoleOverviewStats } from '@/lib/server/console-queries';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface OverviewRevenueKpisProps {
  executive: ConsoleOverviewStats['executive'];
}

export default function OverviewRevenueKpis({ executive }: OverviewRevenueKpisProps) {
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {/* KPI 1: MRR */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Monthly Recurring (MRR)
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            +{executive.momGrowthPct}% MoM
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {isPrivacy ? '••••••••' : `EGP ${executive.mrr.toLocaleString()}`}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            {isPrivacy ? '••••' : `EGP ${executive.arr.toLocaleString()} ARR`}
          </span>
        </div>
      </div>

      {/* KPI 2: Active Paying Seats */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Paying Subscribers
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {executive.paidConversionRate}% Paid Rate
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {executive.activePaidCount.toLocaleString()}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium leading-none">
            of {executive.totalUsers} registered
          </span>
        </div>
      </div>

      {/* KPI 3: Average Revenue Per User (ARPU) */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Average Revenue / User
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-white/10 text-zinc-300 border border-white/10">
            EGP {executive.arpuPaid} / Paid
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {isPrivacy ? '••••' : `EGP ${executive.arpu.toLocaleString()}`}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            Blended ARPU
          </span>
        </div>
      </div>

      {/* KPI 4: Annual Commitment Mix */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
            Annual Commitment Mix
          </span>
          <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {executive.activePaidCount > 0
              ? Math.round((executive.annualSeatsCount / executive.activePaidCount) * 100)
              : 0}
            % Locked
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {executive.annualSeatsCount} Annual Seats
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
            12-Mo Prepaid
          </span>
        </div>
      </div>
    </div>
  );
}

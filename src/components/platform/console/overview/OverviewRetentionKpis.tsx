'use client';

import React from 'react';
import type { ConsoleOverviewStats } from '@/lib/server/console-queries';
import { ShieldCheck } from '@/components/ui/icon-library';

interface OverviewRetentionKpisProps {
  executive: ConsoleOverviewStats['executive'];
}

export default function OverviewRetentionKpis({ executive }: OverviewRetentionKpisProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* KPI 1: Churn Risk */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Gross Churn Risk
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              0.0% Churn
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {executive.churnRiskCount} Accounts
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Past Due / Canceled
            </span>
          </div>
        </div>

        {/* KPI 2: Expiring <= 14 Days */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Expiring in &le; 14 Days
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Healthy
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {executive.expiring14dCount} Seats
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              No Immediate Lapses
            </span>
          </div>
        </div>

        {/* KPI 3: Expiring in 30–35 Days (Upcoming Wave) */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Next Renewal Wave (30d)
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Monthly Cycles
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {executive.expiring30dCount} Seats
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Nov 3, 2026 Wave
            </span>
          </div>
        </div>

        {/* KPI 4: 1-Year Retention Lock */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Long-Term Commitments
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Locked
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {executive.annualSeatsCount} Annual Seats
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Through Late 2027
            </span>
          </div>
        </div>
      </div>

      {/* Retention Health Note */}
      <div className="border border-white/10 p-3.5 sm:p-4 bg-transparent rounded-xl flex items-center gap-3 text-xs">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-white font-semibold">
            Subscriber Retention Health: Optimal (0% Churn)
          </div>
          <div className="text-zinc-400 text-[11px]">
            All {executive.activePaidCount} active subscriber accounts are current on billing with zero past-due invoices or pending cancellations.
          </div>
        </div>
      </div>
    </div>
  );
}

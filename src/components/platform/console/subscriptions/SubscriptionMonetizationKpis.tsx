'use client';

import React from 'react';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface SubscriptionMonetizationKpisProps {
  kpis: ConsoleSubscriptionsPageData['kpis'];
  tierSummary: ConsoleSubscriptionsPageData['tierSummary'];
}

export default function SubscriptionMonetizationKpis({
  kpis,
  tierSummary,
}: SubscriptionMonetizationKpisProps) {
  const { isPrivacy } = usePrivacyMode();

  return (
    <div className="space-y-4">
      {/* Crown KPI Rail */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        {/* KPI 1: MRR */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Monthly Recurring (MRR)
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Calc
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {isPrivacy ? '••••••••' : `EGP ${kpis.mrr.toLocaleString()}`}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              MRR
            </span>
          </div>
        </div>

        {/* KPI 2: ARR */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Annual Run-Rate
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ARR
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {isPrivacy ? '••••••••' : `EGP ${kpis.arr.toLocaleString()}`}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Annualized
            </span>
          </div>
        </div>

        {/* KPI 3: Paying Subscribers */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Paying Subscribers
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Seats
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {kpis.activePaidSeats}
            </span>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium leading-none">
              Paid Members
            </span>
          </div>
        </div>

        {/* KPI 4: Paid ARPU */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Paid ARPU
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-white/10 text-zinc-300 border border-white/10">
              / Seat
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {isPrivacy ? '••••' : `EGP ${kpis.arpuPaid.toLocaleString()}`}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Average Yield
            </span>
          </div>
        </div>

        {/* KPI 5: Annual Lock */}
        <div className="tv-kpi-card w-full col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Annual Lock Mix
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {kpis.annualMixPct}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {kpis.annualSeats} Seats
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              12-Mo Prepaid
            </span>
          </div>
        </div>
      </div>

      {/* Tier Revenue Allocation & Contribution Bar */}
      <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Commercial Tier Allocation & MRR Contribution
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live seat counts and monthly recurring revenue yield by customer subscription tier
            </p>
          </div>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            Total Paid Base: <span className="text-white font-medium">{kpis.activePaidSeats} subscribers</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {tierSummary.map((t) => {
            return (
              <div
                key={t.tier}
                className="border border-white/10 p-3 rounded-lg bg-black/40 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="font-semibold text-white">{t.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium tabular-nums">
                    {t.activeSeats} seats
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-white tabular-nums">
                    {isPrivacy ? '••••' : `EGP ${t.mrrContribution.toLocaleString()}`}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {t.tier === 'free' ? 'Funnel Pool' : `${t.revenueSharePct}% MRR`}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, t.revenueSharePct)}%`,
                      backgroundColor: t.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { ConsoleOverviewStats } from '@/lib/server/console-queries';
import { Layers, Bell, Smartphone, TrendingUp } from '@/components/ui/icon-library';

interface ProductUsagePanelProps {
  featureAdoption: ConsoleOverviewStats['featureAdoption'];
  totalUsers: number;
}

export default function ProductUsagePanel({
  featureAdoption,
  totalUsers,
}: ProductUsagePanelProps) {
  return (
    <div className="space-y-4">
      {/* Usage KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Feature 1: Portfolio Tracking */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
                Portfolio Tracking
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {featureAdoption.positionsUsersCount} Active Users
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {featureAdoption.positionsPct}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Hold Live Positions
            </span>
          </div>
        </div>

        {/* Feature 2: Strategy & Price Alerts */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
                Strategy Alerts Armed
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {featureAdoption.alertsUsersCount} Users
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {featureAdoption.alertsPct}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Custom Alert Rules
            </span>
          </div>
        </div>

        {/* Feature 3: Push Notification Delivery */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
                Instant Push Reach
              </span>
            </div>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {featureAdoption.pushUsersCount} Connected Devices
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {featureAdoption.pushPct}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Web & Mobile FCM
            </span>
          </div>
        </div>
      </div>

      {/* Feature Stickiness & Adoption Funnel Bar Card */}
      <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
        <div className="border-b border-white/10 pb-3">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Feature Stickiness & Adoption Funnel
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Percentage of active platform profiles using key core workflows
          </p>
        </div>

        <div className="space-y-4 pt-1">
          {/* Bar 1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">Portfolio Management</span>
              <span className="text-zinc-300 font-semibold tabular-nums">
                {featureAdoption.positionsPct}% ({featureAdoption.positionsUsersCount}/{totalUsers})
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, featureAdoption.positionsPct)}%` }}
              />
            </div>
          </div>

          {/* Bar 2 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">Instant Push Reach</span>
              <span className="text-zinc-300 font-semibold tabular-nums">
                {featureAdoption.pushPct}% ({featureAdoption.pushUsersCount}/{totalUsers})
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, featureAdoption.pushPct)}%` }}
              />
            </div>
          </div>

          {/* Bar 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">Signal & Ticker Alerts</span>
              <span className="text-zinc-300 font-semibold tabular-nums">
                {featureAdoption.alertsPct}% ({featureAdoption.alertsUsersCount}/{totalUsers})
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, featureAdoption.alertsPct)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 text-[11px] text-zinc-400 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            High portfolio adoption signals solid day-to-day utility and strong user retention.
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { PlanLimits, PlanFeatures } from '@/lib/server/plans-service';

interface PlanLimitsPillsProps {
  limits?: PlanLimits;
  planFeatures?: PlanFeatures;
}

export default function PlanLimitsPills({
  limits,
  planFeatures,
}: PlanLimitsPillsProps) {
  if (!limits) return null;

  return (
    <div className="space-y-2 pt-1 font-sans">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
        Entitlements & Usage Quotas
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 tabular-nums">
          {limits.chartsPerTab} charts / tab
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 tabular-nums">
          {limits.indicatorsPerChart} ind. / chart
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 tabular-nums">
          {(limits.historicalBars / 1000).toFixed(0)}K bars
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 tabular-nums">
          {limits.priceAlerts === -1 ? 'Unlimited' : limits.priceAlerts} alerts
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 tabular-nums">
          {limits.pushAlerts === -1 ? 'Unlimited push' : `${limits.pushAlerts} push`}
        </span>

        {planFeatures?.breakoutDetection && planFeatures.breakoutDetection !== 'none' && (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400">
            {planFeatures.breakoutDetection === 'multi_timeframe' ? 'Multi-TF Breakout' : 'Intraday Breakout'}
          </span>
        )}

        {planFeatures?.hydraIndicator && (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
            Hydra Engine
          </span>
        )}

        {planFeatures?.typhoonEngine && (
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-400">
            Typhoon Volume
          </span>
        )}

        {planFeatures?.cerberusConfluence && (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-400">
            Cerberus Model
          </span>
        )}
      </div>
    </div>
  );
}

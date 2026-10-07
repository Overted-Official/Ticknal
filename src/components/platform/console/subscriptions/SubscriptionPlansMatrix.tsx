'use client';

import React from 'react';
import { Check, Zap, Sparkles, Shield, Star } from '@/components/ui/icon-library';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';

interface SubscriptionPlansMatrixProps {
  tierSummary: ConsoleSubscriptionsPageData['tierSummary'];
}

export default function SubscriptionPlansMatrix({
  tierSummary,
}: SubscriptionPlansMatrixProps) {
  const getBadgeForTier = (tier: string) => {
    switch (tier) {
      case 'pro_monthly':
        return {
          label: 'Popular',
          class: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'pro_annual':
        return {
          label: 'Save 17%',
          class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'elite':
        return {
          label: 'Institutional',
          class: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      default:
        return {
          label: 'Base Tier',
          class: 'bg-white/10 text-zinc-300 border-white/10',
        };
    }
  };

  const getIconForTier = (tier: string) => {
    switch (tier) {
      case 'pro_monthly':
        return <Zap className="w-3.5 h-3.5 text-blue-400" />;
      case 'pro_annual':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
      case 'elite':
        return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Star className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tierSummary.map((t) => {
        const badge = getBadgeForTier(t.tier);
        const icon = getIconForTier(t.tier);

        return (
          <div
            key={t.tier}
            className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors"
          >
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {icon}
                  <span className="font-semibold text-white text-sm">{t.name}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.class}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Price & Billing */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
                    {t.tier === 'free' ? 'Free' : `EGP ${t.monthlyPriceEgp.toLocaleString()}`}
                  </span>
                  {t.tier !== 'free' && (
                    <span className="text-xs text-zinc-400">/ month</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {t.tier === 'pro_annual'
                    ? 'Billed EGP 2,990 annually'
                    : t.tier === 'free'
                    ? 'Forever free for registered accounts'
                    : 'Billed monthly recurring'}
                </p>
              </div>

              {/* Live Performance Strip */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-black/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Active Subscribers</span>
                  <span className="font-bold text-white tabular-nums">{t.activeSeats} seats</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">Monthly Yield</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    EGP {t.mrrContribution.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Feature Entitlements */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-medium text-zinc-300 block">
                  Included Entitlements:
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-400">
                  {t.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px]">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Tag */}
            <div className="pt-3 border-t border-white/5 text-[10px] text-zinc-500 text-center font-medium">
              Commercial Tier Code: <span className="text-zinc-400">{t.tier}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import React from 'react';
import { Settings, Users, Star, Zap, Sparkles, Shield } from '@/components/ui/icon-library';
import PlanLimitsPills from './PlanLimitsPills';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';

type PlanItem = ConsoleSubscriptionsPageData['tierSummary'][number];

interface PricingPlanCardProps {
  plan: PlanItem;
  onEdit: (plan: PlanItem) => void;
}

export default function PricingPlanCard({ plan, onEdit }: PricingPlanCardProps) {
  const getIcon = () => {
    switch (plan.tier) {
      case 'plus':
        return <Zap className="w-4 h-4 text-blue-400" />;
      case 'elite':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'vip':
        return <Shield className="w-4 h-4 text-purple-400" />;
      default:
        return <Star className="w-4 h-4 text-zinc-400" />;
    }
  };

  const isFree = plan.tier === 'free';
  const isVip = plan.tier === 'vip';

  return (
    <div className="border border-white/10 p-5 bg-transparent rounded-xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors font-sans select-none relative group">
      {/* Top Accent Line */}
      <div
        className="absolute top-0 inset-x-5 h-[2px] rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: plan.color }}
      />

      {/* Header Info */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getIcon()}
            <span className="font-semibold text-white text-sm truncate">{plan.name}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {plan.badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-white/[0.06] text-zinc-300 border-white/10">
                {plan.badge}
              </span>
            )}
            <button
              type="button"
              onClick={() => onEdit(plan)}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={`Edit ${plan.name} parameters`}
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

        {plan.description && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {plan.description}
          </p>
        )}

        {/* Pricing Numbers */}
        <div className="pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {isFree || isVip ? '0 EGP' : `${plan.monthlyPriceEgp} EGP`}
            </span>
            {!isFree && !isVip && (
              <span className="text-xs text-zinc-400 font-medium">/ month</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
            {isFree ? (
              <span>Forever free for registered accounts</span>
            ) : isVip ? (
              <span className="text-purple-400 font-medium">Complimentary access (0 EGP)</span>
            ) : (
              <>
                <span className="tabular-nums">
                  Billed {plan.annualPriceEgp} EGP/yr
                </span>
                {(plan.annualDiscountPct ?? 0) > 0 && (
                  <span className="text-emerald-400 font-semibold tabular-nums">
                    Save {plan.annualDiscountPct}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live Active Seats Pill */}
        <div className="p-2.5 rounded-lg border border-white/5 bg-black/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Users size={12} />
            <span className="text-[11px]">Active Members</span>
          </div>
          <span className="font-bold text-white tabular-nums">
            {plan.activeSeats} {plan.activeSeats === 1 ? 'seat' : 'seats'}
          </span>
        </div>

        {/* Entitlements & Engine Pills */}
        <PlanLimitsPills limits={plan.limits} planFeatures={plan.planFeatures} />
      </div>

      {/* Footer Action */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Commercial Tier
        </span>
        <button
          type="button"
          onClick={() => onEdit(plan)}
          className="text-xs font-semibold text-brand-blue hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer"
        >
          <span>Configure Plan</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}

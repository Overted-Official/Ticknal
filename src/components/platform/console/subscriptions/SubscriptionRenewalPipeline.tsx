'use client';

import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  User,
} from '@/components/ui/icon-library';
import { grantProAccessAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { SubscriptionItemEnriched, ConsoleUserRowItem } from '@/lib/server/console-queries';

interface SubscriptionRenewalPipelineProps {
  renewalPipeline: {
    expiring7d: SubscriptionItemEnriched[];
    expiring30d: SubscriptionItemEnriched[];
    churnRisk: SubscriptionItemEnriched[];
  };
  onSelectUser: (user: ConsoleUserRowItem) => void;
  onRefresh?: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function PipelineUserAvatar({ src, name }: { src: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-[9px] font-semibold text-zinc-300">
        {initials || <User className="w-3 h-3 text-zinc-400" />}
      </div>
    );
  }

  return (
    <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black">
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function SubscriptionRenewalPipeline({
  renewalPipeline,
  onSelectUser,
  onRefresh,
}: SubscriptionRenewalPipelineProps) {
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);

  const handleExtend = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setGrantingUserId(userId);
    try {
      await grantProAccessAction({
        targetUserId: userId,
        days: 30,
        tier: 'pro_monthly',
      });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to extend sub:', err);
    } finally {
      setGrantingUserId(null);
    }
  };

  const convertToUserRowItem = (sub: SubscriptionItemEnriched): ConsoleUserRowItem => {
    return {
      id: sub.userId,
      email: sub.email,
      fullName: sub.fullName,
      avatarUrl: sub.avatarUrl,
      role: sub.role || 'user',
      createdAt: sub.currentPeriodStart,
      updatedAt: sub.currentPeriodEnd,
      authProvider: 'Email/OAuth',
      positionsCount: sub.positionsCount,
      alertsCount: sub.alertsCount,
      pushDevicesCount: sub.pushDevicesCount,
      subscription: {
        tier: sub.tier,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        daysRemaining: sub.daysRemaining,
        provider: sub.provider,
      },
    };
  };

  const expiring7dMrr = renewalPipeline.expiring7d.reduce((s, r) => s + r.priceEgp, 0);
  const expiring30dMrr = renewalPipeline.expiring30d.reduce((s, r) => s + r.priceEgp, 0);
  const churnRiskMrr = renewalPipeline.churnRisk.reduce((s, r) => s + r.priceEgp, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Next 7 Days (Immediate Action) */}
      <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Next 7 Days Expirations
                </h4>
                <p className="text-[10px] text-zinc-400">Immediate renewal watch</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 tabular-nums">
              {renewalPipeline.expiring7d.length} seats
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>At-risk Monthly Volume:</span>
            <span className="text-white font-semibold tabular-nums">
              EGP {expiring7dMrr.toLocaleString()}
            </span>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pt-1">
            {renewalPipeline.expiring7d.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero seats expiring in the next 7 days</span>
              </div>
            ) : (
              renewalPipeline.expiring7d.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onSelectUser(convertToUserRowItem(sub))}
                  className="p-2 rounded-lg border border-white/5 bg-black/40 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PipelineUserAvatar src={sub.avatarUrl} name={sub.fullName || 'User'} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-primary transition-colors">
                        {sub.fullName}
                      </div>
                      <div className="text-[10px] text-zinc-400 tabular-nums">
                        {sub.daysRemaining}d left &middot; {sub.tier.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={grantingUserId === sub.userId}
                    onClick={(e) => handleExtend(e, sub.userId)}
                    className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {grantingUserId === sub.userId ? (
                      <InlineSpinner className="w-2.5 h-2.5" label="Extending" />
                    ) : (
                      <span>+30d</span>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Next 30 Days Wave */}
      <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Next 30 Days Wave
                </h4>
                <p className="text-[10px] text-zinc-400">Scheduled monthly cycles</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 tabular-nums">
              {renewalPipeline.expiring30d.length} seats
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Anticipated Renewal Flow:</span>
            <span className="text-white font-semibold tabular-nums">
              EGP {expiring30dMrr.toLocaleString()}
            </span>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pt-1">
            {renewalPipeline.expiring30d.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                No monthly renewal waves in this window.
              </div>
            ) : (
              renewalPipeline.expiring30d.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onSelectUser(convertToUserRowItem(sub))}
                  className="p-2 rounded-lg border border-white/5 bg-black/40 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PipelineUserAvatar src={sub.avatarUrl} name={sub.fullName || 'User'} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-primary transition-colors">
                        {sub.fullName}
                      </div>
                      <div className="text-[10px] text-zinc-400 tabular-nums">
                        Exp {formatDate(sub.currentPeriodEnd)} &middot; EGP {sub.priceEgp}
                      </div>
                    </div>
                  </div>

                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Churn Prevention & Auto-Renew Off */}
      <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-tight">
                  Auto-Renew Canceled / Churn Risk
                </h4>
                <p className="text-[10px] text-zinc-400">Scheduled to terminate</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 tabular-nums">
              {renewalPipeline.churnRisk.length} seats
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Revenue at Risk:</span>
            <span className="text-rose-400 font-semibold tabular-nums">
              EGP {churnRiskMrr.toLocaleString()}
            </span>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pt-1">
            {renewalPipeline.churnRisk.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero accounts scheduled for cancellation</span>
              </div>
            ) : (
              renewalPipeline.churnRisk.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => onSelectUser(convertToUserRowItem(sub))}
                  className="p-2 rounded-lg border border-white/5 bg-black/40 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <PipelineUserAvatar src={sub.avatarUrl} name={sub.fullName || 'User'} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-primary transition-colors">
                        {sub.fullName}
                      </div>
                      <div className="text-[10px] text-rose-400 tabular-nums">
                        {sub.cancelAtPeriodEnd ? 'Auto-renew disabled' : `${sub.daysRemaining}d remaining`}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={grantingUserId === sub.userId}
                    onClick={(e) => handleExtend(e, sub.userId)}
                    className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {grantingUserId === sub.userId ? (
                      <InlineSpinner className="w-2.5 h-2.5" label="Extending" />
                    ) : (
                      <span>Re-activate</span>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

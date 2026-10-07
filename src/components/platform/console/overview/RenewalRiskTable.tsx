'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, CheckCircle2 } from '@/components/ui/icon-library';

export interface AtRiskSubscriptionItem {
  id: number;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  tier: string;
  status: string;
  currentPeriodEnd: string;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
  provider: string;
}

interface RenewalRiskTableProps {
  subscriptions: AtRiskSubscriptionItem[];
}

function formatDate(iso: string) {
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

export default function RenewalRiskTable({ subscriptions }: RenewalRiskTableProps) {
  const [filter, setFilter] = useState<'all' | 'soon' | 'annual'>('all');

  const filtered = subscriptions.filter((s) => {
    if (filter === 'soon') return s.daysRemaining <= 35;
    if (filter === 'annual') return s.tier === 'pro_annual';
    return true;
  });

  return (
    <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Subscription Renewal Pipeline & Churn Monitor
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Active paid seat periods ordered by expiration and upcoming renewal waves
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Paid Seats
            </button>
            <button
              type="button"
              onClick={() => setFilter('soon')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'soon'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Next 30–35 Days
            </button>
            <button
              type="button"
              onClick={() => setFilter('annual')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'annual'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual Commitments
            </button>
          </div>

          <Link
            href="/console/users"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors ml-2"
          >
            <span>Manage</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Screener Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
              <th className="pb-2 text-left font-medium">Subscriber</th>
              <th className="pb-2 text-left font-medium">Tier Plan</th>
              <th className="pb-2 text-left font-medium">Billing Channel</th>
              <th className="pb-2 text-left font-medium">Renewal Date</th>
              <th className="pb-2 text-left font-medium">Remaining Period</th>
              <th className="pb-2 text-right font-medium">Renewal Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs text-zinc-500">
                  No subscriptions match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const isUrgent = sub.daysRemaining <= 7 || sub.status === 'past_due';
                const isCanceling = sub.cancelAtPeriodEnd || sub.status === 'canceled';

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    {/* Subscriber */}
                    <td className="py-2.5 pr-4">
                      <div className="min-w-0">
                        <Link
                          href={`/console/users?search=${encodeURIComponent(sub.email)}`}
                          className="font-medium text-white truncate block group-hover:text-blue-400 transition-colors"
                        >
                          {sub.fullName}
                        </Link>
                        <span className="text-[11px] text-zinc-400 truncate block">
                          {sub.email}
                        </span>
                      </div>
                    </td>

                    {/* Tier Plan */}
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/10">
                        {sub.tier.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Billing Channel */}
                    <td className="py-2.5 pr-4 text-zinc-300 font-medium capitalize">
                      {sub.provider.replace('_', ' ')}
                    </td>

                    {/* Renewal Date */}
                    <td className="py-2.5 pr-4 tabular-nums text-zinc-300 font-medium">
                      {formatDate(sub.currentPeriodEnd)}
                    </td>

                    {/* Days Remaining Pill */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isUrgent
                              ? 'bg-rose-500 animate-pulse'
                              : sub.daysRemaining <= 35
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            isUrgent
                              ? 'text-rose-400'
                              : sub.daysRemaining <= 35
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                          }`}
                        >
                          {sub.daysRemaining > 0 ? `${sub.daysRemaining} days left` : 'Lapsed'}
                        </span>
                      </div>
                    </td>

                    {/* Renewal Status */}
                    <td className="py-2.5 pl-4 text-right">
                      {isCanceling ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Canceling</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Auto-Renewing</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

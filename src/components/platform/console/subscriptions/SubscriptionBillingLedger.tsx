'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpRight, User, Shield, Check, AlertTriangle } from '@/components/ui/icon-library';
import { grantProAccessAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { SubscriptionItemEnriched, ConsoleUserRowItem } from '@/lib/server/console-queries';

interface SubscriptionBillingLedgerProps {
  subscriptions: SubscriptionItemEnriched[];
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

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case 'elite':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'pro_annual':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'pro_monthly':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    default:
      return 'bg-white/10 text-zinc-300 border border-white/10';
  }
}

function LedgerUserAvatar({ src, name }: { src: string | null; name: string }) {
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
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-[10px] font-semibold text-zinc-300">
        {initials || <User className="w-3.5 h-3.5 text-zinc-400" />}
      </div>
    );
  }

  return (
    <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black">
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function SubscriptionBillingLedger({
  subscriptions,
  onSelectUser,
  onRefresh,
}: SubscriptionBillingLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<
    'all' | 'paid' | 'annual' | 'monthly' | 'elite' | 'at_risk' | 'manual'
  >('all');
  const [grantingKey, setGrantingKey] = useState<string | null>(null);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      // Segment filter
      if (selectedSegment === 'paid' && (s.tier === 'free' || s.status.toLowerCase() !== 'active')) {
        return false;
      }
      if (selectedSegment === 'annual' && s.tier !== 'pro_annual') {
        return false;
      }
      if (selectedSegment === 'monthly' && s.tier !== 'pro_monthly') {
        return false;
      }
      if (selectedSegment === 'elite' && s.tier !== 'elite') {
        return false;
      }
      if (selectedSegment === 'at_risk' && !s.cancelAtPeriodEnd && s.daysRemaining > 7) {
        return false;
      }
      if (selectedSegment === 'manual' && !s.provider.toLowerCase().includes('manual')) {
        return false;
      }

      // Search query
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        s.userId.toLowerCase().includes(q)
      );
    });
  }, [subscriptions, selectedSegment, searchTerm]);

  const handleQuickGrant = async (
    e: React.MouseEvent,
    userId: string,
    days: number,
    tier: string
  ) => {
    e.stopPropagation();
    const key = `${userId}-${days}`;
    setGrantingKey(key);
    try {
      await grantProAccessAction({
        targetUserId: userId,
        days,
        tier,
      });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to grant pass:', err);
    } finally {
      setGrantingKey(null);
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

  return (
    <div className="space-y-4">
      {/* Search & Segment Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-white/10 p-3 bg-transparent rounded-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subscriptions by user, email, or ID..."
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Segment Filter Pills */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15 overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              { id: 'all', label: `All (${subscriptions.length})` },
              { id: 'paid', label: 'Active Paid' },
              { id: 'annual', label: 'Annual' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'elite', label: 'Elite VIP' },
              { id: 'at_risk', label: 'At-Risk' },
              { id: 'manual', label: 'Manual' },
            ] as const
          ).map((seg) => {
            const isActive = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-white/10 bg-transparent rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                <th className="py-2.5 px-4 text-left font-medium">Customer Profile</th>
                <th className="py-2.5 px-3 text-left font-medium">Plan / Tier</th>
                <th className="py-2.5 px-3 text-left font-medium">Status</th>
                <th className="py-2.5 px-3 text-right font-medium">Monthly MRR</th>
                <th className="py-2.5 px-3 text-left font-medium">Renewal Countdown</th>
                <th className="py-2.5 px-3 text-center font-medium">Auto-Renew</th>
                <th className="py-2.5 px-3 text-left font-medium">Provider</th>
                <th className="py-2.5 pr-4 pl-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No subscription entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const isActive = sub.status.toLowerCase() === 'active';
                  const isGranting30 = grantingKey === `${sub.userId}-30`;
                  const isGranting365 = grantingKey === `${sub.userId}-365`;

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => onSelectUser(convertToUserRowItem(sub))}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* 1. Customer */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <LedgerUserAvatar src={sub.avatarUrl} name={sub.fullName || 'Member'} />
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate group-hover:text-primary transition-colors">
                              {sub.fullName || 'Subscriber'}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {sub.email || sub.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Tier */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight border capitalize ${getTierBadgeClass(
                            sub.tier
                          )}`}
                        >
                          {sub.tier.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 3. Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      {/* 4. MRR Value */}
                      <td className="py-3 px-3 text-right tabular-nums text-white font-medium">
                        EGP {sub.priceEgp.toLocaleString()}
                        <span className="text-[10px] text-zinc-400 block font-normal capitalize">
                          {sub.billingCycle}
                        </span>
                      </td>

                      {/* 5. Renewal Countdown */}
                      <td className="py-3 px-3">
                        {isActive ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  sub.daysRemaining <= 7 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                              />
                              <span
                                className={`text-[11px] font-medium tabular-nums ${
                                  sub.daysRemaining <= 7 ? 'text-amber-400' : 'text-white'
                                }`}
                              >
                                {sub.daysRemaining} days left
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Exp: {formatDate(sub.currentPeriodEnd)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400">Lapsed</span>
                        )}
                      </td>

                      {/* 6. Auto-Renew */}
                      <td className="py-3 px-3 text-center">
                        {sub.cancelAtPeriodEnd ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Cancels
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-2.5 h-2.5" />
                            Auto
                          </span>
                        )}
                      </td>

                      {/* 7. Provider */}
                      <td className="py-3 px-3 text-zinc-400 capitalize text-[11px]">
                        {sub.provider.replace('_', ' ')}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3 pr-4 pl-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={isGranting30}
                            onClick={(e) => handleQuickGrant(e, sub.userId, 30, 'pro_monthly')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Extend 30 Days Pro"
                          >
                            {isGranting30 ? (
                              <InlineSpinner className="w-2.5 h-2.5" label="Granting" />
                            ) : (
                              <span>+30d</span>
                            )}
                          </button>

                          <button
                            disabled={isGranting365}
                            onClick={(e) => handleQuickGrant(e, sub.userId, 365, 'pro_annual')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Grant 1-Year Annual Pass"
                          >
                            {isGranting365 ? (
                              <InlineSpinner className="w-2.5 h-2.5" label="Granting" />
                            ) : (
                              <span>+1yr</span>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectUser(convertToUserRowItem(sub));
                            }}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                            title="Inspect Profile"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpRight,
  Clock,
  Calendar,
  AlertTriangle,
  Check,
  RotateCcw,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { grantProAccessAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import LedgerUserAvatar from './LedgerUserAvatar';
import type {
  SubscriptionItemEnriched,
  ConsoleUserRowItem,
} from '@/lib/server/console-queries';

interface SubscriptionBillingLedgerProps {
  subscriptions: SubscriptionItemEnriched[];
  onSelectUser: (user: ConsoleUserRowItem) => void;
  onRefresh?: () => void;
}

export type LedgerSegment =
  | 'all'
  | 'paid'
  | 'expiring7d'
  | 'expiring30d'
  | 'churn_risk'
  | 'annual'
  | 'direct'
  | 'free';

function formatDate(iso: string | null, locale: string) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getTierBadgeClass(tier: string) {
  const t = tier.toLowerCase();
  switch (t) {
    case 'elite':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'plus':
    case 'pro_monthly':
    case 'pro_annual':
    case 'pro':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'vip':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    default:
      return 'bg-white/10 text-zinc-300 border border-white/10';
  }
}

function formatProviderLabel(provider: string | null) {
  if (!provider) return 'Direct Grant';
  const p = provider.toLowerCase();
  if (p === 'card' || p.includes('stripe') || p === 'online') {
    return 'Card Payment';
  }
  if (p === 'promo') {
    return 'Promo Code';
  }
  if (p === 'manual' || p === 'direct') {
    return 'Direct Grant';
  }
  return provider.replace(/_/g, ' ');
}

export default function SubscriptionBillingLedger({
  subscriptions,
  onSelectUser,
  onRefresh,
}: SubscriptionBillingLedgerProps) {
  const { locale } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [segment, setSegment] = useState<LedgerSegment>('all');
  const [grantingKey, setGrantingKey] = useState<string | null>(null);

  // 1. Pipeline Metrics (Merged from Renewal Pipeline)
  const pipelineStats = useMemo(() => {
    const activePaid = subscriptions.filter(
      (s) => s.status.toLowerCase() === 'active' && s.tier !== 'free'
    );
    const expiring7d = activePaid.filter((s) => s.daysRemaining <= 7);
    const expiring30d = activePaid.filter((s) => s.daysRemaining > 7 && s.daysRemaining <= 30);
    const churnRisk = activePaid.filter((s) => s.cancelAtPeriodEnd || s.daysRemaining <= 7);

    const expiring7dMrr = expiring7d.reduce((sum, s) => sum + s.priceEgp, 0);
    const expiring30dMrr = expiring30d.reduce((sum, s) => sum + s.priceEgp, 0);
    const churnRiskMrr = churnRisk.reduce((sum, s) => sum + s.priceEgp, 0);

    const annualSubs = activePaid.filter(
      (s) => s.billingCycle === 'annual' || s.tier.includes('annual')
    );
    const manualSubs = subscriptions.filter(
      (s) => s.provider.toLowerCase().includes('manual') || s.provider.toLowerCase().includes('direct')
    );
    const freeSubs = subscriptions.filter((s) => s.tier === 'free');

    return {
      activePaid,
      expiring7d,
      expiring30d,
      churnRisk,
      expiring7dMrr,
      expiring30dMrr,
      churnRiskMrr,
      annualCount: annualSubs.length,
      manualCount: manualSubs.length,
      freeCount: freeSubs.length,
    };
  }, [subscriptions]);

  // 2. Filter Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      const isActive = s.status.toLowerCase() === 'active';
      const isPaid = s.tier !== 'free' && isActive;

      // Segment Filter
      if (segment === 'paid' && !isPaid) return false;
      if (segment === 'expiring7d' && (!isPaid || s.daysRemaining > 7)) return false;
      if (segment === 'expiring30d' && (!isPaid || s.daysRemaining <= 7 || s.daysRemaining > 30))
        return false;
      if (segment === 'churn_risk' && (!isPaid || (!s.cancelAtPeriodEnd && s.daysRemaining > 7)))
        return false;
      if (segment === 'annual' && (!isPaid || (s.billingCycle !== 'annual' && !s.tier.includes('annual'))))
        return false;
      if (segment === 'direct' && !s.provider.toLowerCase().includes('manual') && !s.provider.toLowerCase().includes('direct'))
        return false;
      if (segment === 'free' && s.tier !== 'free') return false;

      // Search Filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        s.userId.toLowerCase().includes(q) ||
        s.tier.toLowerCase().includes(q)
      );
    });
  }, [subscriptions, segment, searchTerm]);

  // Quick grant extension
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
      lastActiveAt: sub.currentPeriodStart || new Date().toISOString(),
      memberStatus: sub.status === 'active' ? 'active' : 'inactive',
      authProvider: 'Google/OAuth',
      openPositionsCount: sub.positionsCount || 0,
      openPositionsValue: 0,
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
    <div className="bg-transparent space-y-4 select-none">
      {/* 1. Renewal Pipeline & Churn Watch Strip (Merged from Renewal Pipeline) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
        {/* Next 7 Days Card */}
        <button
          type="button"
          onClick={() => setSegment(segment === 'expiring7d' ? 'all' : 'expiring7d')}
          className={`p-3 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
            segment === 'expiring7d'
              ? 'bg-amber-500/15 border border-amber-500/30'
              : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white tracking-tight truncate">
                {locale === 'ar' ? 'انتهاء خلال 7 أيام' : 'Next 7 Days'}
              </div>
              <div className="text-[10px] text-zinc-400 tabular-nums">
                {pipelineStats.expiring7d.length} {locale === 'ar' ? 'مقعد' : 'seats'} &middot; EGP {pipelineStats.expiring7dMrr.toLocaleString()}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tabular-nums shrink-0">
            {pipelineStats.expiring7d.length}
          </span>
        </button>

        {/* Next 30 Days Card */}
        <button
          type="button"
          onClick={() => setSegment(segment === 'expiring30d' ? 'all' : 'expiring30d')}
          className={`p-3 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
            segment === 'expiring30d'
              ? 'bg-blue-500/15 border border-blue-500/30'
              : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white tracking-tight truncate">
                {locale === 'ar' ? 'دورة الـ 30 يوماً' : 'Next 30 Days Wave'}
              </div>
              <div className="text-[10px] text-zinc-400 tabular-nums">
                {pipelineStats.expiring30d.length} {locale === 'ar' ? 'مقعد' : 'seats'} &middot; EGP {pipelineStats.expiring30dMrr.toLocaleString()}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tabular-nums shrink-0">
            {pipelineStats.expiring30d.length}
          </span>
        </button>

        {/* Churn Risk / Canceling Card */}
        <button
          type="button"
          onClick={() => setSegment(segment === 'churn_risk' ? 'all' : 'churn_risk')}
          className={`p-3 rounded-lg text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
            segment === 'churn_risk'
              ? 'bg-rose-500/15 border border-rose-500/30'
              : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white tracking-tight truncate">
                {locale === 'ar' ? 'مخاطر الإلغاء' : 'Churn Risk Flags'}
              </div>
              <div className="text-[10px] text-zinc-400 tabular-nums">
                {pipelineStats.churnRisk.length} {locale === 'ar' ? 'مقعد' : 'seats'} &middot; EGP {pipelineStats.churnRiskMrr.toLocaleString()}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 tabular-nums shrink-0">
            {pipelineStats.churnRisk.length}
          </span>
        </button>
      </div>

      {/* 2. Search & Segment Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              locale === 'ar'
                ? 'البحث عن المشتركين بالاسم، البريد، أو المعرف...'
                : 'Search subscribers by name, email, or tier...'
            }
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors tabular-nums"
          />
        </div>

        {/* Segment Filter Pills (Matching platform seg-control) */}
        <div className="seg-control seg-control-compact self-start lg:self-auto overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `${locale === 'ar' ? 'الكل' : 'All'} (${subscriptions.length})` },
              { id: 'paid', label: `${locale === 'ar' ? 'مدفوع' : 'Active Paid'} (${pipelineStats.activePaid.length})` },
              { id: 'expiring7d', label: `${locale === 'ar' ? '7 أيام' : '7D Watch'} (${pipelineStats.expiring7d.length})` },
              { id: 'expiring30d', label: `${locale === 'ar' ? '30 يوماً' : '30D Wave'} (${pipelineStats.expiring30d.length})` },
              { id: 'churn_risk', label: `${locale === 'ar' ? 'إلغاء' : 'Churn Risk'} (${pipelineStats.churnRisk.length})` },
              { id: 'annual', label: `${locale === 'ar' ? 'سنوي' : 'Annual'} (${pipelineStats.annualCount})` },
              { id: 'direct', label: `${locale === 'ar' ? 'مباشر' : 'Direct Grant'} (${pipelineStats.manualCount})` },
              { id: 'free', label: `${locale === 'ar' ? 'مجاني' : 'Free'} (${pipelineStats.freeCount})` },
            ] as const
          ).map((s) => {
            const isSelected = segment === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSegment(s.id)}
                className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Ledger Table (Strictly ZERO Outer Table Borders) */}
      <div className="w-full overflow-x-auto custom-scrollbar pt-1">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
              <th className="py-2.5 px-3 text-left font-medium">
                {locale === 'ar' ? 'الملف الشخصي' : 'Customer Profile'}
              </th>
              <th className="py-2.5 px-3 text-left font-medium">
                {locale === 'ar' ? 'الباقة' : 'Plan / Tier'}
              </th>
              <th className="py-2.5 px-3 text-left font-medium">
                {locale === 'ar' ? 'الحالة' : 'Status'}
              </th>
              <th className="py-2.5 px-3 text-right font-medium">
                {locale === 'ar' ? 'الإيراد الشهري' : 'Monthly MRR'}
              </th>
              <th className="py-2.5 px-3 text-left font-medium">
                {locale === 'ar' ? 'التجديد والانتهاء' : 'Renewal & Expiration'}
              </th>
              <th className="py-2.5 px-3 text-center font-medium">
                {locale === 'ar' ? 'التجديد التلقائي' : 'Auto-Renew'}
              </th>
              <th className="py-2.5 px-3 text-left font-medium">
                {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
              </th>
              <th className="py-2.5 pr-3 pl-2 text-right font-medium">
                {locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredSubscriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  {locale === 'ar'
                    ? 'لا توجد سجلات اشتراك تطابق الفلتر الحالي'
                    : 'No subscription entries match your filter.'}
                </td>
              </tr>
            ) : (
              filteredSubscriptions.map((sub) => {
                const isActive = sub.status.toLowerCase() === 'active';
                const isPaid = sub.tier !== 'free' && isActive;
                const isGranting30 = grantingKey === `${sub.userId}-30`;
                const isGranting365 = grantingKey === `${sub.userId}-365`;
                const targetTier = sub.tier === 'free' ? 'plus' : sub.tier;

                return (
                  <tr
                    key={`${sub.id}-${sub.userId}`}
                    onClick={() => onSelectUser(convertToUserRowItem(sub))}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* 1. Customer Profile */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <LedgerUserAvatar src={sub.avatarUrl} name={sub.fullName || 'Member'} />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <span>{sub.fullName || 'Subscriber'}</span>
                            {sub.role === 'admin' && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                STAFF
                              </span>
                            )}
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
                      {isPaid ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                sub.daysRemaining <= 7 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                            />
                            <span
                              className={`text-[11px] font-medium tabular-nums ${
                                sub.daysRemaining <= 7 ? 'text-amber-400' : 'text-white'
                              }`}
                            >
                              {sub.daysRemaining} {locale === 'ar' ? 'أيام متبقية' : 'days left'}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 tabular-nums">
                            {formatDate(sub.currentPeriodEnd, locale)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          {sub.tier === 'vip' ? (locale === 'ar' ? 'دائم (VIP)' : 'Perpetual Access') : (locale === 'ar' ? 'مجاني' : 'Free Pool')}
                        </span>
                      )}
                    </td>

                    {/* 6. Auto-Renew */}
                    <td className="py-3 px-3 text-center">
                      {sub.cancelAtPeriodEnd ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {locale === 'ar' ? 'إلغاء عند النهاية' : 'Cancels'}
                        </span>
                      ) : isActive && isPaid ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-2.5 h-2.5" />
                          {locale === 'ar' ? 'تلقائي' : 'Auto'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">—</span>
                      )}
                    </td>

                    {/* 7. Payment Channel / Method (Zero Stripe references) */}
                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {formatProviderLabel(sub.provider)}
                    </td>

                    {/* 8. Quick Actions */}
                    <td className="py-3 pr-3 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isGranting30}
                          onClick={(e) => handleQuickGrant(e, sub.userId, 30, targetTier)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          title="Extend 30 Days"
                        >
                          {isGranting30 ? (
                            <InlineSpinner className="w-2.5 h-2.5" label="Granting" />
                          ) : (
                            <span>+30d</span>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isGranting365}
                          onClick={(e) => handleQuickGrant(e, sub.userId, 365, targetTier)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          title="Grant 1-Year Pass"
                        >
                          {isGranting365 ? (
                            <InlineSpinner className="w-2.5 h-2.5" label="Granting" />
                          ) : (
                            <span>+1yr</span>
                          )}
                        </button>

                        <button
                          type="button"
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
  );
}

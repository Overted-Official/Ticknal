'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpRight,
  User,
  Shield,
  Coins,
  CheckSquare,
  Square,
  Trash2,
  Ban,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  X,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import {
  bulkUpdateUserTierAction,
  bulkDeleteUsersAction,
  bulkUpdateUserStatusAction,
} from '@/lib/server/console-actions';
import type { ConsoleUserRowItem } from '@/lib/server/console-queries';

interface UserDirectoryScreenerProps {
  users: ConsoleUserRowItem[];
  onSelectUser: (user: ConsoleUserRowItem) => void;
  onRefresh?: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatCurrency(amount: number) {
  if (!amount || amount === 0) return '—';
  return `${amount.toLocaleString()} EGP`;
}

function getTierBadge(tier: string) {
  const t = tier.toLowerCase();
  switch (t) {
    case 'vip':
      return {
        label: 'VIP',
        className: 'bg-surface-raised text-text-primary border border-border-hover',
      };
    case 'elite':
      return {
        label: 'Elite',
        className: 'bg-surface-raised text-text-primary border border-border-default',
      };
    case 'plus':
    case 'pro_monthly':
    case 'pro_annual':
    case 'pro':
      return {
        label: 'Plus',
        className: 'bg-surface-raised text-text-primary border border-border-default',
      };
    default:
      return {
        label: 'Free',
        className: 'bg-surface-input text-text-muted border border-border-subtle',
      };
  }
}

function ScreenerUserAvatar({ src, name }: { src: string | null; name: string }) {
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
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function UserDirectoryScreener({
  users,
  onSelectUser,
  onRefresh,
}: UserDirectoryScreenerProps) {
  const { locale } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<
    'all' | 'plus' | 'elite' | 'vip' | 'free' | 'staff'
  >('all');

  // Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isTierMenuOpen, setIsTierMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Segment filter
      const t = (u.subscription.tier || 'free').toLowerCase();
      if (selectedSegment === 'plus' && t !== 'plus') return false;
      if (selectedSegment === 'elite' && t !== 'elite') return false;
      if (selectedSegment === 'vip' && t !== 'vip') return false;
      if (selectedSegment === 'free' && t !== 'free') return false;
      if (selectedSegment === 'staff' && u.role !== 'admin' && u.role !== 'superadmin') {
        return false;
      }

      // Search query
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, selectedSegment, searchTerm]);

  // Bulk selection helpers
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.has(u.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedUserIds(new Set());
    } else {
      const next = new Set<string>();
      filteredUsers.forEach((u) => next.add(u.id));
      setSelectedUserIds(next);
    }
  };

  const toggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkChangeTier = async (tier: 'free' | 'plus' | 'elite' | 'vip') => {
    setIsTierMenuOpen(false);
    if (selectedUserIds.size === 0) return;
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await bulkUpdateUserTierAction({
        targetUserIds: Array.from(selectedUserIds),
        tier,
      });
      if (res.success) {
        setActionFeedback({
          text: `Updated ${res.count} members to ${tier.toUpperCase()}`,
          type: 'success',
        });
        setSelectedUserIds(new Set());
        onRefresh?.();
      } else {
        setActionFeedback({ text: 'Failed to update plan tiers', type: 'error' });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Error updating tiers', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selectedUserIds.size} selected member account(s)? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await bulkDeleteUsersAction({
        targetUserIds: Array.from(selectedUserIds),
      });
      if (res.success) {
        setActionFeedback({
          text: `Deleted ${res.count} member account(s)`,
          type: 'success',
        });
        setSelectedUserIds(new Set());
        onRefresh?.();
      } else {
        setActionFeedback({ text: 'Failed to delete members', type: 'error' });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Error deleting accounts', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkSuspend = async (status: 'active' | 'suspended') => {
    if (selectedUserIds.size === 0) return;
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await bulkUpdateUserStatusAction({
        targetUserIds: Array.from(selectedUserIds),
        status,
      });
      if (res.success) {
        setActionFeedback({
          text: `${status === 'suspended' ? 'Suspended' : 'Activated'} ${res.count} member(s)`,
          type: 'success',
        });
        setSelectedUserIds(new Set());
        onRefresh?.();
      } else {
        setActionFeedback({ text: 'Failed to update member status', type: 'error' });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Error updating status', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* 1. Search & Segment Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-1 bg-transparent">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 shrink-0 rtl:left-auto rtl:right-3"
            strokeWidth={1.8}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              locale === 'ar'
                ? 'البحث بالاسم، البريد الإلكتروني، أو المعرف...'
                : 'Search members by name, email, or UUID...'
            }
            className="h-9 w-full bg-black border border-white/[0.08] hover:border-white/20 focus:border-white/30 text-white placeholder-zinc-500 text-xs pl-9 pr-8 rtl:pl-3 rtl:pr-9 rounded-lg focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer rtl:right-auto rtl:left-2.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segment Filter Pills: Styled with .seg-control matching UserTierBarChart */}
        <div className="seg-control seg-control-compact overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              { id: 'all', label: `All (${users.length})` },
              { id: 'plus', label: 'Plus' },
              { id: 'elite', label: 'Elite' },
              { id: 'vip', label: 'VIP' },
              { id: 'free', label: 'Free' },
              { id: 'staff', label: 'Staff' },
            ] as const
          ).map((seg) => {
            const isActive = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSelectedSegment(seg.id)}
                className={`seg-control-btn ${isActive ? 'seg-control-btn-active' : ''}`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Feedback banner if present */}
      {actionFeedback && (
        <div
          className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          <span>{actionFeedback.text}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Bulk Actions Bar (appears when 1 or more rows selected) */}
      {selectedUserIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface-base border border-border-default text-xs shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-blue" />
            <span className="font-semibold text-text-primary tabular-nums">
              {selectedUserIds.size} member{selectedUserIds.size === 1 ? '' : 's'} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Change Tier dropdown */}
            <div className="relative">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsTierMenuOpen(!isTierMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-hover-subtle text-text-primary font-medium border border-border-default transition-colors cursor-pointer"
              >
                <span>Change Plan Tier</span>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </button>

              {isTierMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-surface-base border border-border-default p-1 shadow-2xl z-50 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleBulkChangeTier('free')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Free</span>
                    <span className="text-[10px] text-text-muted">0 EGP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkChangeTier('plus')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Plus</span>
                    <span className="text-[10px] text-text-muted">50 EGP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkChangeTier('elite')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Elite</span>
                    <span className="text-[10px] text-text-muted">95 EGP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkChangeTier('vip')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover-subtle transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>VIP</span>
                    <span className="text-[10px] text-text-muted">0 EGP</span>
                  </button>
                </div>
              )}
            </div>

            {/* Suspend / Activate buttons */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleBulkSuspend('suspended')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary font-medium border border-border-default transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5 text-text-muted" />
              <span>Suspend</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleBulkSuspend('active')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary font-medium border border-border-default transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-profit-num" />
              <span>Activate</span>
            </button>

            {/* Delete button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-hover-subtle text-text-muted hover:text-loss-num font-medium border border-border-default transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={() => setSelectedUserIds(new Set())}
              className="px-2.5 py-1.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 4. Members Table */}
      <div className="bg-transparent overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                {/* 0. Multiselect checkbox header */}
                <th className="py-2.5 pl-4 pr-2 text-center w-8">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-zinc-400 hover:text-white transition-colors focus:outline-none"
                    title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                {/* 1. Member Profile */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[200px]">
                  Member Profile
                </th>

                {/* 2. Plan Tier */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[100px]">
                  Plan Tier
                </th>

                {/* 3. Subscription Date */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[120px]">
                  Subscription Date
                </th>

                {/* 4. Next Subscription Date */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[130px]">
                  Next Subscription Date
                </th>

                {/* 5. Sign Up Date */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[110px]">
                  Sign Up Date
                </th>

                {/* 6. Last Login / Usage */}
                <th className="py-2.5 px-3 text-left font-medium min-w-[130px]">
                  Last Login/Usage
                </th>

                {/* 7. Member Status */}
                <th className="py-2.5 px-3 text-center font-medium min-w-[100px]">
                  Status
                </th>

                {/* 8. Open Positions (Count) */}
                <th className="py-2.5 px-3 text-center font-medium min-w-[110px]">
                  Open Positions
                </th>

                {/* 9. Open Exposure (Value) */}
                <th className="py-2.5 px-3 text-right font-medium min-w-[120px]">
                  Open Exposure
                </th>

                {/* 10. Actions */}
                <th className="py-2.5 pr-4 pl-2 text-right font-medium w-20">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    No members match your search or segment filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.has(u.id);
                  const tierBadge = getTierBadge(u.subscription.tier);
                  const isStaff = u.role === 'admin' || u.role === 'superadmin';
                  const isActiveStatus = u.memberStatus === 'active';

                  return (
                    <tr
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                        isSelected ? 'bg-blue-500/[0.08]' : ''
                      }`}
                    >
                      {/* 0. Row Checkbox */}
                      <td
                        className="py-3 pl-4 pr-2 text-center"
                        onClick={(e) => toggleSelectUser(u.id, e)}
                      >
                        <button
                          type="button"
                          className="text-zinc-400 hover:text-white transition-colors focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. Member Profile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <ScreenerUserAvatar
                            src={u.avatarUrl}
                            name={u.fullName || 'Member'}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                              <span>{u.fullName || 'Member'}</span>
                              {isStaff && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                  STAFF
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                              {u.email || u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Plan Tier */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight ${tierBadge.className}`}
                        >
                          {tierBadge.label}
                        </span>
                      </td>

                      {/* 3. Subscription Date */}
                      <td className="py-3 px-3 text-zinc-300 tabular-nums">
                        {formatDate(u.subscription.currentPeriodStart)}
                      </td>

                      {/* 4. Next Subscription Date */}
                      <td className="py-3 px-3 tabular-nums">
                        {u.subscription.tier === 'free' ? (
                          <span className="text-zinc-500 text-[11px]">No Expiry</span>
                        ) : u.subscription.currentPeriodEnd ? (
                          <div className="space-y-0.5">
                            <div className="text-white text-[11px] font-medium">
                              {formatDate(u.subscription.currentPeriodEnd)}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {u.subscription.daysRemaining > 0
                                ? `${u.subscription.daysRemaining} days remaining`
                                : 'Due for renewal'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* 5. Sign Up Date */}
                      <td className="py-3 px-3 text-zinc-300 tabular-nums">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* 6. Last Login / Usage */}
                      <td className="py-3 px-3 text-zinc-300 tabular-nums">
                        <div className="text-white text-[11px] font-medium">
                          {formatDate(u.lastActiveAt)}
                        </div>
                      </td>

                      {/* 7. Member Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          title={
                            u.memberStatus === 'active'
                              ? 'Account active & in good standing (recent platform activity)'
                              : u.memberStatus === 'suspended'
                              ? 'Account access suspended by administrator'
                              : 'Dormant account (>60 days with no activity)'
                          }
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-default ${
                            u.memberStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.memberStatus === 'suspended'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.memberStatus === 'active'
                                ? 'bg-emerald-400'
                                : u.memberStatus === 'suspended'
                                ? 'bg-rose-400'
                                : 'bg-zinc-500'
                            }`}
                          />
                          <span className="capitalize">{u.memberStatus}</span>
                        </span>
                      </td>

                      {/* 8. Open Positions (Count) — Sleek, No Icons */}
                      <td className="py-3 px-3 text-center">
                        {u.openPositionsCount > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded text-[11px] font-semibold text-white bg-white/[0.06] border border-white/10 tabular-nums">
                            {u.openPositionsCount}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs tabular-nums">—</span>
                        )}
                      </td>

                      {/* 9. Open Exposure (Value) */}
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-white">
                        {formatCurrency(u.openPositionsValue)}
                      </td>

                      {/* 10. Action */}
                      <td className="py-3 pr-4 pl-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUser(u);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
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

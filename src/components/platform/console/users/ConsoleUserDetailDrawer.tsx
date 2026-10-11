'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  CheckCircle2,
  AlertCircle,
  Ban,
  Trash2,
  Zap,
  Check,
  Layers,
} from '@/components/ui/icon-library';
import {
  updateUserRoleAction,
  updateSingleUserTierAction,
  updateSingleUserStatusAction,
  deleteSingleUserAction,
  getUserPositionsAction,
  seedUserNotificationsAction,
} from '@/lib/server/console-actions';
import type { ConsoleUserRowItem, UserOpenPositionItem } from '@/lib/server/console-queries';
import InlineSpinner from '@/components/ui/InlineSpinner';

interface UserDetailProps {
  user: ConsoleUserRowItem;
  onClose: () => void;
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
  if (!amount || amount === 0) return '0 EGP';
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`;
}

function getTierMeta(tier: string) {
  const t = tier.toLowerCase();
  switch (t) {
    case 'vip':
      return {
        label: 'VIP',
        tag: 'Friends & Family',
        price: '0 EGP',
      };
    case 'elite':
      return {
        label: 'Elite',
        tag: 'Full Signals & Terminal',
        price: '95 EGP / mo · 950 EGP / yr',
      };
    case 'plus':
    case 'pro_monthly':
    case 'pro_annual':
    case 'pro':
      return {
        label: 'Plus',
        tag: 'Advanced Screener',
        price: '50 EGP / mo · 500 EGP / yr',
      };
    default:
      return {
        label: 'Free',
        tag: 'Standard Tier',
        price: '0 EGP',
      };
  }
}

function DrawerUserAvatar({ src, name }: { src: string | null; name: string }) {
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
      <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center font-semibold text-text-primary text-xs shrink-0 border border-border-default">
        {initials || <User className="w-4 h-4 text-text-muted" />}
      </div>
    );
  }

  return (
    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border-default bg-surface-base">
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

export default function ConsoleUserDetailDrawer({
  user,
  onClose,
  onRefresh,
}: UserDetailProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'system'>('overview');
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isReseedingAlerts, setIsReseedingAlerts] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tier switcher state
  const [selectedDuration, setSelectedDuration] = useState<'month' | 'year'>('year');

  // Positions data
  const [positions, setPositions] = useState<UserOpenPositionItem[]>(user.openPositions || []);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [hasLoadedPositions, setHasLoadedPositions] = useState(Boolean(user.openPositions));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user.openPositions) {
      setPositions(user.openPositions);
      setHasLoadedPositions(true);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'positions' && !hasLoadedPositions) {
      loadPositions();
    }
  }, [activeTab, hasLoadedPositions]);

  const loadPositions = async () => {
    setIsLoadingPositions(true);
    try {
      const res = await getUserPositionsAction({ targetUserId: user.id });
      if (res.success && res.positions) {
        setPositions(res.positions);
      }
    } catch (err) {
      console.error('Failed to load user positions:', err);
    } finally {
      setIsLoadingPositions(false);
      setHasLoadedPositions(true);
    }
  };

  const handleUpdateTier = async (tier: 'free' | 'plus' | 'elite' | 'vip') => {
    const days = tier === 'free' ? 365 : selectedDuration === 'year' ? 365 : 30;
    setIsUpdatingTier(true);
    setMessage(null);
    try {
      const res = await updateSingleUserTierAction({
        targetUserId: user.id,
        tier,
        durationDays: days,
      });
      if (res.success) {
        setMessage({
          text: `Plan updated to ${tier.toUpperCase()} (${days} days)`,
          type: 'success',
        });
        onRefresh?.();
      } else {
        setMessage({ text: 'Failed to update plan tier', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsUpdatingTier(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = user.memberStatus === 'active' ? 'suspended' : 'active';
    setIsUpdatingStatus(true);
    setMessage(null);
    try {
      const res = await updateSingleUserStatusAction({
        targetUserId: user.id,
        status: newStatus,
      });
      if (res.success) {
        setMessage({
          text: `Member status updated to ${newStatus}`,
          type: 'success',
        });
        onRefresh?.();
      } else {
        setMessage({ text: res.error || 'Failed to update status', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await deleteSingleUserAction({ targetUserId: user.id });
      if (res.success) {
        setMessage({ text: 'User account deleted permanently', type: 'success' });
        onRefresh?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setMessage({ text: res.error || 'Failed to delete user', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveRole = async () => {
    setIsSavingRole(true);
    setMessage(null);
    try {
      const res = await updateUserRoleAction({
        targetUserId: user.id,
        newRole: selectedRole,
      });
      if (res.success) {
        setMessage({ text: `Role updated to ${selectedRole}`, type: 'success' });
        onRefresh?.();
      } else {
        setMessage({ text: res.error || 'Failed to update role', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleReseedAlerts = async () => {
    setIsReseedingAlerts(true);
    setMessage(null);
    try {
      const res = await seedUserNotificationsAction({
        targetUserId: user.id,
      });
      if (res.success) {
        setMessage({ text: `Seeded ${res.seededCount} signals into user inbox`, type: 'success' });
        onRefresh?.();
      } else {
        setMessage({ text: res.error || 'Failed to reseed alerts', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsReseedingAlerts(false);
    }
  };

  const currentTierMeta = getTierMeta(user.subscription.tier);
  const isStaff = user.role === 'admin' || user.role === 'superadmin';
  const isActive = user.memberStatus === 'active';
  const totalPositionsExposure = positions.reduce((acc, p) => acc + p.totalExposure, 0);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
          aria-label="Close drawer"
        />

        {/* Slide-over Drawer Sheet */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative z-[101] w-full max-w-lg md:max-w-xl bg-surface-base border-l border-border-default h-full flex flex-col rounded-none shadow-2xl select-none"
        >
          {/* Top Header */}
          <div className="px-6 py-4.5 border-b border-border-default flex items-center justify-between shrink-0 bg-surface-base">
            <div className="flex items-center gap-3 min-w-0">
              <DrawerUserAvatar src={user.avatarUrl} name={user.fullName || 'Member'} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text-primary truncate font-sans">
                    {user.fullName || 'Ticknal Member'}
                  </h2>
                  {isStaff && (
                    <span className="text-[10px] font-semibold text-text-muted bg-surface-raised border border-border-subtle px-1.5 py-0.5 rounded font-sans">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate tabular-nums font-sans mt-0.5">
                  {user.email || 'No email attached'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-surface-raised border border-border-subtle text-text-secondary font-sans">
                {currentTierMeta.label}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="drawer-close-btn flex items-center justify-center cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4 text-text-muted hover:text-text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-border-default flex items-center gap-6 text-xs bg-surface-base shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 font-medium transition-colors cursor-pointer border-b-2 font-sans ${
                activeTab === 'overview'
                  ? 'border-white text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              Overview & Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('positions')}
              className={`py-3 font-medium transition-colors cursor-pointer border-b-2 font-sans flex items-center gap-1.5 ${
                activeTab === 'positions'
                  ? 'border-white text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              <span>Open Positions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-raised text-text-muted tabular-nums">
                {user.openPositionsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`py-3 font-medium transition-colors cursor-pointer border-b-2 font-sans ${
                activeTab === 'system'
                  ? 'border-white text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              System & Role
            </button>
          </div>

          {/* Feedback message banner */}
          {message && (
            <div
              className={`mx-6 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-surface-raised text-text-primary border border-border-default'
                  : 'bg-surface-raised text-loss-num border border-border-default'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-profit-num shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-loss-num shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-7 text-xs text-text-secondary">
            {/* ========================================================= */}
            {/* TAB 1: OVERVIEW & PLAN TIER */}
            {/* ========================================================= */}
            {activeTab === 'overview' && (
              <div className="space-y-7">
                {/* 1. Subscription Details Metadata List (No internal boxes) */}
                <div className="space-y-3">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Subscription Status
                  </div>

                  <div className="divide-y divide-border-subtle/40">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Current Plan</span>
                      <span className="text-text-primary text-xs font-semibold">
                        {currentTierMeta.label}{' '}
                        <span className="text-text-muted font-normal text-[11px]">
                          ({currentTierMeta.price})
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Member Status</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-profit-num' : 'bg-text-faint'
                          }`}
                        />
                        <span className="capitalize">{user.memberStatus}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Billing Provider</span>
                      <span className="text-text-primary text-xs font-medium capitalize">
                        {user.subscription.provider.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Subscription Start</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">
                        {formatDate(user.subscription.currentPeriodStart)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Renewal / Expiry</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">
                        {user.subscription.tier === 'free'
                          ? 'No Expiry (Free Tier)'
                          : formatDate(user.subscription.currentPeriodEnd)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Days Remaining</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">
                        {user.subscription.tier === 'free'
                          ? 'Unlimited'
                          : user.subscription.daysRemaining > 0
                          ? `${user.subscription.daysRemaining} days`
                          : 'Due for renewal'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Open Exposure</span>
                      <span className="text-text-primary text-xs font-semibold tabular-nums">
                        {formatCurrency(user.openPositionsValue)}{' '}
                        <span className="text-text-muted font-normal text-[11px]">
                          ({user.openPositionsCount} {user.openPositionsCount === 1 ? 'lot' : 'lots'})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Change Plan Tier Selector */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                      Change Plan Tier
                    </div>

                    {/* Duration Toggle */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-input border border-border-subtle">
                      <button
                        type="button"
                        onClick={() => setSelectedDuration('month')}
                        className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer font-sans ${
                          selectedDuration === 'month'
                            ? 'bg-surface-active text-text-primary font-medium'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDuration('year')}
                        className={`px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer font-sans ${
                          selectedDuration === 'year'
                            ? 'bg-surface-active text-text-primary font-medium'
                            : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        1 Year
                      </button>
                    </div>
                  </div>

                  {/* 4 Sleek Plan Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Free Plan */}
                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={() => handleUpdateTier('free')}
                      className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
                        user.subscription.tier === 'free'
                          ? 'bg-surface-active text-text-primary border-border-hover'
                          : 'bg-surface-input hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary border-border-subtle'
                      } disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary text-xs">Free</span>
                        {user.subscription.tier === 'free' && (
                          <span className="text-[10px] text-text-muted font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 tabular-nums">0 EGP · Standard</div>
                    </button>

                    {/* Plus Plan */}
                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={() => handleUpdateTier('plus')}
                      className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
                        user.subscription.tier === 'plus'
                          ? 'bg-surface-active text-text-primary border-border-hover'
                          : 'bg-surface-input hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary border-border-subtle'
                      } disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary text-xs">Plus</span>
                        {user.subscription.tier === 'plus' && (
                          <span className="text-[10px] text-text-muted font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 tabular-nums">
                        {selectedDuration === 'year' ? '500 EGP / yr' : '50 EGP / mo'}
                      </div>
                    </button>

                    {/* Elite Plan */}
                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={() => handleUpdateTier('elite')}
                      className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
                        user.subscription.tier === 'elite'
                          ? 'bg-surface-active text-text-primary border-border-hover'
                          : 'bg-surface-input hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary border-border-subtle'
                      } disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary text-xs">Elite</span>
                        {user.subscription.tier === 'elite' && (
                          <span className="text-[10px] text-text-muted font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 tabular-nums">
                        {selectedDuration === 'year' ? '950 EGP / yr' : '95 EGP / mo'}
                      </div>
                    </button>

                    {/* VIP Plan */}
                    <button
                      type="button"
                      disabled={isUpdatingTier}
                      onClick={() => handleUpdateTier('vip')}
                      className={`p-3 rounded-lg text-left transition-colors cursor-pointer border ${
                        user.subscription.tier === 'vip'
                          ? 'bg-surface-active text-text-primary border-border-hover'
                          : 'bg-surface-input hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary border-border-subtle'
                      } disabled:opacity-40`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary text-xs">VIP</span>
                        {user.subscription.tier === 'vip' && (
                          <span className="text-[10px] text-text-muted font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 tabular-nums">0 EGP · Friends & Family</div>
                    </button>
                  </div>
                </div>

                {/* 3. Member Governance (Quiet actions) */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Member Governance
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={handleToggleStatus}
                      className="flex-1 py-2 px-3 rounded-lg border border-border-default hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isUpdatingStatus && <InlineSpinner className="w-3.5 h-3.5" />}
                      {isActive ? <Ban className="w-3.5 h-3.5 text-text-muted" /> : <CheckCircle2 className="w-3.5 h-3.5 text-profit-num" />}
                      <span>{isActive ? 'Suspend Access' : 'Reactivate Access'}</span>
                    </button>

                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="py-2 px-3 rounded-lg border border-border-default hover:bg-surface-hover-subtle text-text-muted hover:text-loss-num transition-colors text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete User</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDeleteUser}
                          className="py-2 px-3 rounded-lg bg-surface-raised border border-border-hover text-loss-num hover:text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {isDeleting && <InlineSpinner className="w-3.5 h-3.5" />}
                          <span>Confirm Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="py-2 px-2.5 rounded-lg border border-border-subtle hover:bg-surface-hover-subtle text-text-muted text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: OPEN POSITIONS */}
            {/* ========================================================= */}
            {activeTab === 'positions' && (
              <div className="space-y-4">
                {/* Clean Header Strip */}
                <div className="flex items-center justify-between pb-3 border-b border-border-default">
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                      Total Open Positions
                    </div>
                    <div className="text-base font-semibold text-text-primary tabular-nums mt-0.5">
                      {positions.length} {positions.length === 1 ? 'Lot' : 'Lots'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                      Total Exposure
                    </div>
                    <div className="text-base font-semibold text-text-primary tabular-nums mt-0.5">
                      {formatCurrency(totalPositionsExposure)}
                    </div>
                  </div>
                </div>

                {isLoadingPositions ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
                    <InlineSpinner className="w-5 h-5" />
                    <span>Loading open positions...</span>
                  </div>
                ) : positions.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Layers className="w-7 h-7 text-text-faint mx-auto stroke-1" />
                    <div className="text-text-primary font-medium text-xs">No Open Positions</div>
                    <p className="text-text-muted text-[11px] max-w-xs mx-auto">
                      This member currently does not hold any open lots or positions in the trading ledger.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs font-sans border-collapse">
                      <thead>
                        <tr className="border-b border-border-subtle/50 text-text-muted text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-2">Ticker</th>
                          <th className="py-2.5 px-2 text-center">Side</th>
                          <th className="py-2.5 px-2 text-right">Quantity</th>
                          <th className="py-2.5 px-2 text-right">Entry Price</th>
                          <th className="py-2.5 px-2 text-right">Total Value</th>
                          <th className="py-2.5 px-2 text-right">Entry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle/30">
                        {positions.map((pos) => (
                          <tr key={pos.id} className="hover:bg-surface-hover-subtle transition-colors">
                            <td className="py-2.5 px-2 font-medium text-text-primary">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{pos.tickerSymbol}</span>
                                <span className="text-[10px] text-text-muted truncate max-w-[90px]">
                                  {pos.companyName}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="text-[10px] font-semibold text-profit-num">
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-text-primary">
                              {pos.quantity.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-text-secondary">
                              {pos.entryPrice.toFixed(2)} EGP
                            </td>
                            <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-text-primary">
                              {formatCurrency(pos.totalExposure)}
                            </td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-text-muted text-[11px]">
                              {formatDate(pos.entryDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: SYSTEM & ROLE */}
            {/* ========================================================= */}
            {activeTab === 'system' && (
              <div className="space-y-7">
                {/* Role-Based Access Control */}
                <div className="space-y-3">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Role-Based Access Control
                  </div>
                  <p className="text-text-muted text-[11px]">
                    Changing the user role grants or revokes administrative, pro analytics, or platform console privileges.
                  </p>

                  <div className="space-y-2 pt-1">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full bg-surface-input border border-border-default text-text-primary text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-border-hover font-sans"
                    >
                      <option value="user">User (Standard Tier)</option>
                      <option value="pro">Pro (Platform Analytics)</option>
                      <option value="analyst">Analyst (Research & Signals)</option>
                      <option value="admin">Admin (Operational Console)</option>
                      <option value="superadmin">Superadmin (Privileged Access)</option>
                    </select>

                    <button
                      type="button"
                      disabled={isSavingRole || selectedRole === user.role}
                      onClick={handleSaveRole}
                      className="w-full py-2 px-4 rounded-lg bg-white text-black font-semibold text-xs hover:bg-cold-gray-150 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      {isSavingRole && <InlineSpinner className="w-3.5 h-3.5" />}
                      <span>Save Role Changes</span>
                    </button>
                  </div>
                </div>

                {/* Account Identifiers Metadata List */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Account Identifiers & Auth
                  </div>

                  <div className="divide-y divide-border-subtle/40">
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Authentication Method</span>
                      <span className="text-text-primary text-xs font-medium">{user.authProvider}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Registered Date</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">{formatDate(user.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Last Login / Active</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">{formatDate(user.lastActiveAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Profile Updated</span>
                      <span className="text-text-primary text-xs font-medium tabular-nums">{formatDate(user.updatedAt)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-text-muted text-xs">Internal UUID</span>
                      <span className="text-text-muted text-[11px] tabular-nums select-all font-sans">{user.id}</span>
                    </div>
                  </div>
                </div>

                {/* Signal Inbox Re-sync */}
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Signal Diagnostics
                  </div>
                  <p className="text-text-muted text-[11px]">
                    If a user reports an empty notification drawer, re-seed canonical strategy signals into their account inbox.
                  </p>

                  <button
                    type="button"
                    disabled={isReseedingAlerts}
                    onClick={handleReseedAlerts}
                    className="w-full py-2 px-3 border border-border-default hover:bg-surface-hover-subtle text-text-secondary hover:text-text-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 text-xs font-sans"
                  >
                    {isReseedingAlerts && <InlineSpinner className="w-3.5 h-3.5" />}
                    <Zap className="w-3.5 h-3.5 text-text-muted" />
                    <span>Re-seed Canonical Signals Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

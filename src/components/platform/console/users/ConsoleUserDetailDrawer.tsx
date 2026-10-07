'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Smartphone,
  Award,
  CheckCircle2,
  AlertCircle,
  Bell,
  Briefcase,
  User,
  Zap,
} from '@/components/ui/icon-library';
import {
  updateUserRoleAction,
  grantProAccessAction,
  seedUserNotificationsAction,
} from '@/lib/server/console-actions';
import type { ConsoleUserRowItem } from '@/lib/server/console-queries';
import InlineSpinner from '@/components/ui/InlineSpinner';

interface UserDetailProps {
  user: ConsoleUserRowItem;
  onClose: () => void;
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
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 border border-white/10">
        {initials || <User className="w-4 h-4 text-zinc-400" />}
      </div>
    );
  }

  return (
    <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black">
      <img
        src={src}
        alt={name}
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
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'diagnostics'>('profile');
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isGrantingSub, setIsGrantingSub] = useState(false);
  const [isReseedingAlerts, setIsReseedingAlerts] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const handleGrantAccess = async (days: number, tier: string = 'pro_monthly') => {
    setIsGrantingSub(true);
    setMessage(null);
    try {
      const res = await grantProAccessAction({
        targetUserId: user.id,
        days,
        tier,
      });
      if (res.success) {
        setMessage({ text: `Granted ${days} days ${tier.replace('_', ' ')} access successfully`, type: 'success' });
        onRefresh?.();
      } else {
        setMessage({ text: 'Failed to grant access', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: String(err), type: 'error' });
    } finally {
      setIsGrantingSub(false);
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
        setMessage({ text: `Seeded ${res.seededCount} canonical signals into user inbox`, type: 'success' });
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative z-10 w-full max-w-lg bg-black border-l border-white/10 h-full flex flex-col rounded-none shadow-2xl select-none"
        >
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black">
            <div className="flex items-center gap-3 min-w-0">
              <DrawerUserAvatar src={user.avatarUrl} name={user.fullName || 'Member'} />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white truncate">
                  {user.fullName || 'Ticknal Member'}
                </h2>
                <p className="text-xs text-zinc-400 truncate tabular-nums">
                  {user.email || 'No email attached'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center border-b border-white/10 px-5 text-xs bg-black">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Access & Role
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'subscription'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Membership Pass
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`py-3 px-3 font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Diagnostics & Signals
            </button>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`mx-5 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 text-xs text-zinc-300">
            {/* TAB 1: Profile & RBAC */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="border border-white/10 p-4 rounded-xl space-y-3 bg-black">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>Role-Based Access Control</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Changing the user role grants or revokes administrative, pro analytics, or platform console privileges.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-zinc-400">Assigned Platform Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full bg-black border border-white/20 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-white"
                    >
                      <option value="user">User (Standard Tier)</option>
                      <option value="pro">Pro (Full Platform Analytics)</option>
                      <option value="analyst">Analyst (Research & Signals)</option>
                      <option value="admin">Admin (Operational Console)</option>
                      <option value="superadmin">Superadmin (Privileged Access)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={isSavingRole || selectedRole === user.role}
                      onClick={handleSaveRole}
                      className="w-full py-2 px-4 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSavingRole && <InlineSpinner className="w-3.5 h-3.5" />}
                      <span>Save Role Changes</span>
                    </button>
                  </div>
                </div>

                <div className="border border-white/10 p-4 rounded-xl space-y-2 bg-black text-[11px]">
                  <div className="text-white font-medium mb-1">Account Identifiers & Auth</div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Authentication Method:</span>
                    <span className="text-white font-medium">{user.authProvider}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Registered Date:</span>
                    <span className="tabular-nums text-zinc-200">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Profile Updated:</span>
                    <span className="tabular-nums text-zinc-200">{formatDate(user.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Internal UUID:</span>
                    <span className="text-zinc-300 text-[10px] tabular-nums select-all font-sans">{user.id}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Membership Pass */}
            {activeTab === 'subscription' && (
              <div className="space-y-4">
                <div className="border border-white/10 p-4 rounded-xl space-y-3 bg-black">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Current Subscription Status</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {user.subscription.tier.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-b border-white/[0.06] py-2">
                    <div>
                      <span className="text-zinc-400 block">Status:</span>
                      <span className="text-white font-medium capitalize">{user.subscription.status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Provider:</span>
                      <span className="text-white font-medium capitalize">{user.subscription.provider.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Period Ends:</span>
                      <span className="text-white font-medium tabular-nums">{formatDate(user.subscription.currentPeriodEnd)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Days Left:</span>
                      <span className="text-emerald-400 font-semibold tabular-nums">
                        {user.subscription.daysRemaining > 0 ? `${user.subscription.daysRemaining} days` : 'Lapsed / Free'}
                      </span>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-[11px] pt-1">
                    Grant complimentary Pro or Elite membership time directly to this account for promotional, VIP, or customer support purposes.
                  </p>

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button
                      disabled={isGrantingSub}
                      onClick={() => handleGrantAccess(7, 'pro_monthly')}
                      className="py-2 px-3 border border-white/20 hover:border-white text-white font-medium rounded-lg transition-colors text-center cursor-pointer disabled:opacity-40"
                    >
                      + Grant 7 Days Trial
                    </button>
                    <button
                      disabled={isGrantingSub}
                      onClick={() => handleGrantAccess(30, 'pro_monthly')}
                      className="py-2 px-3 border border-white/20 hover:border-white text-white font-medium rounded-lg transition-colors text-center cursor-pointer disabled:opacity-40"
                    >
                      + Grant 30 Days Pro
                    </button>
                    <button
                      disabled={isGrantingSub}
                      onClick={() => handleGrantAccess(365, 'pro_annual')}
                      className="py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-semibold rounded-lg transition-colors text-center cursor-pointer disabled:opacity-40"
                    >
                      + Grant 1 Year Pro
                    </button>
                    <button
                      disabled={isGrantingSub}
                      onClick={() => handleGrantAccess(30, 'elite')}
                      className="py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40 font-semibold rounded-lg transition-colors text-center cursor-pointer disabled:opacity-40"
                    >
                      + Grant Elite VIP (30d)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Diagnostics & Reach */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4">
                {/* Engagement Overview Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-white/10 p-3 rounded-xl bg-black">
                    <div className="text-zinc-400 text-[10px]">Positions Held</div>
                    <div className="text-lg font-bold text-white tabular-nums mt-0.5">{user.positionsCount}</div>
                    <div className="text-zinc-500 text-[9px]">Trading Lots</div>
                  </div>
                  <div className="border border-white/10 p-3 rounded-xl bg-black">
                    <div className="text-zinc-400 text-[10px]">Alert Rules</div>
                    <div className="text-lg font-bold text-white tabular-nums mt-0.5">{user.alertsCount}</div>
                    <div className="text-zinc-500 text-[9px]">Ticker Alerts</div>
                  </div>
                  <div className="border border-white/10 p-3 rounded-xl bg-black">
                    <div className="text-zinc-400 text-[10px]">Push Devices</div>
                    <div className="text-lg font-bold text-white tabular-nums mt-0.5">{user.pushDevicesCount}</div>
                    <div className="text-zinc-500 text-[9px]">Active Tokens</div>
                  </div>
                </div>

                {/* Device Push Reach Section */}
                <div className="border border-white/10 p-4 rounded-xl space-y-2 bg-black">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>Push Notification Reach</span>
                  </div>

                  {user.pushDevicesCount === 0 ? (
                    <div className="py-4 text-center text-zinc-500 text-[11px]">
                      No active web push or mobile FCM device tokens registered.
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="text-white font-medium">Device Token Active</div>
                        <div className="text-zinc-400 text-[10px]">WebPush / FCM Reachable</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Reachable
                      </span>
                    </div>
                  )}
                </div>

                {/* Reseed Alerts Action */}
                <div className="border border-white/10 p-4 rounded-xl space-y-3 bg-black">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Signal Inbox Re-sync</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    If a user reports an empty notification drawer, you can instantly re-seed active canonical strategy signals for their account.
                  </p>

                  <button
                    disabled={isReseedingAlerts}
                    onClick={handleReseedAlerts}
                    className="w-full py-2 px-3 border border-white/20 hover:border-white text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    {isReseedingAlerts && <InlineSpinner className="w-3.5 h-3.5" />}
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Re-seed Canonical Signals Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

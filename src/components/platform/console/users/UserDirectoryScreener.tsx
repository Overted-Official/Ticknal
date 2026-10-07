'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpRight,
  User,
  Shield,
  Layers,
  Smartphone,
  Globe,
} from '@/components/ui/icon-library';
import type { ConsoleUserRowItem } from '@/lib/server/console-queries';

interface UserDirectoryScreenerProps {
  users: ConsoleUserRowItem[];
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
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function UserDirectoryScreener({
  users,
  onSelectUser,
}: UserDirectoryScreenerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'paid' | 'annual' | 'free' | 'staff'>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Segment filter
      if (selectedSegment === 'paid' && (u.subscription.tier === 'free' || u.subscription.status !== 'active')) {
        return false;
      }
      if (selectedSegment === 'annual' && u.subscription.tier !== 'pro_annual') {
        return false;
      }
      if (selectedSegment === 'free' && u.subscription.tier !== 'free') {
        return false;
      }
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
            placeholder="Search by name, email, or UUID..."
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Segment Filter Pills */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15 overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              { id: 'all', label: `All (${users.length})` },
              { id: 'paid', label: 'Paid Seats' },
              { id: 'annual', label: 'Annual Lock' },
              { id: 'free', label: 'Free Tier' },
              { id: 'staff', label: 'Staff' },
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

      {/* Screener Table */}
      <div className="border border-white/10 bg-transparent rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                <th className="py-2.5 px-4 text-left font-medium">Member Profile</th>
                <th className="py-2.5 px-3 text-left font-medium">Plan Tier</th>
                <th className="py-2.5 px-3 text-left font-medium">Renewal Status</th>
                <th className="py-2.5 px-3 text-center font-medium">Engagement</th>
                <th className="py-2.5 px-3 text-left font-medium">Auth / Role</th>
                <th className="py-2.5 pr-4 pl-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No members match your search or segment filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPaid = u.subscription.tier !== 'free' && u.subscription.status === 'active';
                  const isExpiringSoon = isPaid && u.subscription.daysRemaining <= 14;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => onSelectUser(u)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* 1. Member Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <ScreenerUserAvatar src={u.avatarUrl} name={u.fullName || 'Member'} />
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span>{u.fullName || 'Anonymous Member'}</span>
                              {(u.role === 'admin' || u.role === 'superadmin') && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                  STAFF
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                              {u.email || u.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Plan Tier */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight border capitalize ${getTierBadgeClass(
                            u.subscription.tier
                          )}`}
                        >
                          {u.subscription.tier.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 3. Renewal Status */}
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-white text-[11px] font-medium tabular-nums">
                                {u.subscription.daysRemaining} days left
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Exp: {formatDate(u.subscription.currentPeriodEnd)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-zinc-400">
                            Free Member (No expiry)
                          </div>
                        )}
                      </td>

                      {/* 4. Engagement Metrics */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-2 text-zinc-400 text-[11px] tabular-nums">
                          <span
                            title="Open Positions"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/5"
                          >
                            <Layers className="w-3 h-3 text-blue-400" />
                            <span className="text-white font-medium">{u.positionsCount}</span>
                          </span>
                          <span
                            title="Active Alerts"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/5"
                          >
                            <Smartphone className="w-3 h-3 text-emerald-400" />
                            <span className="text-white font-medium">{u.pushDevicesCount}</span>
                          </span>
                        </div>
                      </td>

                      {/* 5. Auth / Role */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="text-white text-[11px] font-medium capitalize flex items-center gap-1">
                            <Globe className="w-3 h-3 text-zinc-400" />
                            {u.authProvider}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Joined {formatDate(u.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* 6. Action */}
                      <td className="py-3 pr-4 pl-2 text-right">
                        <button
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

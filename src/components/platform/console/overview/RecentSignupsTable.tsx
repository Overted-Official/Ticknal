'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, User } from '@/components/ui/icon-library';

export interface RecentSignupItem {
  id: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  tier: string;
  status: string;
  authProvider: string;
}

interface RecentSignupsTableProps {
  signups: RecentSignupItem[];
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

function UserAvatar({ src, name }: { src: string | null; name: string }) {
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

export default function RecentSignupsTable({ signups }: RecentSignupsTableProps) {
  const [filter, setFilter] = useState<'all' | 'paying' | 'google'>('all');

  const filtered = signups.filter((s) => {
    if (filter === 'paying') return s.tier !== 'free';
    if (filter === 'google') return s.authProvider.toLowerCase().includes('google');
    return true;
  });

  return (
    <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-4">
      {/* Table Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Recent Account Onboarding Stream
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Verified platform accounts ordered by registration timestamp
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
              All Signups
            </button>
            <button
              type="button"
              onClick={() => setFilter('paying')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'paying'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paid Seats
            </button>
            <button
              type="button"
              onClick={() => setFilter('google')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'google'
                  ? 'bg-white/15 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Google OAuth
            </button>
          </div>

          <Link
            href="/console/users"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors ml-2"
          >
            <span>Directory</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Screener Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium">
              <th className="pb-2 text-left font-medium">Member</th>
              <th className="pb-2 text-left font-medium">Auth Method</th>
              <th className="pb-2 text-left font-medium">Plan Tier</th>
              <th className="pb-2 text-left font-medium">Role</th>
              <th className="pb-2 text-right font-medium">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-zinc-500">
                  No accounts match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                >
                  {/* Member info with avatar */}
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar src={user.avatarUrl} name={user.fullName} />
                      <div className="min-w-0">
                        <Link
                          href={`/console/users?search=${encodeURIComponent(user.email || user.fullName)}`}
                          className="font-medium text-white truncate block group-hover:text-blue-400 transition-colors"
                        >
                          {user.fullName}
                        </Link>
                        <span className="text-[11px] text-zinc-400 truncate block">
                          {user.email || 'No email attached'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Auth Provider */}
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px] text-zinc-300 font-medium">
                      {user.authProvider}
                    </span>
                  </td>

                  {/* Plan Tier Badge */}
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getTierBadgeClass(
                        user.tier
                      )}`}
                    >
                      {user.tier.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="py-2.5 pr-4">
                    <span className="text-[11px] text-zinc-400 capitalize">
                      {user.role}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="py-2.5 pl-4 text-right tabular-nums text-zinc-300 font-medium">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

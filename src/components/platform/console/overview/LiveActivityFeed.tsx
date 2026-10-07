'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, UserPlus, CreditCard, ShieldAlert } from '@/components/ui/icon-library';

export interface ActivityEvent {
  id: string | number;
  type?: 'signup' | 'subscription' | 'admin' | 'log';
  title: string;
  description: string;
  badge: string;
  badgeColor: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'gray';
  timestamp: string;
}

interface LiveActivityFeedProps {
  events: ActivityEvent[];
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getBadgeClasses(color: ActivityEvent['badgeColor']) {
  switch (color) {
    case 'emerald':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'blue':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'purple':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'amber':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'rose':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default:
      return 'bg-white/10 text-zinc-300 border border-white/10';
  }
}

function getActivityIcon(type?: string) {
  switch (type) {
    case 'signup':
      return <UserPlus className="w-3.5 h-3.5 text-blue-400" />;
    case 'subscription':
      return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
    case 'admin':
      return <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

export default function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  return (
    <div className="border border-white/10 p-4 sm:p-5 bg-transparent rounded-xl space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Commercial Activity & Event Log
          </h3>
        </div>
        <Link
          href="/console/operations#section-ops-audit"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <span>Operations Log</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No platform events recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
          {events.map((ev) => (
            <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="mt-0.5 shrink-0 p-1 rounded-md bg-white/[0.04] border border-white/10">
                  {getActivityIcon(ev.type)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white tracking-tight">
                      {ev.title}
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.2 rounded-full uppercase tracking-wider ${getBadgeClasses(
                        ev.badgeColor
                      )}`}
                    >
                      {ev.badge}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5 truncate max-w-xl">
                    {ev.description}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-zinc-500 tabular-nums shrink-0 mt-0.5">
                {formatTime(ev.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

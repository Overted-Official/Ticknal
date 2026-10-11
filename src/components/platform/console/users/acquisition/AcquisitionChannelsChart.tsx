'use client';

import React from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface ChannelsChartProps {
  channels: ConsoleAcquisitionStats['channels'];
}

export default function AcquisitionChannelsChart({ channels }: ChannelsChartProps) {
  const totalSessions = channels.reduce((acc, c) => acc + c.count, 0) || 1;
  const totalUsers = channels.reduce((acc, c) => acc + (c.uniqueUsers || 1), 0);

  return (
    <div className="w-full h-full bg-surface-base overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0">
        <div>
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Acquisition Channels
          </h4>
          <span className="text-[10px] text-text-muted">Multi-touch inbound attribution</span>
        </div>
        <span className="text-[11px] text-text-muted tabular-nums">
          {channels.length} channels
        </span>
      </div>

      {/* Body: Channels List */}
      <div className="p-5 flex-1 space-y-4 overflow-y-auto custom-scrollbar">
        {channels.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs">
            No channel attribution events recorded in this timeframe.
          </div>
        ) : (
          channels.map((ch) => {
            const barWidth = Math.max(4, Math.min(100, ch.percentage));
            const userLabel = (ch.uniqueUsers || 1) === 1 ? 'user' : 'users';

            return (
              <div key={ch.id} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary truncate">
                    {ch.label}
                  </span>

                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <span className="text-text-muted text-[11px] tabular-nums">
                      {ch.count} {ch.count === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="font-semibold text-text-primary tabular-nums text-xs min-w-[32px]">
                      {ch.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-1.5 bg-surface-input rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Sub-row: Verified Users & Paid Status */}
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                  <span className="tabular-nums">
                    {ch.uniqueUsers || 1} {userLabel} · {ch.paidConversions} paying subscriber{ch.paidConversions === 1 ? '' : 's'}
                  </span>
                  {ch.paidConversions > 0 && (
                    <span className="text-profit-num font-medium text-[10.5px]">
                      Paying source
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-2.5 border-t border-border-default/60 bg-surface-input/20 flex items-center justify-between text-[11px] text-text-muted shrink-0">
        <span>Total Channel Volume</span>
        <span className="font-semibold text-text-primary tabular-nums">
          {totalSessions.toLocaleString()} sessions · {totalUsers} {totalUsers === 1 ? 'user' : 'users'}
        </span>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Share2, TrendingUp, Users, ArrowUpRight } from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface ChannelsChartProps {
  channels: ConsoleAcquisitionStats['channels'];
}

export default function AcquisitionChannelsChart({ channels }: ChannelsChartProps) {
  const totalUsers = channels.reduce((acc, c) => acc + c.count, 0) || 1;

  return (
    <div className="w-full h-full bg-surface-base border border-border-default rounded-none overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-brand-blue" />
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Acquisition Channels
          </h4>
        </div>
        <span className="text-[10px] text-text-muted">Multi-touch attribution</span>
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

            return (
              <div key={ch.id} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ch.color || '#38bdf8' }}
                    />
                    <span className="font-medium text-text-primary truncate">
                      {ch.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <span className="text-text-muted text-[11px] tabular-nums">
                      {ch.count} {ch.count === 1 ? 'user' : 'users'}
                    </span>
                    <span className="font-semibold text-text-primary tabular-nums text-xs min-w-[32px]">
                      {ch.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-surface-input rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: ch.color || '#38bdf8',
                    }}
                  />
                </div>

                {/* Sub-row: Paid Conversion Rate */}
                <div className="flex items-center justify-between text-[10.5px] text-text-muted pt-0.5">
                  <span className="tabular-nums">
                    {ch.paidConversions} Paid ({ch.conversionRate}% conversion)
                  </span>
                  {ch.conversionRate > 0 && (
                    <span className="text-profit-num font-medium flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>Paying source</span>
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
        <span>Total Channel Touches</span>
        <span className="font-semibold text-text-primary tabular-nums">
          {totalUsers.toLocaleString()} sessions
        </span>
      </div>
    </div>
  );
}

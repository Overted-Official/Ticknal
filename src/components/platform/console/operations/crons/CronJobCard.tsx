'use client';

import React from 'react';
import { Play, Terminal, Zap, Shield, Layers, Radio } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { CronJobItem } from '@/lib/server/console-queries';

interface CronJobCardProps {
  job: CronJobItem;
  isRunning: boolean;
  disabled: boolean;
  onRun: () => void;
}

function getIconForJob(id: string) {
  switch (id) {
    case 'update-stocks':
      return <Layers className="w-4 h-4 text-blue-400" />;
    case 'process-signals':
      return <Zap className="w-4 h-4 text-emerald-400" />;
    case 'update-funds':
      return <Terminal className="w-4 h-4 text-purple-400" />;
    case 'update-commodities':
      return <Radio className="w-4 h-4 text-amber-400" />;
    case 'watchdog':
      return <Shield className="w-4 h-4 text-cyan-400" />;
    default:
      return <Terminal className="w-4 h-4 text-white/50" />;
  }
}

export default function CronJobCard({
  job,
  isRunning,
  disabled,
  onRun,
}: CronJobCardProps) {
  return (
    <article className="operations-job-card">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="operations-icon-tile" aria-hidden="true">
              {getIconForJob(job.id)}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight">
                {job.name}
              </h4>
              <span className="text-[10px] text-white/50 font-medium tabular-nums">
                {job.schedule}
              </span>
            </div>
          </div>

          <span className="badge badge-profit !text-[10px] !min-h-5 !px-2">
            <span className="status-dot !bg-emerald-400" aria-hidden="true" />
            Scheduled
          </span>
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed">
          {job.desc}
        </p>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-white/40 font-sans tabular-nums">
          {job.source}
        </span>

        <button
          disabled={disabled || isRunning}
          onClick={onRun}
          className="btn-token btn-secondary btn-compact disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`Run ${job.name} now`}
        >
          {isRunning ? (
            <InlineSpinner className="w-3 h-3" label="Running" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>Run Now</span>
        </button>
      </div>
    </article>
  );
}

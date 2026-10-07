'use client';

import React, { useState } from 'react';
import { Play, Terminal, Zap, Shield, Layers, Radio } from '@/components/ui/icon-library';
import { triggerCronAction } from '@/lib/server/console-actions';
import InlineSpinner from '@/components/ui/InlineSpinner';
import type { CronJobItem } from '@/lib/server/console-queries';

interface OperationsCronsRunnerProps {
  crons: CronJobItem[];
  onRefresh?: () => void;
}

export default function OperationsCronsRunner({
  crons,
  onRefresh,
}: OperationsCronsRunnerProps) {
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    setFeedback(null);
    try {
      const res = await triggerCronAction(jobId);
      if (res.success) {
        setFeedback(`Job "${jobId}" executed successfully.`);
        onRefresh?.();
      } else {
        setFeedback(`Job error: ${res.error}`);
      }
    } catch (err) {
      setFeedback(`Error: ${String(err)}`);
    } finally {
      setRunningJobId(null);
    }
  };

  const getIconForJob = (id: string) => {
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
        return <Terminal className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div className="border border-white/20 p-3 bg-black/60 rounded-xl text-xs text-white flex items-center justify-between">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid of Cron Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {crons.map((job) => {
          const isRunning = runningJobId === job.id;

          return (
            <div
              key={job.id}
              className="border border-white/10 p-4 bg-transparent rounded-xl flex flex-col justify-between space-y-3 hover:border-white/20 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      {getIconForJob(job.id)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white tracking-tight">
                        {job.name}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {job.schedule}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] font-semibold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    Active
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {job.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {job.source}
                </span>

                <button
                  disabled={isRunning || runningJobId !== null}
                  onClick={() => handleRunJob(job.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isRunning ? (
                    <InlineSpinner className="w-3 h-3" label="Running" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>Run Now</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { triggerCronAction } from '@/lib/server/console-actions';
import { AlertTriangle, CheckCircle2 } from '@/components/ui/icon-library';
import CronJobCard from './crons/CronJobCard';
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
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    setFeedback(null);
    try {
      const res = await triggerCronAction(jobId);
      if (res.success) {
        setFeedback({ tone: 'success', message: `Job "${jobId}" executed successfully.` });
        onRefresh?.();
      } else {
        setFeedback({ tone: 'error', message: `Job error: ${res.error}` });
      }
    } catch (err) {
      setFeedback({ tone: 'error', message: `Error: ${String(err)}` });
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`operations-feedback operations-feedback-${feedback.tone}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2 min-w-0">
            {feedback.tone === 'success' ? (
              <CheckCircle2 className="operations-feedback-icon text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="operations-feedback-icon text-rose-400" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="drawer-close-btn !w-6 !h-6"
            aria-label="Dismiss job status"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {/* Grid of Cron Cards */}
      <div className="operations-jobs-grid">
        {crons.map((job) => (
          <CronJobCard
            key={job.id}
            job={job}
            isRunning={runningJobId === job.id}
            disabled={runningJobId !== null}
            onRun={() => handleRunJob(job.id)}
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface SystemLogsKpiRailProps {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

export default function SystemLogsKpiRail({
  totalLogs,
  errorCount,
  warnCount,
  infoCount,
}: SystemLogsKpiRailProps) {
  return (
    <div className="operations-kpi-rail" aria-label="System diagnostics overview">
      {/* KPI 1: Total Logs */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Total Log Stream
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-neutral">
            Buffered
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {totalLogs}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Records
          </span>
        </div>
      </div>

      {/* KPI 2: Errors */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Error Exceptions
          </span>
          <span
            className={`operations-kpi-chip ${
              errorCount === 0
                ? 'operations-kpi-chip-profit'
                : 'operations-kpi-chip-risk'
            }`}
          >
            {errorCount === 0 ? 'Clear' : 'Action Required'}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span
            className={`text-[16px] sm:text-[22px] font-bold tabular-nums tracking-tight shrink-0 ${
              errorCount > 0 ? 'text-rose-400' : 'text-white'
            }`}
          >
            {errorCount}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Errors
          </span>
        </div>
      </div>

      {/* KPI 3: Warnings */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Warnings
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-warning">
            Notice
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {warnCount}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Warnings
          </span>
        </div>
      </div>

      {/* KPI 4: Info Level */}
      <div className="tv-kpi-card w-full">
        <div className="flex items-center justify-between gap-1 leading-none">
          <span className="text-[11px] sm:text-[12px] font-medium text-white/60 truncate tracking-tight">
            Standard Info Runs
          </span>
          <span className="operations-kpi-chip operations-kpi-chip-info">
            Routine
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 leading-none">
          <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
            {infoCount}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/50 font-medium leading-none">
            Info
          </span>
        </div>
      </div>
    </div>
  );
}

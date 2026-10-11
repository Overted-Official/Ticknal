'use client';

import React from 'react';
import SystemLogsKpiRail from './diagnostics/SystemLogsKpiRail';
import SystemLogsTable from './diagnostics/SystemLogsTable';
import type { SystemLogItem } from '@/lib/server/console-queries';

interface OperationsSystemLogsProps {
  diagnostics: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    systemLogs: SystemLogItem[];
  };
  onSelectLog: (log: SystemLogItem) => void;
}

export default function OperationsSystemLogs({
  diagnostics,
  onSelectLog,
}: OperationsSystemLogsProps) {
  return (
    <div className="space-y-4">
      {/* 1. Diagnostics KPI Rail */}
      <SystemLogsKpiRail
        totalLogs={diagnostics.totalLogs}
        errorCount={diagnostics.errorCount}
        warnCount={diagnostics.warnCount}
        infoCount={diagnostics.infoCount}
      />

      {/* 2. Logs Stream Table */}
      <SystemLogsTable
        logs={diagnostics.systemLogs}
        onSelectLog={onSelectLog}
      />
    </div>
  );
}

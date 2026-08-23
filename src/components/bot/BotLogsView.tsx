'use client';

import React from 'react';
import BotTelemetryPulseCard from './logs/BotTelemetryPulseCard';
import BotTerminalConsoleCard, { type SystemLogItem } from './logs/BotTerminalConsoleCard';

interface BotLogsViewProps {
  monitoredTickersCount: number;
  logs: SystemLogItem[];
  selectedLogLevel: string;
  onSelectLogLevel: (lvl: string) => void;
  logSearch: string;
  onLogSearchChange: (search: string) => void;
  onRefreshLogs: () => void;
}

export default function BotLogsView({
  monitoredTickersCount,
  logs,
  selectedLogLevel,
  onSelectLogLevel,
  logSearch,
  onLogSearchChange,
  onRefreshLogs,
}: BotLogsViewProps) {
  return (
    <div className="page-sections-stack select-none">
      {/* SECTION 1: Telemetry & Engine Health */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Telemetry & Engine Health</h2>
          <p className="section-subtitle">WebSocket data feed latency, candle ingestion synchronization, and universe status</p>
        </div>

        <BotTelemetryPulseCard monitoredTickersCount={monitoredTickersCount} />
      </section>

      {/* SECTION 2: Execution Terminal Console */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Execution Terminal Console</h2>
          <p className="section-subtitle">Live audited event log, signal timestamps, risk evaluations, and execution results</p>
        </div>

        <BotTerminalConsoleCard
          logs={logs}
          selectedLogLevel={selectedLogLevel}
          onSelectLogLevel={onSelectLogLevel}
          logSearch={logSearch}
          onLogSearchChange={onLogSearchChange}
          onRefreshLogs={onRefreshLogs}
        />
      </section>
    </div>
  );
}

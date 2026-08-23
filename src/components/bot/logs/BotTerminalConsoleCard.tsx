'use client';

import React from 'react';
import { Terminal, RefreshCw, Search } from '@/components/ui/icon-library';
import { formatUiLabel } from '@/lib/format-ui-label';

export interface SystemLogItem {
  id: number;
  level: string;
  source: string;
  message: string;
  metadata: any;
  createdAt: string;
}

interface BotTerminalConsoleCardProps {
  logs: SystemLogItem[];
  selectedLogLevel: string;
  onSelectLogLevel: (lvl: string) => void;
  logSearch: string;
  onLogSearchChange: (search: string) => void;
  onRefreshLogs: () => void;
}

export default function BotTerminalConsoleCard({
  logs,
  selectedLogLevel,
  onSelectLogLevel,
  logSearch,
  onLogSearchChange,
  onRefreshLogs,
}: BotTerminalConsoleCardProps) {
  return (
    <div className="card-widget space-y-4 select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-plt-border-soft">
        <h2 className="section-title">Raw Execution Telemetry Console</h2>

        <button
          type="button"
          onClick={onRefreshLogs}
          className="btn-token btn-ghost btn-compact font-sans"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Level Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="pill-switch">
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onSelectLogLevel(lvl)}
              className={`pill-switch-btn ${
                selectedLogLevel === lvl ? 'pill-switch-btn-active font-semibold' : ''
              }`}
            >
              {formatUiLabel(lvl)}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-plt-muted" />
          <input
            type="text"
            placeholder="Filter logs by keyword..."
            value={logSearch}
            onChange={(e) => onLogSearchChange(e.target.value)}
            className="h-8 w-full rounded-xl bg-plt-card border border-plt-border-soft pl-8 pr-3 text-xs font-sans text-plt-text placeholder:text-plt-muted focus:border-plt-border-active focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Terminal Console */}
      <div className="rounded-xl bg-plt-base border border-plt-border-soft p-3 font-sans text-xs h-112 overflow-y-auto space-y-1.5 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 h-full">
            <p className="text-xs font-semibold text-plt-text font-sans">No system logs found.</p>
            <p className="text-[11px] text-plt-muted font-sans mt-1">Adjust the selected filter or search keyword.</p>
          </div>
        ) : (
          logs.map((log) => {
            const levelColor =
              log.level === 'ERROR'
                ? 'text-plt-risk bg-plt-risk/10 border-plt-risk/20'
                : log.level === 'WARN'
                ? 'text-plt-warning bg-plt-warning/10 border-plt-warning/20'
                : log.level === 'DEBUG'
                ? 'text-plt-violet bg-plt-violet/10 border-plt-violet/20'
                : 'text-plt-profit bg-plt-profit/10 border-plt-profit/20';

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1.5 hover:bg-plt-hover/60 rounded-lg px-2 transition-colors leading-relaxed"
              >
                <span className="text-plt-faint shrink-0 select-none text-[11px]">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
                <span className={`badge shrink-0 font-sans ${levelColor}`}>
                  {formatUiLabel(log.level)}
                </span>
                <span className="text-plt-info font-medium shrink-0">[{log.source}]</span>
                <span className="text-plt-subtle break-all">{log.message}</span>
                {log.metadata && (
                  <span className="text-plt-faint text-mini truncate max-w-56 ml-auto">
                    {JSON.stringify(log.metadata)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

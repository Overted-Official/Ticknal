'use client';

import React from 'react';
import { formatUiLabel } from '@/lib/format-ui-label';

interface BotSignalsFeedCardProps {
  logs: any[];
}

export default function BotSignalsFeedCard({ logs }: BotSignalsFeedCardProps) {
  return (
    <div className="card-widget space-y-3 select-none flex flex-col h-[400px]">
      <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft shrink-0">
        <h2 className="section-title">Signal & Execution Stream</h2>
        <span className="chip-token">Live Ingestion</span>
      </div>

      <div className="flex-1 p-2 font-sans text-xs overflow-y-auto space-y-1.5 custom-scrollbar">
        {logs && logs.length > 0 ? (
          logs.map((log: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-plt-surface/50 hover:bg-plt-hover/60 transition-colors text-plt-subtle">
              <div className="flex items-center gap-2 truncate">
                <span className="text-plt-faint font-sans text-[11px]">[{new Date(log.signalTime).toLocaleTimeString()}]</span>
                <span
                  className={`font-semibold text-xs ${
                    log.signalType === 'BUY'
                      ? 'text-plt-profit'
                      : log.signalType.includes('SELL')
                      ? 'text-plt-risk'
                      : 'text-plt-warning'
                  }`}
                >
                  {formatUiLabel(log.signalType)}
                </span>
                <span className="text-plt-text font-bold font-sans">{log.tickerSymbol}</span>
                <span className="font-sans text-plt-muted">@ {Number(log.signalPrice).toFixed(2)} £</span>
              </div>
              <span
                className={`badge font-sans ${
                  log.executed || log.executionStatus === 'FILLED'
                    ? 'badge-profit'
                    : 'badge-warning'
                }`}
              >
                {formatUiLabel(log.executionStatus || 'FILLED')}
              </span>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 h-full">
            <p className="text-xs font-semibold text-plt-text font-sans">No signal events logged yet today.</p>
            <p className="text-[11px] text-plt-muted font-sans mt-1">Signals will appear here live when fired.</p>
          </div>
        )}
      </div>
    </div>
  );
}

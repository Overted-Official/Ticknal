'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpRight, ChevronDown } from '@/components/ui/icon-library';
import type { SystemLogItem } from '@/lib/server/console-queries';

interface SystemLogsTableProps {
  logs: SystemLogItem[];
  onSelectLog: (log: SystemLogItem) => void;
}

function formatTimestamp(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function getLevelBadgeClass(level: string) {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return 'badge-risk';
    case 'WARN':
      return 'badge-warning';
    default:
      return 'badge-info';
  }
}

export default function SystemLogsTable({
  logs,
  onSelectLog,
}: SystemLogsTableProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const distinctSources = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.source))).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesLevel = levelFilter === 'ALL' || l.level.toUpperCase() === levelFilter;
      const matchesSource = sourceFilter === 'ALL' || l.source === sourceFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        l.message.toLowerCase().includes(term) ||
        l.source.toLowerCase().includes(term);
      return matchesLevel && matchesSource && matchesSearch;
    });
  }, [logs, levelFilter, sourceFilter, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="operations-toolbar lg:!flex-row lg:!items-center">
        <div className="operations-search">
          <Search className="operations-search-icon" aria-hidden="true" />
          <label htmlFor="operations-log-search" className="sr-only">Search system logs</label>
          <input
            id="operations-log-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search system logs by message or source..."
            className="input-token"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          {/* Source dropdown */}
          <div className="w-full sm:w-40 shrink-0">
            <label htmlFor="operations-log-source" className="sr-only">Filter logs by source</label>
            <select
              id="operations-log-source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="select-token"
            >
              <option value="ALL">All Sources</option>
              {distinctSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Level Pills */}
          <div className="pill-switch overflow-x-auto" role="group" aria-label="Filter logs by severity">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => {
              const isActive = levelFilter === lvl;
              return (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`pill-switch-btn ${isActive ? 'pill-switch-btn-active' : ''}`}
                  aria-pressed={isActive}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs Stream Table */}
      <div className="operations-table-shell">
        <div className="operations-table-scroll custom-scrollbar">
          <table className="data-table operations-table">
            <caption className="sr-only">System diagnostics and exception log stream</caption>
            <thead>
              <tr>
                <th className="text-left w-24">Level</th>
                <th className="text-left w-40">Source</th>
                <th className="text-left">Log Message</th>
                <th className="text-right w-40">Timestamp</th>
                <th className="text-right w-16">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40 text-xs">
                    No system log entries match your filter.
                  </td>
                </tr>
              ) : (
                (showAll ? filteredLogs : filteredLogs.slice(0, 5)).map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectLog(log);
                      }
                    }}
                    className="group focus-visible:outline-none focus-visible:bg-white/[0.06]"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${log.level} log from ${log.source}`}
                  >
                    <td className="py-2.5 px-4">
                      <span
                        className={`badge !text-[10px] !min-h-5 !px-2 uppercase tracking-wider ${getLevelBadgeClass(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-white/80 font-sans">
                        {log.source}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-white/90 text-xs line-clamp-1 group-hover:text-white transition-colors">
                        {log.message}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-white/50 tabular-nums text-[11px]">
                      {formatTimestamp(log.createdAt)}
                    </td>

                    <td className="py-2.5 pr-4 pl-2 text-right">
                      <ArrowUpRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white inline-block transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Row Counter + Show All / Show Less Toggle Button */}
        <div className="operations-table-footer">
          <span className="tabular-nums">
            Showing <span className="text-white font-medium">{showAll ? filteredLogs.length : Math.min(5, filteredLogs.length)}</span> of <span className="text-white font-medium">{filteredLogs.length}</span> log records
          </span>
          {filteredLogs.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="btn-token btn-secondary btn-compact self-start sm:self-auto"
              aria-expanded={showAll}
            >
              <span>{showAll ? 'Show Less (5)' : `Show All (${filteredLogs.length})`}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showAll ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

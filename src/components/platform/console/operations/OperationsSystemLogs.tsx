'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpRight, Terminal, AlertTriangle, Info, CheckCircle2 } from '@/components/ui/icon-library';
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

export default function OperationsSystemLogs({
  diagnostics,
  onSelectLog,
}: OperationsSystemLogsProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const distinctSources = useMemo(() => {
    return Array.from(new Set(diagnostics.systemLogs.map((l) => l.source))).sort();
  }, [diagnostics.systemLogs]);

  const filteredLogs = useMemo(() => {
    return diagnostics.systemLogs.filter((l) => {
      const matchesLevel = levelFilter === 'ALL' || l.level.toUpperCase() === levelFilter;
      const matchesSource = sourceFilter === 'ALL' || l.source === sourceFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        l.message.toLowerCase().includes(term) ||
        l.source.toLowerCase().includes(term);
      return matchesLevel && matchesSource && matchesSearch;
    });
  }, [diagnostics.systemLogs, levelFilter, sourceFilter, searchTerm]);

  const getLevelBadgeClass = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Diagnostics KPI Rail */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* KPI 1: Total Logs */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Total Log Stream
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-white/10 text-zinc-300 border border-white/10">
              Buffered
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {diagnostics.totalLogs}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Records
            </span>
          </div>
        </div>

        {/* KPI 2: Errors */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Error Exceptions
            </span>
            <span
              className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none ${
                diagnostics.errorCount === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {diagnostics.errorCount === 0 ? 'Clear' : 'Action Required'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span
              className={`text-[16px] sm:text-[22px] font-bold tabular-nums tracking-tight shrink-0 ${
                diagnostics.errorCount > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {diagnostics.errorCount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Errors
            </span>
          </div>
        </div>

        {/* KPI 3: Warnings */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Warnings
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Notice
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {diagnostics.warnCount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Warnings
            </span>
          </div>
        </div>

        {/* KPI 4: Info Level */}
        <div className="tv-kpi-card w-full">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[11px] sm:text-[12px] font-medium text-zinc-400 truncate tracking-tight">
              Standard Info Runs
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold leading-none bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Routine
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 leading-none">
            <span className="text-[16px] sm:text-[22px] font-bold text-white tabular-nums tracking-tight shrink-0">
              {diagnostics.infoCount}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-none">
              Info
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-white/10 p-3 bg-transparent rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search system logs by message or source..."
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-black border border-white/15 text-xs text-white px-2.5 py-1 rounded-lg focus:outline-none focus:border-white cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            {distinctSources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Level Pills */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-black border border-white/15">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => {
              const isActive = levelFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs Stream Table */}
      <div className="border border-white/10 bg-transparent rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                <th className="py-2.5 px-4 text-left font-medium w-24">Level</th>
                <th className="py-2.5 px-3 text-left font-medium w-40">Source</th>
                <th className="py-2.5 px-3 text-left font-medium">Log Message</th>
                <th className="py-2.5 px-3 text-right font-medium w-40">Timestamp</th>
                <th className="py-2.5 pr-4 pl-2 text-right font-medium w-16">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    No system log entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getLevelBadgeClass(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-zinc-300 font-mono">
                        {log.source}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-zinc-200 text-xs line-clamp-1 group-hover:text-white transition-colors">
                        {log.message}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-zinc-400 tabular-nums text-[11px]">
                      {formatTimestamp(log.createdAt)}
                    </td>

                    <td className="py-2.5 pr-4 pl-2 text-right">
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white inline-block transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

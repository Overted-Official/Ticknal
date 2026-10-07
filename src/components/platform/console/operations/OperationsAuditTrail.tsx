'use client';

import React, { useState, useMemo } from 'react';
import { Search, Shield, User } from '@/components/ui/icon-library';
import type { AuditLogItem } from '@/lib/server/console-queries';

interface OperationsAuditTrailProps {
  auditLogs: AuditLogItem[];
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

export default function OperationsAuditTrail({ auditLogs }: OperationsAuditTrailProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAudits = useMemo(() => {
    if (!searchTerm.trim()) return auditLogs;
    const q = searchTerm.toLowerCase();
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.adminEmail.toLowerCase().includes(q) ||
        (a.targetId && a.targetId.toLowerCase().includes(q))
    );
  }, [auditLogs, searchTerm]);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('grant') || action.includes('subscription')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    if (action.includes('role')) {
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }
    if (action.includes('cron')) {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    return 'bg-white/10 text-zinc-300 border border-white/10';
  };

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 p-3 bg-transparent rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by admin, action, or target..."
            className="w-full bg-black border border-white/15 text-white placeholder-zinc-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <span className="text-[11px] text-zinc-400 tabular-nums">
          Showing {filteredAudits.length} of {auditLogs.length} audit records
        </span>
      </div>

      {/* Audit Table */}
      <div className="border border-white/10 bg-transparent rounded-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-[11px] font-medium bg-black">
                <th className="py-2.5 px-4 text-left font-medium">Administrator</th>
                <th className="py-2.5 px-3 text-left font-medium">Action Mutation</th>
                <th className="py-2.5 px-3 text-left font-medium">Target Entity</th>
                <th className="py-2.5 px-3 text-left font-medium">Payload Diff</th>
                <th className="py-2.5 pr-4 pl-3 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    No administrative audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((a) => {
                  const metaString = a.metadata
                    ? typeof a.metadata === 'object'
                      ? JSON.stringify(a.metadata)
                      : String(a.metadata)
                    : null;

                  return (
                    <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                      {/* 1. Admin */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[9px] shrink-0 border border-white/10">
                            <Shield className="w-3 h-3 text-purple-400" />
                          </div>
                          <span className="font-medium text-white truncate max-w-[180px]">
                            {a.adminEmail}
                          </span>
                        </div>
                      </td>

                      {/* 2. Action */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight ${getActionBadgeClass(
                            a.action
                          )}`}
                        >
                          {a.action}
                        </span>
                      </td>

                      {/* 3. Target */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-zinc-300 font-mono truncate max-w-[180px] block">
                          {a.targetId || 'N/A'}
                        </span>
                      </td>

                      {/* 4. Payload Diff */}
                      <td className="py-3 px-3">
                        <span
                          className="text-[11px] text-zinc-400 font-mono truncate max-w-[280px] block"
                          title={metaString || ''}
                        >
                          {metaString || '—'}
                        </span>
                      </td>

                      {/* 5. Timestamp */}
                      <td className="py-3 pr-4 pl-3 text-right text-zinc-400 tabular-nums text-[11px]">
                        {formatTimestamp(a.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

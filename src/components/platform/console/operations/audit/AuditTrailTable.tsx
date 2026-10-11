'use client';

import React, { useState, useMemo } from 'react';
import { Search, Shield, ChevronDown } from '@/components/ui/icon-library';
import type { AuditLogItem } from '@/lib/server/console-queries';

interface AuditTrailTableProps {
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

function getActionBadgeClass(action: string) {
  if (action.includes('grant') || action.includes('subscription')) {
    return 'badge-profit';
  }
  if (action.includes('role')) {
    return 'badge-accent';
  }
  if (action.includes('cron')) {
    return 'badge-info';
  }
  return 'badge-muted';
}

export default function AuditTrailTable({ auditLogs }: AuditTrailTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <div className="operations-toolbar">
        <div className="operations-search">
          <Search className="operations-search-icon" aria-hidden="true" />
          <label htmlFor="operations-audit-search" className="sr-only">Search audit trail</label>
          <input
            id="operations-audit-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by admin, action, or target..."
            className="input-token"
          />
        </div>

        <span className="text-[11px] text-white/50 tabular-nums">
          Showing {filteredAudits.length} of {auditLogs.length} audit records
        </span>
      </div>

      {/* Audit Table */}
      <div className="operations-table-shell">
        <div className="operations-table-scroll custom-scrollbar">
          <table className="data-table operations-table">
            <caption className="sr-only">Administrative security and mutation audit trail</caption>
            <thead>
              <tr>
                <th className="text-left">Administrator</th>
                <th className="text-left">Action Mutation</th>
                <th className="text-left">Target Entity</th>
                <th className="text-left">Payload Diff</th>
                <th className="text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40 text-xs">
                    No administrative audit records match your query.
                  </td>
                </tr>
              ) : (
                (showAll ? filteredAudits : filteredAudits.slice(0, 5)).map((a) => {
                  const metaString = a.metadata
                    ? typeof a.metadata === 'object'
                      ? JSON.stringify(a.metadata)
                      : String(a.metadata)
                    : null;

                  return (
                    <tr key={a.id}>
                      {/* 1. Admin */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center font-bold text-white text-[9px] shrink-0 border border-white/10">
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
                          className={`badge !text-[10px] !min-h-5 !px-2 tracking-tight ${getActionBadgeClass(
                            a.action
                          )}`}
                        >
                          {a.action}
                        </span>
                      </td>

                      {/* 3. Target */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-white/80 font-sans tabular-nums truncate max-w-[180px] block">
                          {a.targetId || 'N/A'}
                        </span>
                      </td>

                      {/* 4. Payload Diff */}
                      <td className="py-3 px-3">
                        <span
                          className="text-[11px] text-white/60 font-sans truncate max-w-[280px] block"
                          title={metaString || ''}
                        >
                          {metaString || '—'}
                        </span>
                      </td>

                      {/* 5. Timestamp */}
                      <td className="py-3 pr-4 pl-3 text-right text-white/50 tabular-nums text-[11px]">
                        {formatTimestamp(a.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Row Counter + Show All / Show Less Toggle Button */}
        <div className="operations-table-footer">
          <span className="tabular-nums">
            Showing <span className="text-white font-medium">{showAll ? filteredAudits.length : Math.min(5, filteredAudits.length)}</span> of <span className="text-white font-medium">{filteredAudits.length}</span> audit records
          </span>
          {filteredAudits.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="btn-token btn-secondary btn-compact self-start sm:self-auto"
              aria-expanded={showAll}
            >
              <span>{showAll ? 'Show Less (5)' : `Show All (${filteredAudits.length})`}</span>
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

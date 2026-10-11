'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsolePageHeader from '../ConsolePageHeader';
import ConsoleSectionNav, { type ConsoleNavSection } from '../ConsoleSectionNav';
import OperationsFeedsWatchdog from './OperationsFeedsWatchdog';
import OperationsCronsRunner from './OperationsCronsRunner';
import OperationsSystemLogs from './OperationsSystemLogs';
import OperationsAuditTrail from './OperationsAuditTrail';
import LogMetadataDrawer from '../logs/LogMetadataDrawer';
import type {
  ConsoleOperationsPageData,
  SystemLogItem,
} from '@/lib/server/console-queries';

interface ConsoleOperationsViewProps {
  data: ConsoleOperationsPageData;
}

const SECTIONS: ConsoleNavSection[] = [
  { id: 'section-ops-feeds', label: 'Data Feeds & Watchdog', shortLabel: 'Feeds' },
  { id: 'section-ops-crons', label: 'Background Crons', shortLabel: 'Crons' },
  { id: 'section-ops-diagnostics', label: 'System Diagnostics', shortLabel: 'Logs' },
  { id: 'section-ops-audit', label: 'Admin Audit Trail', shortLabel: 'Audit' },
];

export default function ConsoleOperationsView({ data }: ConsoleOperationsViewProps) {
  const router = useRouter();
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="command-surface-page flex-1 h-full w-full max-w-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text select-none">
      {/* 1. Header (Breadcrumbs) */}
      <ConsolePageHeader pageTitle="Platform Operations" />

      {/* 2. Floating Section Nav */}
      <ConsoleSectionNav sections={SECTIONS} />

      {/* 3. Sections Stack */}
      <main className="app-page page-sections-stack pb-28 md:pb-20 pt-1 max-w-[1600px] mx-auto w-full px-3 sm:px-6">
        {/* ========================================================= */}
        {/* SECTION 1: DATA FEEDS & WATCHDOG */}
        {/* ========================================================= */}
        <section id="section-ops-feeds" className="section-container" aria-labelledby="section-ops-feeds-title">
          <div className="operations-section-header">
            <h2 id="section-ops-feeds-title" className="section-title">Data Feeds & Ingestion Watchdog</h2>
            <p className="section-subtitle">
              Market data freshness, daily candle ingestion coverage, and tracked securities universe
            </p>
          </div>

          <OperationsFeedsWatchdog
            feeds={data.feeds}
            onRefresh={handleRefresh}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: BACKGROUND CRONS & JOB RUNNER */}
        {/* ========================================================= */}
        <section id="section-ops-crons" className="section-container" aria-labelledby="section-ops-crons-title">
          <div className="operations-section-header">
            <h2 id="section-ops-crons-title" className="section-title">Background Crons & Job Runner</h2>
            <p className="section-subtitle">
              Scheduled automated workers, quantitative recalculations, and on-demand dispatch triggers
            </p>
          </div>

          <OperationsCronsRunner
            crons={data.crons}
            onRefresh={handleRefresh}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: SYSTEM DIAGNOSTICS & LOGS */}
        {/* ========================================================= */}
        <section id="section-ops-diagnostics" className="section-container" aria-labelledby="section-ops-diagnostics-title">
          <div className="operations-section-header">
            <h2 id="section-ops-diagnostics-title" className="section-title">System Diagnostics & Exception Stream</h2>
            <p className="section-subtitle">
              Real-time error monitoring, worker diagnostics, and server exception payloads
            </p>
          </div>

          <OperationsSystemLogs
            diagnostics={data.diagnostics}
            onSelectLog={setSelectedLog}
          />
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: SECURITY & ADMIN AUDIT TRAIL */}
        {/* ========================================================= */}
        <section id="section-ops-audit" className="section-container" aria-labelledby="section-ops-audit-title">
          <div className="operations-section-header">
            <h2 id="section-ops-audit-title" className="section-title">Security & Admin Audit Trail</h2>
            <p className="section-subtitle">
              Immutable compliance ledger of staff mutations, role elevations, and manual license grants
            </p>
          </div>

          <OperationsAuditTrail auditLogs={data.audit.auditLogs} />
        </section>
      </main>

      {/* Log Payload Slide-over Drawer */}
      <LogMetadataDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

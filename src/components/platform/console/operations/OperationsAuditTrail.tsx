'use client';

import React from 'react';
import AuditTrailTable from './audit/AuditTrailTable';
import type { AuditLogItem } from '@/lib/server/console-queries';

interface OperationsAuditTrailProps {
  auditLogs: AuditLogItem[];
}

export default function OperationsAuditTrail({ auditLogs }: OperationsAuditTrailProps) {
  return (
    <div className="space-y-4">
      <AuditTrailTable auditLogs={auditLogs} />
    </div>
  );
}

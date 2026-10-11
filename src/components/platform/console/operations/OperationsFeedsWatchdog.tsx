'use client';

import React from 'react';
import FeedsWatchdogKpiRail from './feeds/FeedsWatchdogKpiRail';
import FeedsWatchdogTable from './feeds/FeedsWatchdogTable';
import type { ConsoleOperationsPageData } from '@/lib/server/console-queries';

interface OperationsFeedsWatchdogProps {
  feeds: ConsoleOperationsPageData['feeds'];
  onRefresh?: () => void;
}

export default function OperationsFeedsWatchdog({
  feeds,
  onRefresh,
}: OperationsFeedsWatchdogProps) {
  return (
    <div className="space-y-4">
      {/* 1. KPI Rail */}
      <FeedsWatchdogKpiRail feeds={feeds} />

      {/* 2. Feeds Table & Ingestion Toolbar */}
      <FeedsWatchdogTable tickers={feeds.tickers} onRefresh={onRefresh} />
    </div>
  );
}

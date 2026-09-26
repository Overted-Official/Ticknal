'use client';

import React from 'react';
import type { FullBacktestReport } from '@/strategies/registry';
import type { ComputedReportMetrics } from '../types';
import KeyStatsGrid from '../components/KeyStatsGrid';
import EquityCurveChart from '../components/EquityCurveChart';
import ExecutionLevelsCard from '../components/ExecutionLevelsCard';

interface PerformanceOverviewTabProps {
  report: FullBacktestReport;
  metrics: ComputedReportMetrics;
  signalAction: 'BUY' | 'HOLD' | 'SELL';
  triggerPrice: number | null;
  reason?: string;
  stopLossPrice: number | null;
  targetPrice: number | null;
  hasRR: boolean;
  rrRatio: number | null;
  riskAmt: number;
  rewardAmt: number;
  riskBarPct: number;
  masterIndex: number | null;
  mdm: number | null;
  initialCapital: number;
}

export default function PerformanceOverviewTab({
  report,
  metrics,
  signalAction,
  triggerPrice,
  reason,
  stopLossPrice,
  targetPrice,
  hasRR,
  rrRatio,
  riskAmt,
  rewardAmt,
  riskBarPct,
  masterIndex,
  mdm,
  initialCapital,
}: PerformanceOverviewTabProps) {
  const { stats, equityCurve } = report;

  return (
    <div className="space-y-8">
      {/* 1. Signal State & Indicators (Top of drawer before key performance metrics) */}
      <ExecutionLevelsCard
        signalAction={signalAction}
        triggerPrice={triggerPrice}
        currencySymbol={metrics.currencySymbol}
        reason={reason}
        stopLossPrice={stopLossPrice}
        targetPrice={targetPrice}
        hasRR={hasRR}
        rrRatio={rrRatio}
        riskAmt={riskAmt}
        rewardAmt={rewardAmt}
        riskBarPct={riskBarPct}
        masterIndex={masterIndex}
        mdm={mdm}
      />

      {/* 2. Key Stats 8-Card Grid */}
      <KeyStatsGrid
        report={report}
        metrics={metrics}
        startDate={stats.startDate}
        endDate={stats.endDate}
      />

      {/* 3. Interactive Equity Growth Curve Chart */}
      <EquityCurveChart
        equityCurve={equityCurve}
        initialCapital={initialCapital}
        currencySymbol={metrics.currencySymbol}
      />
    </div>
  );
}

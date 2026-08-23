'use client';

import React from 'react';
import BotSessionKPIs from './analytics/BotSessionKPIs';
import BotActivePositionsCard, { type ActivePosition } from './analytics/BotActivePositionsCard';
import BotSignalsFeedCard from './analytics/BotSignalsFeedCard';
import BotUniverseMatrixCard, { type TickerWalletItem } from './analytics/BotUniverseMatrixCard';

interface BotAnalyticsViewProps {
  metrics?: {
    realizedPnlEgp: number;
    realizedPnlPct: number;
    unrealizedPnlEgp: number;
    unrealizedPnlPct: number;
    winRateToday: number;
    winningTradesToday: number;
    losingTradesToday: number;
    signalCatchRate: number;
    filledSignalsToday: number;
    totalSignalsToday: number;
    avgHoldingBars: number;
    avgHoldingMinutes: number;
    totalCapitalDeployedEgp: number;
    totalAuthorizedBudgetEgp: number;
    enabledTickersCount: number;
  };
  positions: ActivePosition[];
  tickerWallets: TickerWalletItem[];
  activityLogs: any[];
  onRefresh: () => void;
  onForceClosePosition: (id: number) => void;
  closingPositionId: number | null;
}

export default function BotAnalyticsView({
  metrics,
  positions,
  tickerWallets,
  activityLogs,
  onRefresh,
  onForceClosePosition,
  closingPositionId,
}: BotAnalyticsViewProps) {
  return (
    <div className="page-sections-stack select-none">
      {/* SECTION 1: Session Metrics & Capital Utilization */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Session Metrics & Capital Utilization</h2>
          <p className="section-subtitle">Real-time realized returns, win-rate tracking, and authorized budget deployment</p>
        </div>

        <BotSessionKPIs metrics={metrics} openPositionsCount={positions.length} />
      </section>

      {/* SECTION 2: Live Positions & Signal Execution Stream */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Live Positions & Signal Execution Stream</h2>
          <p className="section-subtitle">Mark-to-market position monitoring and live ingested strategy triggers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <BotActivePositionsCard
            positions={positions}
            onRefresh={onRefresh}
            onForceClose={onForceClosePosition}
            closingPositionId={closingPositionId}
          />
          <BotSignalsFeedCard logs={activityLogs} />
        </div>
      </section>

      {/* SECTION 3: Ticker Universe & Session Exposure Matrix */}
      <section className="section-container section-viewport-fit">
        <div className="flex flex-col gap-0.5">
          <h2 className="section-title">Ticker Universe & Session Exposure Matrix</h2>
          <p className="section-subtitle">Dedicated budget allocation, current market exposure, and trade performance per stock</p>
        </div>

        <BotUniverseMatrixCard
          wallets={tickerWallets}
          enabledCount={metrics?.enabledTickersCount ?? 0}
        />
      </section>
    </div>
  );
}

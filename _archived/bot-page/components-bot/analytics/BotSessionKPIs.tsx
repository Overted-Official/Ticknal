'use client';

import React from 'react';

interface BotSessionKPIsProps {
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
  };
  openPositionsCount: number;
}

export default function BotSessionKPIs({ metrics, openPositionsCount }: BotSessionKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 select-none">
      {/* 1. Session Realized P/L */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Session Realized P&L</div>
        <div className="mt-2">
          <div
            className={`kpi-value ${
              (metrics?.realizedPnlEgp ?? 0) >= 0 ? 'text-plt-profit' : 'text-plt-risk'
            }`}
          >
            {(metrics?.realizedPnlEgp ?? 0) >= 0 ? '+' : ''}
            {(metrics?.realizedPnlEgp ?? 0).toFixed(2)} £
          </div>
          <div className="kpi-meta mt-1 font-sans">
            {(metrics?.realizedPnlPct ?? 0) >= 0 ? '+' : ''}
            {(metrics?.realizedPnlPct ?? 0).toFixed(2)}% net
          </div>
        </div>
      </div>

      {/* 2. Session Unrealized P/L */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Session Floating P&L</div>
        <div className="mt-2">
          <div
            className={`kpi-value ${
              (metrics?.unrealizedPnlEgp ?? 0) >= 0 ? 'text-plt-profit' : 'text-plt-risk'
            }`}
          >
            {(metrics?.unrealizedPnlEgp ?? 0) >= 0 ? '+' : ''}
            {(metrics?.unrealizedPnlEgp ?? 0).toFixed(2)} £
          </div>
          <div className="kpi-meta mt-1 font-sans">
            {openPositionsCount} open position{openPositionsCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* 3. Session Win Rate */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Session Win Rate</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-profit">
            {metrics?.winRateToday?.toFixed(1) ?? '0.0'}%
          </div>
          <div className="kpi-meta mt-1 font-sans">
            {metrics?.winningTradesToday ?? 0} W / {metrics?.losingTradesToday ?? 0} L
          </div>
        </div>
      </div>

      {/* 4. Signal Catch Rate */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Signal Catch Rate</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-profit font-bold">
            {metrics?.signalCatchRate?.toFixed(1) ?? '100.0'}%
          </div>
          <div className="kpi-meta mt-1 font-sans">
            {metrics?.filledSignalsToday ?? 0} / {metrics?.totalSignalsToday ?? 0} filled
          </div>
        </div>
      </div>

      {/* 5. Avg Holding Time */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Avg Holding Time</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-text">
            {metrics?.avgHoldingBars ?? 4.8} bars
          </div>
          <div className="kpi-meta mt-1 font-sans">
            ~{metrics?.avgHoldingMinutes ?? 72} min / trade
          </div>
        </div>
      </div>

      {/* 6. Capital Deployed */}
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Capital Deployed</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-text">
            {(metrics?.totalCapitalDeployedEgp ?? 0).toLocaleString()} £
          </div>
          <div className="kpi-meta mt-1 font-sans">
            of {(metrics?.totalAuthorizedBudgetEgp ?? 0).toLocaleString()} £ cap
          </div>
        </div>
      </div>
    </div>
  );
}

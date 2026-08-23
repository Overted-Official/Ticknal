'use client';

import React from 'react';

interface BotHistoryKPIsProps {
  metrics?: {
    totalTrades: number;
    winRate: number;
    totalPnlPct: number;
    profitFactor: number;
    winningTrades: number;
    losingTrades: number;
  };
}

export default function BotHistoryKPIs({ metrics }: BotHistoryKPIsProps) {
  return (
    <div className="kpi-grid-4 select-none">
      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">All-Time Closed Trades</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-text">
            {metrics?.totalTrades ?? 0}
          </div>
          <div className="kpi-meta mt-1 font-sans">Executed by bot</div>
        </div>
      </div>

      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Historical Win Rate</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-profit">
            {metrics?.winRate?.toFixed(1) ?? '0.0'}%
          </div>
          <div className="kpi-meta mt-1 font-sans">
            {metrics?.winningTrades ?? 0} W / {metrics?.losingTrades ?? 0} L
          </div>
        </div>
      </div>

      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Cumulative Return</div>
        <div className="mt-2">
          <div
            className={`kpi-value ${
              (metrics?.totalPnlPct ?? 0) >= 0 ? 'text-plt-profit' : 'text-plt-risk'
            }`}
          >
            {(metrics?.totalPnlPct ?? 0) >= 0 ? '+' : ''}
            {metrics?.totalPnlPct?.toFixed(2) ?? '0.00'}%
          </div>
          <div className="kpi-meta mt-1 font-sans">Net percentage yield</div>
        </div>
      </div>

      <div className="card-widget-compact flex flex-col justify-between">
        <div className="kpi-title">Profit Factor</div>
        <div className="mt-2">
          <div className="kpi-value text-plt-text">
            {metrics?.profitFactor?.toFixed(2) ?? '0.00'}
          </div>
          <div className="kpi-meta mt-1 font-sans">Gross Win / Gross Loss</div>
        </div>
      </div>
    </div>
  );
}

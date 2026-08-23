'use client';

import React from 'react';

interface BotTelemetryPulseCardProps {
  monitoredTickersCount: number;
}

export default function BotTelemetryPulseCard({ monitoredTickersCount }: BotTelemetryPulseCardProps) {
  return (
    <div className="kpi-grid-3 select-none">
      <div className="card-widget-compact flex items-center justify-between">
        <div>
          <div className="kpi-title">OHLCV Candle Ingestion</div>
          <div className="kpi-value text-plt-profit mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-plt-profit animate-pulse" />
            Synchronized (100%)
          </div>
        </div>
        <span className="chip-token">15m Candles</span>
      </div>

      <div className="card-widget-compact flex items-center justify-between">
        <div>
          <div className="kpi-title">WebSocket Latency</div>
          <div className="kpi-value mt-1 text-plt-text">28 ms</div>
        </div>
        <span className="chip-token chip-success">Ultra-Fast</span>
      </div>

      <div className="card-widget-compact flex items-center justify-between">
        <div>
          <div className="kpi-title">Candles Monitored</div>
          <div className="kpi-value mt-1 text-plt-text">
            {monitoredTickersCount} T0 Stocks
          </div>
        </div>
        <span className="chip-token">Active Universe</span>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { CheckCircle2 } from '@/components/ui/icon-library';

interface BotRiskControlsCardProps {
  maxConcurrentPositions: number;
  eodRule: string;
  dailyLossHaltPct: string;
  brokerMode: string;
  onUpdateSetting: (field: string, value: any) => void;
}

export default function BotRiskControlsCard({
  maxConcurrentPositions,
  eodRule,
  dailyLossHaltPct,
  brokerMode,
  onUpdateSetting,
}: BotRiskControlsCardProps) {
  return (
    <div className="space-y-6 select-none">
      {/* 1. Global Circuit Breakers & Safeguards */}
      <div className="card-widget space-y-4">
        <div className="pb-2 border-b border-plt-border-soft">
          <h2 className="section-title">Global Circuit Breakers & Safeguards</h2>
          <p className="section-subtitle mt-0.5">
            Account-wide circuit breakers and end-of-day liquidation rules.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-plt-muted font-sans">Max Simultaneous Positions</label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxConcurrentPositions}
              onChange={(e) => onUpdateSetting('maxConcurrentPositions', parseInt(e.target.value, 10))}
              className="input-token"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-plt-muted font-sans">EOD Liquidation Policy</label>
            <select
              value={eodRule}
              onChange={(e) => onUpdateSetting('eodRule', e.target.value)}
              className="select-token"
            >
              <option value="CARRY_OVERNIGHT">Carry Overnight (Hold until Target)</option>
              <option value="HARD_CLOSE_EOD">Hard Close at 2:15 PM (Strict T0)</option>
              <option value="PROFIT_CLOSE_EOD">Close at 2:15 PM Only If In Profit</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-plt-muted font-sans">Session Loss Circuit Breaker (%)</label>
            <input
              type="number"
              step="0.5"
              value={dailyLossHaltPct}
              onChange={(e) => onUpdateSetting('dailyLossHaltPct', e.target.value)}
              className="input-token"
            />
          </div>
        </div>
      </div>

      {/* 2. Broker Bridge Mode */}
      <div className="card-widget space-y-4">
        <div className="pb-2 border-b border-plt-border-soft">
          <h2 className="section-title">Broker Bridge Mode</h2>
          <p className="section-subtitle mt-0.5">
            Select simulated paper execution or live order routing via Thndr.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onUpdateSetting('brokerMode', 'PAPER')}
            className={`option-card cursor-pointer ${
              brokerMode === 'PAPER' ? 'option-card-active' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="row-title font-sans font-bold">Thndr Paper Simulation</span>
              {brokerMode === 'PAPER' && <CheckCircle2 size={16} className="text-plt-profit" />}
            </div>
            <p className="text-plt-muted text-xs leading-relaxed font-sans">
              Simulates order fills in memory on 15m candle closes. Zero risk, ideal for validation.
            </p>
          </div>

          <div
            onClick={() => onUpdateSetting('brokerMode', 'THNDR_LIVE')}
            className={`option-card cursor-pointer ${
              brokerMode === 'THNDR_LIVE' ? 'option-card-active' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="row-title font-sans font-bold">Thndr Live Execution</span>
              {brokerMode === 'THNDR_LIVE' && <CheckCircle2 size={16} className="text-plt-profit" />}
            </div>
            <p className="text-plt-muted text-xs leading-relaxed font-sans">
              Dispatches actual buy and sell orders through the Thndr broker execution middleman.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

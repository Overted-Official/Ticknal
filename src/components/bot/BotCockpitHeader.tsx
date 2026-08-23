'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Power, Cpu } from '@/components/ui/icon-library';
import { controlHover, controlTap } from '@/lib/motion';

interface BotCockpitHeaderProps {
  botActive: boolean;
  onToggleBot: () => void;
  isUpdating: boolean;
  marketStatus?: 'OPEN' | 'CLOSED' | 'PRE_MARKET';
  brokerMode?: string;
  strategyShortName: string;
  timeframe: string;
  signalCatchRate: number;
  enabledTickersCount: number;
}

export default function BotCockpitHeader({
  botActive,
  onToggleBot,
  isUpdating,
  marketStatus,
  brokerMode,
  strategyShortName,
  timeframe,
  signalCatchRate,
  enabledTickersCount,
}: BotCockpitHeaderProps) {
  return (
    <div className="command-hero shrink-0 select-none">
      <div className="command-hero-content">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="space-y-2">
            <h1 className="page-title">AI Trading Cockpit</h1>
            <p className="page-subtitle">
              Signal models, automated broker routing, and ticker universe in one focused control plane.
            </p>
          </div>

          <div className="command-actions">
            <motion.button
              type="button"
              onClick={onToggleBot}
              disabled={isUpdating}
              whileHover={controlHover}
              whileTap={controlTap}
              className={`btn-token btn-compact ${
                botActive
                  ? 'btn-secondary text-plt-text border-plt-border-subtle hover:bg-plt-active'
                  : 'btn-primary'
              }`}
            >
              <Power size={16} strokeWidth={2.2} />
              {botActive ? 'Pause bot' : 'Arm bot'}
            </motion.button>

            <span
              className={`chip-token ${
                marketStatus === 'OPEN'
                  ? 'chip-success'
                  : marketStatus === 'PRE_MARKET'
                  ? 'chip-warning'
                  : ''
              }`}
            >
              {marketStatus === 'OPEN' ? 'Market open' : marketStatus === 'PRE_MARKET' ? 'Pre-market' : 'Market closed'}
            </span>

            <span className="chip-token font-sans">
              {brokerMode === 'THNDR_LIVE' ? 'Thndr live execution' : 'Paper simulated router'}
            </span>
          </div>
        </div>

        <div className="model-console">
          <div className="model-console-inner">
            <div className="model-console-row">
              <div>
                <div className="model-console-label">Active model</div>
                <div className="row-title mt-2 font-sans font-bold">{strategyShortName}</div>
              </div>
              <Cpu size={16} className="text-plt-text" />
            </div>

            <div className="signal-ladder" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>

            <div className="model-console-row">
              <div className="model-console-label">Timeframe</div>
              <div className="model-console-value">{timeframe}</div>
            </div>

            <div className="model-console-row">
              <div className="model-console-label">Signal catch rate</div>
              <div className="model-console-value text-plt-text font-bold">
                {signalCatchRate.toFixed(1)}%
              </div>
            </div>

            <div className="model-console-row">
              <div className="model-console-label">Authorized universe</div>
              <div className="model-console-value">
                {enabledTickersCount} tickers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

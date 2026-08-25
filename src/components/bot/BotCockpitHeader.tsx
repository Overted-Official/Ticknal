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
    <div className="card-widget p-3.5 sm:p-4 rounded-2xl bg-plt-card border border-plt-border-soft shrink-0 select-none shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Left Side: Title, Subtitle, and Meta Badges */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                botActive ? 'bg-plt-profit animate-pulse' : 'bg-white/40'
              }`}
            />
            <h1 className="page-title text-base sm:text-lg font-bold tracking-tight text-plt-text">
              AI Trading Cockpit
            </h1>
          </div>

          <p className="page-subtitle text-xs text-plt-muted truncate">
            Signal models, automated broker routing, and ticker universe in one focused control plane.
          </p>

          {/* Meta Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] font-sans">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-plt-text font-medium">
              <Cpu size={11} className="text-plt-muted" />
              <span>{strategyShortName}</span>
              <span className="text-plt-muted">· {timeframe}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                marketStatus === 'OPEN'
                  ? 'bg-plt-profit/10 border-plt-profit/30 text-plt-profit'
                  : marketStatus === 'PRE_MARKET'
                  ? 'bg-plt-warning/10 border-plt-warning/30 text-plt-warning'
                  : 'bg-white/[0.04] border-white/[0.08] text-plt-muted'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  marketStatus === 'OPEN'
                    ? 'bg-plt-profit'
                    : marketStatus === 'PRE_MARKET'
                    ? 'bg-plt-warning'
                    : 'bg-zinc-500'
                }`}
              />
              <span>{marketStatus === 'OPEN' ? 'Market Open' : marketStatus === 'PRE_MARKET' ? 'Pre-Market' : 'Market Closed'}</span>
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-plt-muted">
              {brokerMode === 'THNDR_LIVE' ? 'Thndr Live Execution' : 'Paper Router'}
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-plt-muted tabular-nums">
              {enabledTickersCount} Tickers · {signalCatchRate.toFixed(0)}% Catch
            </span>
          </div>
        </div>

        {/* Right Side: Action Button (Arm / Pause Bot) */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <motion.button
            type="button"
            onClick={onToggleBot}
            disabled={isUpdating}
            whileHover={controlHover}
            whileTap={controlTap}
            className={`btn-token btn-compact px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-xs transition-all cursor-pointer ${
              botActive
                ? 'bg-plt-risk/15 hover:bg-plt-risk/25 text-plt-risk border border-plt-risk/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-white hover:bg-white/90 text-black border border-white shadow-md'
            }`}
          >
            <Power size={14} strokeWidth={2.2} className={botActive ? 'text-plt-risk' : 'text-black'} />
            <span>{botActive ? 'Pause Bot' : 'Arm Bot'}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

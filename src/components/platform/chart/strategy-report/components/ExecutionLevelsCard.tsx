'use client';

import React from 'react';
import { Radio, Activity } from '@/components/ui/icon-library';

interface ExecutionLevelsCardProps {
  signalAction: 'BUY' | 'HOLD' | 'SELL';
  triggerPrice: number | null;
  currencySymbol: string;
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
}

export default function ExecutionLevelsCard({
  signalAction,
  triggerPrice,
  currencySymbol,
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
}: ExecutionLevelsCardProps) {
  const isBuy = signalAction === 'BUY';
  const isSell = signalAction === 'SELL';

  const decisionText = isBuy ? 'Buy' : isSell ? 'Exit / Flat' : 'Hold';
  const decisionColor = isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-brand-blue';

  const miStatus =
    masterIndex !== null
      ? masterIndex < 25
        ? 'Oversold'
        : masterIndex > 75
        ? 'Overbought'
        : 'Neutral'
      : 'Neutral';

  const miColor =
    miStatus === 'Oversold'
      ? 'text-emerald-400'
      : miStatus === 'Overbought'
      ? 'text-rose-400'
      : 'text-white';

  return (
    <section id="section-strategy-execution-setup" className="space-y-3.5 select-none font-sans">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 pb-2.5 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
            Market State
          </h3>
          <p className="text-xs text-white/50 leading-relaxed">
            Current algorithmic execution trigger, bracket boundaries, and cyclical momentum sentiment
          </p>
        </div>
      </div>

      {/* 2-Card KPI Layout: Adjust size to fit side-by-side on all screens without rail */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
        {/* Card 1: Algorithm Decision */}
        <div className="w-full bg-black border border-white/10 hover:border-white/20 transition-all rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[155px] sm:min-h-[170px]">
          {/* Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isBuy
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isSell
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-brand-blue/20 text-brand-blue'
              }`}
            >
              <Radio className="w-3 h-3" strokeWidth={2.4} />
            </div>
            <span className="text-xs sm:text-[13px] font-semibold text-white tracking-tight truncate">
              Algorithm Decision
            </span>
          </div>

          {/* Middle: Decision Value & Subtitle */}
          <div className="flex flex-col mt-2 sm:mt-2.5">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className={`text-base sm:text-[22px] font-bold tracking-tight ${decisionColor}`}>
                {decisionText}
              </span>
              {triggerPrice !== null && (
                <span className="text-xs sm:text-[13px] font-semibold text-white/50 tabular-nums">
                  @ {triggerPrice.toFixed(2)} {currencySymbol}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[12px] text-white/50 truncate mt-1">
              {reason ||
                (isBuy
                  ? 'Active long entry setup triggered'
                  : isSell
                  ? 'Strategy exit rule reached'
                  : 'Position holding / waiting for trigger conditions')}
            </span>
          </div>

          {/* Bottom Visual: Custom execution visual matching card content */}
          {hasRR ? (
            <div className="pt-2 border-t border-white/10 space-y-1 sm:space-y-1.5 tabular-nums">
              <div className="flex justify-between text-[9px] sm:text-[11px] font-semibold truncate">
                <span className="text-loss-num">SL {stopLossPrice!.toFixed(1)}</span>
                <span className="text-white/60">Entry {triggerPrice!.toFixed(1)}</span>
                <span className="text-profit-num">TP {targetPrice!.toFixed(1)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-white/10">
                <div
                  className="bg-loss-num h-full rounded-l-full"
                  style={{ width: `${riskBarPct}%` }}
                />
                <div className="w-0.5 bg-white shrink-0" />
                <div className="bg-profit-num h-full flex-1 rounded-r-full" />
              </div>
              <div className="flex justify-between text-[8px] sm:text-[10px] text-white/50">
                <span>Risk: {riskAmt.toFixed(1)}</span>
                {rrRatio !== null && (
                  <span className="text-white font-medium">R:R {rrRatio.toFixed(1)}x</span>
                )}
                <span>Reward: {rewardAmt.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/10 space-y-1 sm:space-y-1.5">
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                <div
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    isSell
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : 'bg-white/10'
                  }`}
                />
                <div
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    signalAction === 'HOLD'
                      ? 'bg-brand-blue shadow-[0_0_8px_rgba(41,98,255,0.6)]'
                      : 'bg-white/10'
                  }`}
                />
                <div
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    isBuy
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : 'bg-white/10'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[8px] sm:text-[10px] tabular-nums font-medium text-white/40">
                <span className={`truncate ${isSell ? 'text-rose-400 font-semibold' : ''}`}>
                  <span className="sm:hidden">Exit</span>
                  <span className="hidden sm:inline">Exit / Flat</span>
                </span>
                <span className={`truncate text-center ${signalAction === 'HOLD' ? 'text-brand-blue font-semibold' : ''}`}>
                  <span className="sm:hidden">Hold</span>
                  <span className="hidden sm:inline">Hold In-Market</span>
                </span>
                <span className={`truncate text-right ${isBuy ? 'text-emerald-400 font-semibold' : ''}`}>
                  <span className="sm:hidden">Buy</span>
                  <span className="hidden sm:inline">Active Buy</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Master Index (MI) */}
        <div className="w-full bg-black border border-white/10 hover:border-white/20 transition-all rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[155px] sm:min-h-[170px]">
          {/* Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-brand-blue/20 text-brand-blue">
              <Activity className="w-3 h-3" strokeWidth={2.4} />
            </div>
            <span className="text-xs sm:text-[13px] font-semibold text-white tracking-tight truncate">
              Master Index (MI)
            </span>
          </div>

          {/* Middle: Decision (Oversold/Neutral/Overbought) & Score */}
          <div className="flex flex-col mt-2 sm:mt-2.5">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className={`text-base sm:text-[22px] font-bold tracking-tight ${miColor}`}>
                {miStatus}
              </span>
              <span className="text-xs sm:text-[13px] font-semibold text-white/50 tabular-nums">
                ({masterIndex !== null ? masterIndex.toFixed(1) : '—'} / 100)
              </span>
            </div>
            <span className="text-[10px] sm:text-[12px] text-white/50 truncate mt-1">
              {mdm !== null
                ? `MDM: ${mdm.toFixed(2)}%`
                : 'Cyclical Momentum Engine'}
            </span>
          </div>

          {/* Bottom Visual: Precision spectrum gauge matching MI range */}
          <div className="pt-2 border-t border-white/10 space-y-1 sm:space-y-1.5">
            <div className="relative w-full h-1.5 sm:h-2 rounded-full overflow-hidden bg-white/10">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-amber-400/50 to-rose-500 opacity-80" />
              {masterIndex !== null && (
                <div
                  className="absolute top-0 bottom-0 w-2 sm:w-2.5 bg-white rounded-full -ml-1 sm:-ml-1.25 shadow-[0_0_8px_white]"
                  style={{ left: `${Math.min(Math.max(masterIndex, 0), 100)}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[8px] sm:text-[10px] tabular-nums text-white/40 font-medium">
              <span className="text-emerald-400/80">
                <span className="sm:hidden">Oversold</span>
                <span className="hidden sm:inline">0 Oversold</span>
              </span>
              <span className="text-center">
                <span className="sm:hidden">Neutral</span>
                <span className="hidden sm:inline">50 Neutral</span>
              </span>
              <span className="text-rose-400/80 text-right">
                <span className="sm:hidden">Overbought</span>
                <span className="hidden sm:inline">100 Overbought</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

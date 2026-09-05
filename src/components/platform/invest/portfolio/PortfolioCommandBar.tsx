'use client';

import React from 'react';
import {
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  TrendingUp,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface PortfolioCommandBarProps {
  mode: 'live' | 'sandbox';
  onModeChange: (mode: 'live' | 'sandbox') => void;
  stagedCount: number;
  totalValue: number;
  cashBalance: number;
  onResetSandbox: () => void;
  onApplyPlan?: () => void;
}

export default function PortfolioCommandBar({
  mode,
  onModeChange,
  stagedCount,
  totalValue,
  cashBalance,
  onResetSandbox,
  onApplyPlan,
}: PortfolioCommandBarProps) {
  const { isPrivacy } = usePrivacyMode();

  const formatEGP = (val: number) => {
    if (isPrivacy) return '****** £';
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} £`;
  };

  return (
    <div className="w-full bg-plt-card/60 backdrop-blur-md border border-plt-border-soft rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
      {/* Left: Mode Switcher & Title */}
      <div className="flex items-center gap-3">
        <div className="pill-switch">
          <button
            type="button"
            onClick={() => onModeChange('live')}
            className={`pill-switch-btn text-xs font-semibold gap-1.5 ${
              mode === 'live' ? 'pill-switch-btn-active text-plt-text' : 'text-plt-muted hover:text-plt-text'
            }`}
          >
            <ShieldCheck size={14} className={mode === 'live' ? 'text-plt-accent' : ''} />
            <span>Live Portfolio</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('sandbox')}
            className={`pill-switch-btn text-xs font-semibold gap-1.5 ${
              mode === 'sandbox' ? 'pill-switch-btn-active text-plt-accent' : 'text-plt-muted hover:text-plt-text'
            }`}
          >
            <Sparkles size={14} className={mode === 'sandbox' ? 'text-plt-accent' : ''} />
            <span>What-If Sandbox</span>
            {stagedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-plt-accent/20 text-plt-accent font-mono font-bold">
                {stagedCount}
              </span>
            )}
          </button>
        </div>

        {mode === 'sandbox' && stagedCount > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-plt-accent font-mono px-2.5 py-1 rounded-full bg-plt-accent/10 border border-plt-accent/25 animate-pulse">
            <span>●</span>
            <span>{stagedCount} Staged Changes Active</span>
          </span>
        )}
      </div>

      {/* Right: Capital Overview & Controls */}
      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-5">
        {/* Total Capital */}
        <div className="flex items-center gap-2 font-mono">
          <div className="p-1.5 rounded-lg bg-plt-hover text-plt-muted shrink-0 hidden sm:block">
            <TrendingUp size={14} />
          </div>
          <div>
            <span className="text-[10px] text-plt-muted block uppercase font-sans">Portfolio Capital</span>
            <span className="text-sm sm:text-base font-bold text-plt-text">{formatEGP(totalValue)}</span>
          </div>
        </div>

        {/* Available Cash */}
        <div className="flex items-center gap-2 font-mono border-l border-plt-border-soft pl-3 sm:pl-5">
          <div className="p-1.5 rounded-lg bg-plt-hover text-plt-muted shrink-0 hidden sm:block">
            <Wallet size={14} />
          </div>
          <div>
            <span className="text-[10px] text-plt-muted block uppercase font-sans">Unallocated Cash</span>
            <span className="text-sm sm:text-base font-bold text-plt-profit">{formatEGP(cashBalance)}</span>
          </div>
        </div>

        {/* Reset / Actions */}
        {mode === 'sandbox' && stagedCount > 0 && (
          <div className="flex items-center gap-2 border-l border-plt-border-soft pl-3 sm:pl-4">
            <button
              type="button"
              onClick={onResetSandbox}
              title="Reset Sandbox back to Live Portfolio"
              className="p-2 rounded-xl bg-plt-hover text-plt-muted hover:text-plt-text transition-colors flex items-center gap-1 text-xs"
            >
              <RotateCcw size={13} />
              <span className="hidden lg:inline">Reset</span>
            </button>

            {onApplyPlan && (
              <button
                type="button"
                onClick={onApplyPlan}
                className="px-3 py-2 rounded-xl bg-plt-accent text-black font-bold text-xs hover:bg-plt-accent/90 transition-all flex items-center gap-1.5 shadow-md shadow-plt-accent/20"
              >
                <CheckCircle2 size={13} />
                <span>Save Simulation Plan</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

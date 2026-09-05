'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
} from '@/components/ui/icon-library';
import { getTickerQuantMetrics } from '@/lib/portfolio-simulation';

export type InsightTickerData = {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup?: string;
  rotationRegime?: 'Leading' | 'Improving' | 'Weakening' | 'Lagging';
  logoUrl?: string | null;
  currentPrice: number;
  strategyId?: string;
  strategyName?: string;
  signalType?: 'BUY' | 'SELL' | 'HOLD';
  signalDate?: string;
  triggerPrice?: number;
  barsAgo?: number;
  reasoning?: string;
  isHeld?: boolean;
  isStaged?: boolean;
  stagedAction?: 'BUY' | 'EXIT';
};

interface TickerQuickInsightsDrawerProps {
  ticker: InsightTickerData | null;
  isOpen: boolean;
  onClose: () => void;
  onStageBuy: (symbol: string, amount: number, ticker: InsightTickerData) => void;
  onSimulateExit: (symbol: string) => void;
  onRemoveStaged: (symbol: string) => void;
}

export default function TickerQuickInsightsDrawer({
  ticker,
  isOpen,
  onClose,
  onStageBuy,
  onSimulateExit,
  onRemoveStaged,
}: TickerQuickInsightsDrawerProps) {
  const [allocationAmount, setAllocationAmount] = useState<number>(25000);

  if (!ticker) return null;

  const quant = getTickerQuantMetrics(ticker.symbol);
  const cleanSym = ticker.symbol.replace('.CA', '').trim().toUpperCase();

  const stopLossPrice = ticker.currentPrice * 0.94; // 6% risk stop heuristic
  const targetPrice = ticker.currentPrice * 1.15; // 15% upside target
  const riskPerShare = Math.max(0.01, ticker.currentPrice - stopLossPrice);
  const rewardPerShare = Math.max(0.01, targetPrice - ticker.currentPrice);
  const riskRewardRatio = (rewardPerShare / riskPerShare).toFixed(1);

  const regimeBadgeColor =
    ticker.rotationRegime === 'Leading'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
      : ticker.rotationRegime === 'Improving'
      ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
      : ticker.rotationRegime === 'Weakening'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
      : 'bg-red-500/10 text-red-400 border-red-500/25';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          />

          {/* Slide-over Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-tv-base border-l border-plt-border-soft z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-plt-border-soft flex items-center justify-between bg-plt-card/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-plt-hover border border-plt-border-soft flex items-center justify-center font-mono font-bold text-plt-text shrink-0 overflow-hidden">
                  {ticker.logoUrl ? (
                    <img src={ticker.logoUrl} alt={cleanSym} className="w-full h-full object-contain p-1" />
                  ) : (
                    cleanSym.slice(0, 3)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-plt-text font-sans truncate">{cleanSym}</h3>
                    {ticker.rotationRegime && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${regimeBadgeColor}`}>
                        {ticker.rotationRegime}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-plt-muted truncate">{ticker.companyName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {/* Price & Signal Bar */}
              <div className="p-3 rounded-xl bg-plt-card border border-plt-border-soft flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-plt-muted uppercase font-semibold">Current Price</span>
                  <div className="text-xl font-mono font-bold text-plt-text">
                    {ticker.currentPrice.toFixed(2)} £
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-plt-muted uppercase font-semibold">GICS Industry</span>
                  <div className="text-xs font-semibold text-plt-text mt-0.5">
                    {ticker.industryGroup || ticker.sector || 'Equities'}
                  </div>
                </div>
              </div>

              {/* Strategy Alert Insight */}
              <div className="p-3.5 rounded-xl border border-plt-border-soft bg-plt-hover/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-plt-text flex items-center gap-1.5">
                    <Zap size={14} className="text-plt-accent" />
                    <span>{ticker.strategyName || 'PSI Strategy Engine'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-plt-muted">
                    {ticker.barsAgo ? `${ticker.barsAgo} bars ago` : 'Recent alert'}
                  </span>
                </div>

                <p className="text-xs text-plt-muted leading-relaxed font-sans">
                  {ticker.reasoning ||
                    `Algorithmic entry signal triggered based on mean-reversion momentum confirmation and 25 GICS sector alpha wave alignment.`}
                </p>

                {/* Risk / Reward Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-plt-border-soft text-center font-mono">
                  <div className="p-1.5 rounded-lg bg-plt-card border border-plt-border-soft">
                    <span className="text-[9px] text-plt-muted block">Stop Level</span>
                    <span className="text-xs font-semibold text-plt-risk">{stopLossPrice.toFixed(2)} £</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-plt-card border border-plt-border-soft">
                    <span className="text-[9px] text-plt-muted block">Target Price</span>
                    <span className="text-xs font-semibold text-plt-profit">{targetPrice.toFixed(2)} £</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-plt-card border border-plt-border-soft">
                    <span className="text-[9px] text-plt-muted block">R:R Ratio</span>
                    <span className="text-xs font-bold text-plt-text">{riskRewardRatio}:1</span>
                  </div>
                </div>
              </div>

              {/* Quant Track Record Scorecard */}
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase tracking-wider text-plt-muted font-semibold">
                  Quant Historical Track Record (12M)
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-plt-card border border-plt-border-soft">
                    <span className="text-[10px] text-plt-muted">Strategy 12M Return</span>
                    <div className="text-base font-mono font-bold text-plt-profit mt-0.5">
                      +{quant.roi12M.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-plt-card border border-plt-border-soft">
                    <span className="text-[10px] text-plt-muted">Historical Win Rate</span>
                    <div className="text-base font-mono font-bold text-plt-text mt-0.5">
                      {quant.winRate.toFixed(0)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-plt-card border border-plt-border-soft">
                    <span className="text-[10px] text-plt-muted">Avg Holding Duration</span>
                    <div className="text-base font-mono font-bold text-plt-text mt-0.5">
                      {quant.avgBarsPerTrade} Bars
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-plt-card border border-plt-border-soft">
                    <span className="text-[10px] text-plt-muted">Alpha vs EGX30</span>
                    <div className="text-base font-mono font-bold text-plt-accent mt-0.5">
                      +{quant.alpha.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Staging Controls */}
              <div className="p-3.5 rounded-xl border border-plt-accent/30 bg-plt-accent/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-plt-text flex items-center gap-1.5">
                    <Sparkles size={14} className="text-plt-accent" />
                    <span>Rebalancing Sandbox Action</span>
                  </span>
                  {ticker.isStaged && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-plt-accent/20 text-plt-accent font-semibold">
                      Currently Staged
                    </span>
                  )}
                </div>

                {!ticker.isHeld && (
                  <div>
                    <label className="text-[11px] text-plt-muted block mb-1">
                      Simulated Position Allocation (EGP):
                    </label>
                    <div className="flex items-center gap-2">
                      {[15000, 25000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAllocationAmount(amt)}
                          className={`flex-1 py-1 text-xs font-mono rounded-lg border transition-all ${
                            allocationAmount === amt
                              ? 'bg-plt-accent text-black font-bold border-plt-accent'
                              : 'bg-plt-card border-plt-border-soft text-plt-muted hover:text-plt-text'
                          }`}
                        >
                          {(amt / 1000).toFixed(0)}k £
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {ticker.isHeld ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSimulateExit(cleanSym);
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Simulate Exit / Take Profit</span>
                    </button>
                  ) : ticker.isStaged ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveStaged(cleanSym);
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-plt-card hover:bg-plt-hover border border-plt-border-soft text-plt-muted text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Remove from Sandbox</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onStageBuy(cleanSym, allocationAmount, ticker);
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-plt-profit hover:bg-plt-profit/90 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-plt-profit/20"
                    >
                      <Plus size={14} />
                      <span>Stage in Portfolio Sandbox</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-plt-border-soft bg-plt-card/30 flex items-center justify-between">
              <Link
                href={`/invest?ticker=${cleanSym}&view=chart&timeframe=D`}
                className="text-xs font-semibold text-plt-accent hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>Open in Full Interactive Chart</span>
                <ExternalLink size={12} />
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-plt-muted hover:text-plt-text px-3 py-1 rounded-lg bg-plt-hover transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

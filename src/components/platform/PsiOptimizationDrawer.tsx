"use client";

import React, { useState } from "react";
import {
  X,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { CandidateOptimizationResult } from "@/strategies/PSI/psiOptimizer.worker";
import type { PsiStrategyParams } from "@/strategies/PSI/psiStrategy";

type PsiOptimizationDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  model: "psi8" | "psi40";
  trainPeriod: string;
  testPeriod: string;
  totalEvaluated: number;
  candidates: CandidateOptimizationResult[];
  onApplyCombination: (params: PsiStrategyParams, model: "psi8" | "psi40") => void;
  onPreviewCombination?: (params: PsiStrategyParams, model: "psi8" | "psi40") => void;
  activeAppliedIndex?: number;
};

export const PsiOptimizationDrawer: React.FC<PsiOptimizationDrawerProps> = ({
  isOpen,
  onClose,
  symbol,
  model,
  trainPeriod,
  testPeriod,
  totalEvaluated,
  candidates,
  onApplyCombination,
  onPreviewCombination,
  activeAppliedIndex = 0,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const handlePreview = (cand: CandidateOptimizationResult, idx: number) => {
    setPreviewIdx(idx);
    if (onPreviewCombination) {
      onPreviewCombination(cand.params, cand.model);
    }
  };

  const handleApply = (cand: CandidateOptimizationResult, idx: number) => {
    setSelectedIdx(idx);
    onApplyCombination(cand.params, cand.model);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <div className="w-screen max-w-2xl bg-zinc-950/95 border-l border-zinc-800 text-zinc-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                      PSI Walk-Forward Optimization
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {model === "psi40" ? "PSI-40 Trend" : "PSI-8 Inflection"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {symbol} &bull; {totalEvaluated.toLocaleString()} parameter combinations evaluated
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slices Info Banner */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800/60 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <div className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  In-Sample Train Slice
                </div>
                <div className="text-zinc-200 font-mono mt-0.5 text-[11px] font-medium">
                  {trainPeriod}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <div className="text-zinc-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Out-of-Sample Live Test
                </div>
                <div className="text-zinc-200 font-mono mt-0.5 text-[11px] font-medium">
                  {testPeriod}
                </div>
              </div>
            </div>
          </div>

          {/* Body: Candidates List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Top Out-of-Sample Generalization Candidates</span>
              <span>Sorted by Out-of-Sample Alpha</span>
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No candidates met the minimum trade threshold for this ticker.</p>
              </div>
            ) : (
              candidates.map((cand, idx) => {
                const isSelected = selectedIdx === idx;
                const isPreview = previewIdx === idx;
                const isTop1 = idx === 0;

                const oosMargin = cand.testMetrics.roiMargin;
                const oosMarginPositive = oosMargin >= 0;
                const oosWinRate = cand.testMetrics.winRate;
                const oosWinRateHigh = oosWinRate >= 90.0;

                return (
                  <div
                    key={cand.id}
                    className={`rounded-xl border transition-all ${
                      isTop1
                        ? "bg-gradient-to-b from-emerald-950/20 to-zinc-900/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                        : isSelected
                        ? "bg-zinc-900/90 border-cyan-500/50"
                        : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                    } p-4`}
                  >
                    {/* Candidate Card Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        {isTop1 && (
                          <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Award className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span className="font-semibold text-sm text-zinc-100">
                          {cand.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-300">
                          {cand.selectionTier}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(cand, idx)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                            isPreview
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                              : "bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {isPreview ? "Previewing" : "Preview"}
                        </button>
                        <button
                          onClick={() => handleApply(cand, idx)}
                          className={`text-xs px-3 py-1 rounded-lg border transition font-semibold flex items-center gap-1 ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                            </>
                          ) : (
                            "Set as Default"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Out-of-Sample Primary Metrics Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/40">
                        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          OOS Margin
                        </div>
                        <div
                          className={`text-sm font-bold font-mono mt-0.5 ${
                            oosMarginPositive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {oosMargin >= 0 ? `+${oosMargin.toFixed(2)}%` : `${oosMargin.toFixed(2)}%`}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/40">
                        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          OOS Win Rate
                        </div>
                        <div
                          className={`text-sm font-bold font-mono mt-0.5 ${
                            oosWinRateHigh ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {oosWinRate.toFixed(1)}%
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/40">
                        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          OOS Trades
                        </div>
                        <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">
                          {cand.testMetrics.trades}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/40">
                        <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          OOS Max DD
                        </div>
                        <div className="text-sm font-bold font-mono text-zinc-300 mt-0.5">
                          {cand.testMetrics.maxDrawdown.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* In-Sample Train Metrics Footer */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-400 px-1">
                      <span>
                        <span className="text-zinc-500">Train Margin:</span>{" "}
                        <span className="font-mono text-zinc-300">
                          {cand.trainMetrics.roiMargin >= 0
                            ? `+${cand.trainMetrics.roiMargin.toFixed(1)}%`
                            : `${cand.trainMetrics.roiMargin.toFixed(1)}%`}
                        </span>
                      </span>
                      <span>
                        <span className="text-zinc-500">Train Win Rate:</span>{" "}
                        <span className="font-mono text-zinc-300">
                          {cand.trainMetrics.winRate.toFixed(1)}%
                        </span>{" "}
                        ({cand.trainMetrics.trades} trades)
                      </span>
                      <span>
                        <span className="text-zinc-500">Avg Bars:</span>{" "}
                        <span className="font-mono text-zinc-300">
                          {cand.testMetrics.avgBarsPerTrade.toFixed(1)} bars
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 text-xs text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>
                Applying a combination will update live signals and persist for <strong>{symbol}</strong>.
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

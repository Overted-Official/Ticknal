"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Zap,
  CheckCircle2,
  Award,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end pointer-events-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl lg:max-w-3xl h-full bg-[#09090b] border-l border-white/[0.12] text-zinc-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/[0.09] bg-zinc-900/60 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    PSI Walk-Forward Optimization
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {model === "psi40" ? "PSI-40 Trend" : "PSI-8 Inflection"}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  {symbol} &bull; {totalEvaluated.toLocaleString()} parameter combinations evaluated
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/[0.08] rounded-lg transition"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slices Info Banner */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.08] text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.08]">
              <div className="text-white/50 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                In-Sample Train Slice
              </div>
              <div className="text-white/90 font-mono mt-0.5 text-[11px] font-medium">
                {trainPeriod}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.08]">
              <div className="text-white/50 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Out-of-Sample Live Test
              </div>
              <div className="text-white/90 font-mono mt-0.5 text-[11px] font-medium">
                {testPeriod}
              </div>
            </div>
          </div>
        </div>

        {/* Body: Candidates List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-white/40 px-1">
            <span className="font-semibold uppercase tracking-wider">Top Out-of-Sample Generalization Candidates</span>
            <span>Sorted by Out-of-Sample Alpha</span>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50 text-amber-400" />
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
                      ? "bg-gradient-to-b from-emerald-950/25 via-zinc-900/60 to-zinc-950/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                      : isSelected
                      ? "bg-zinc-900/90 border-cyan-500/50 shadow-md"
                      : "bg-zinc-900/40 border-white/[0.08] hover:border-white/[0.16]"
                  } p-4`}
                >
                  {/* Candidate Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      {isTop1 && (
                        <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Award className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className="font-semibold text-sm text-white">
                        {cand.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/[0.06] text-white/70 border border-white/[0.08]">
                        {cand.selectionTier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(cand, idx)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                          isPreview
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                            : "bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-white/80"
                        }`}
                      >
                        {isPreview ? "Previewing" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApply(cand, idx)}
                        className={`text-xs px-3 py-1 rounded-lg border transition font-semibold flex items-center gap-1 ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
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

                  {/* Parameter Pills */}
                  {cand.params && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-0.5 text-[10px] font-mono text-white/60">
                      <div className="flex items-center gap-1 text-white/40 mr-1">
                        <SlidersHorizontal className="w-3 h-3 text-plt-orange" />
                        <span>Config:</span>
                      </div>
                      {Array.isArray(cand.params.entryLevels) && cand.params.entryLevels.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          Levels: <strong className="text-white">{cand.params.entryLevels.map((l) => `${l}%`).join(', ')}</strong>
                        </span>
                      )}
                      {cand.params.aymMultiplier !== null && cand.params.aymMultiplier !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          AYM Mult: <strong className="text-white">{cand.params.aymMultiplier}x</strong>
                        </span>
                      )}
                      {cand.params.aymLimit !== null && cand.params.aymLimit !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          AYM Cap: <strong className="text-white">{cand.params.aymLimit}%</strong>
                        </span>
                      )}
                      {cand.params.atrDistance !== null && cand.params.atrDistance !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          ATR Dist: <strong className="text-white">{cand.params.atrDistance}x</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Out-of-Sample Primary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.08]">
                      <div className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
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

                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.08]">
                      <div className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
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

                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.08]">
                      <div className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                        OOS Trades
                      </div>
                      <div className="text-sm font-bold font-mono text-white/90 mt-0.5">
                        {cand.testMetrics.trades}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.08]">
                      <div className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                        OOS Max DD
                      </div>
                      <div className="text-sm font-bold font-mono text-white/80 mt-0.5">
                        {cand.testMetrics.maxDrawdown.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* In-Sample Train Metrics Footer */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-[11px] text-white/40 gap-2 px-1">
                    <span>
                      <span className="text-white/30">Train Margin:</span>{" "}
                      <span className="font-mono text-white/80">
                        {cand.trainMetrics.roiMargin >= 0
                          ? `+${cand.trainMetrics.roiMargin.toFixed(1)}%`
                          : `${cand.trainMetrics.roiMargin.toFixed(1)}%`}
                      </span>
                    </span>
                    <span>
                      <span className="text-white/30">Train Win Rate:</span>{" "}
                      <span className="font-mono text-white/80">
                        {cand.trainMetrics.winRate.toFixed(1)}%
                      </span>{" "}
                      ({cand.trainMetrics.trades} trades)
                    </span>
                    <span>
                      <span className="text-white/30">Avg Bars:</span>{" "}
                      <span className="font-mono text-white/80">
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
        <div className="p-4 border-t border-white/[0.09] bg-zinc-900/60 text-xs text-white/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Applying a combination will update live signals and persist for <strong>{symbol}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition text-xs shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

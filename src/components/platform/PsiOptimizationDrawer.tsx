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
} from "@/components/ui/icon-library";
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
    <div className="fixed inset-0 z-modal overflow-hidden flex justify-end pointer-events-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-plt-base/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl lg:max-w-4xl h-full bg-plt-base border-l border-plt-border-soft text-plt-text flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-tight text-plt-text font-sans">
                  PSI Walk-Forward Optimization
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-plt-profit/10 text-plt-profit border border-plt-profit/20">
                  {model === "psi40" ? "PSI-40 Trend" : "PSI-8 Inflection"}
                </span>
              </div>
              <p className="text-[10px] text-plt-muted font-sans mt-0.5">
                {symbol} &bull; {totalEvaluated.toLocaleString()} parameter combinations evaluated
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
              title="Close drawer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Slices Info Banner */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-plt-border-soft text-xs">
            <div className="p-2.5 rounded-xl bg-plt-base border border-plt-border-soft">
              <div className="text-plt-muted text-[11px] font-sans flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-plt-warning" />
                In-Sample Train Slice
              </div>
              <div className="text-plt-text font-mono mt-1 text-xs font-semibold">
                {trainPeriod}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-plt-base border border-plt-border-soft">
              <div className="text-plt-muted text-[11px] font-sans flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-plt-profit" />
                Out-of-Sample Live Test
              </div>
              <div className="text-plt-text font-mono mt-1 text-xs font-semibold">
                {testPeriod}
              </div>
            </div>
          </div>
        </div>

        {/* Body: Candidates List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] text-plt-muted px-1 font-sans">
            <span className="font-semibold">Top Out-of-Sample Generalization Candidates</span>
            <span>Sorted by Out-of-Sample Alpha</span>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-16 text-plt-muted font-sans">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50 text-plt-warning" />
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
                  className={`card-widget space-y-3 transition-all ${
                    isTop1
                      ? "border-plt-profit/40 shadow-panel"
                      : isSelected
                      ? "border-plt-border-strong bg-white/[0.03] shadow-md"
                      : "hover:border-plt-border-active"
                  }`}
                >
                  {/* Candidate Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-plt-border-soft">
                    <div className="flex items-center gap-2">
                      {isTop1 && (
                        <span className="p-1 rounded-lg bg-plt-warning/10 text-plt-warning border border-plt-warning/20">
                          <Award size={14} />
                        </span>
                      )}
                      <span className="font-bold text-xs text-plt-text font-sans">
                        {cand.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-plt-base text-plt-muted border border-plt-border-soft">
                        {cand.selectionTier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(cand, idx)}
                        className={`btn-token btn-compact font-sans ${
                          isPreview ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {isPreview ? "Previewing" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApply(cand, idx)}
                        className={`btn-token btn-compact font-sans flex items-center gap-1.5 ${
                          isSelected ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 size={12} /> Applied
                          </>
                        ) : (
                          "Set as Default"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Parameter Pills */}
                  {cand.params && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-plt-muted">
                      <div className="flex items-center gap-1.5 text-plt-muted mr-1">
                        <SlidersHorizontal size={12} className="text-plt-muted" />
                        <span>Config:</span>
                      </div>
                      {Array.isArray(cand.params.entryLevels) && cand.params.entryLevels.length > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-plt-base border border-plt-border-soft">
                          Levels: <strong className="text-plt-text">{cand.params.entryLevels.map((l) => `${l}%`).join(', ')}</strong>
                        </span>
                      )}
                      {cand.params.aymMultiplier !== null && cand.params.aymMultiplier !== undefined && (
                        <span className="px-2 py-0.5 rounded-lg bg-plt-base border border-plt-border-soft">
                          AYM Mult: <strong className="text-plt-text">{cand.params.aymMultiplier}x</strong>
                        </span>
                      )}
                      {cand.params.aymLimit !== null && cand.params.aymLimit !== undefined && (
                        <span className="px-2 py-0.5 rounded-lg bg-plt-base border border-plt-border-soft">
                          AYM Cap: <strong className="text-plt-text">{cand.params.aymLimit}%</strong>
                        </span>
                      )}
                      {cand.params.atrDistance !== null && cand.params.atrDistance !== undefined && (
                        <span className="px-2 py-0.5 rounded-lg bg-plt-base border border-plt-border-soft">
                          ATR Dist: <strong className="text-plt-text">{cand.params.atrDistance}x</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Out-of-Sample Primary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-plt-base border border-plt-border-soft">
                      <div className="text-[10px] text-plt-muted font-semibold uppercase tracking-wider font-sans">
                        OOS Margin
                      </div>
                      <div
                        className={`text-xs font-bold font-mono mt-1 ${
                          oosMarginPositive ? "text-plt-profit" : "text-plt-risk"
                        }`}
                      >
                        {oosMargin >= 0 ? `+${oosMargin.toFixed(2)}%` : `${oosMargin.toFixed(2)}%`}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-plt-base border border-plt-border-soft">
                      <div className="text-[10px] text-plt-muted font-semibold uppercase tracking-wider font-sans">
                        OOS Win Rate
                      </div>
                      <div
                        className={`text-xs font-bold font-mono mt-1 ${
                          oosWinRateHigh ? "text-plt-profit" : "text-plt-warning"
                        }`}
                      >
                        {oosWinRate.toFixed(1)}%
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-plt-base border border-plt-border-soft">
                      <div className="text-[10px] text-plt-muted font-semibold uppercase tracking-wider font-sans">
                        OOS Trades
                      </div>
                      <div className="text-xs font-bold font-mono text-plt-text mt-1">
                        {cand.testMetrics.trades}
                      </div>
                    </div>

                    <span>
                      <span className="text-plt-faint">Train Margin:</span>{" "}
                      <span className="tabular-nums text-plt-subtle">
                        {cand.trainMetrics.roiMargin >= 0
                          ? `+${cand.trainMetrics.roiMargin.toFixed(1)}%`
                          : `${cand.trainMetrics.roiMargin.toFixed(1)}%`}
                      </span>
                    </span>
                    <span>
                      <span className="text-plt-faint">Train Win Rate:</span>{" "}
                      <span className="tabular-nums text-plt-subtle">
                        {cand.trainMetrics.winRate.toFixed(1)}%
                      </span>{" "}
                      ({cand.trainMetrics.trades} trades)
                    </span>
                    <span>
                      <span className="text-plt-faint">Avg Bars:</span>{" "}
                      <span className="tabular-nums text-plt-subtle">
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
        <div className="p-4 border-t border-plt-border bg-plt-elevated/60 text-xs text-plt-muted flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-plt-profit shrink-0" />
            <span className="text-caption sm:text-xs">
              Applying a combination will update live signals and persist for <strong>{symbol}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-plt-muted-surface hover:bg-plt-border text-plt-text font-medium transition text-xs shrink-0"
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

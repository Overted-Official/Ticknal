"use client";

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown } from '@/components/ui/icons';
import { motion } from 'framer-motion';

import { STRATEGIES, getAvailableStrategies } from '@/strategies/registry';
import type { ChartData } from '@/components/platform/ChartWidget';

type SignalData = Record<string, any>; // Make this dynamic since different strategies return different things
// We'll keep some common fields like date, signal, confidence
interface SignalPanelProps {
  activeSymbol: string | null;
  replayActive?: boolean;
  replayStartDate?: string | null;
  replayEndDate?: string | null;
  selectedStrategy: string;
  setSelectedStrategy: (strategy: string) => void;
  strategyParams?: Record<string, any>;
  updateStrategyParam?: (key: string, value: any) => void;
  bulkUpdateStrategyParams?: (newParams: Record<string, any>) => void;
  chartData?: ChartData[];
  strategyStartDate?: string;
  strategyEndDate?: string;
  setStrategyStartDate?: (d: string) => void;
  setStrategyEndDate?: (d: string) => void;
}

export default function SignalPanel({
  activeSymbol,
  replayActive = false,
  replayStartDate = null,
  replayEndDate = null,
  selectedStrategy,
  setSelectedStrategy,
  strategyParams = {},
  updateStrategyParam,
  bulkUpdateStrategyParams,
  chartData = [],
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
}: SignalPanelProps) {
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimProgress, setOptimProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [trainingModel, setTrainingModel] = useState<'psi8' | 'psi40'>('psi8');

  const strategies = getAvailableStrategies();
  const activeStratDef = STRATEGIES[selectedStrategy] || STRATEGIES['psi'];
  const selectedLabel = activeStratDef.label;

  useEffect(() => {
    if (!activeSymbol) return;
    if (replayActive && !replayEndDate) return;

    const fetchSignals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ 
          symbol: activeSymbol, 
          limit: '1',
          strategy: selectedStrategy,
        });
        
        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            params.set(k, String(v));
          }
        });

        if (replayActive && replayEndDate) {
          params.set('end', replayEndDate);
          if (replayStartDate) params.set('start', replayStartDate);
        }

        const res = await fetch(`/api/signals?${params.toString()}`);
        const data = await res.json();
        if (data.signals && data.signals.length > 0) {
          setSignalData(data.signals[0]);
        } else {
          setSignalData(null);
        }
      } catch (err) {
        console.error("Error fetching signals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    if (replayActive) return;

    // Polling removed to reduce unnecessary egress.
    // Daily signals typically do not change minute-by-minute.
  }, [activeSymbol, replayActive, replayEndDate, replayStartDate, selectedStrategy, strategyParams]);

  if (!activeSymbol) return null;

  const visibleSignalData = signalData;
  const signalLabel = visibleSignalData?.signal || 'N/A';
  const isExit = signalLabel.startsWith('SELL');
  const reason = isExit ? visibleSignalData?.exitReason : visibleSignalData?.entryReason;

  const startTraining = () => {
    if (!chartData || chartData.length === 0) return;
    if (trainingModel !== 'psi8') {
      alert("Only PSI-8 training is currently supported.");
      return;
    }

    setOptimizing(true);
    setOptimProgress(0);

    const worker = new Worker(new URL('../../strategies/PSI/psiOptimizer.worker.ts', import.meta.url));

    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setOptimProgress(e.data.progress);
      } else if (e.data.type === 'done') {
        setOptimizing(false);
        const { bestParams, bestScore } = e.data;
        if (bestParams && bulkUpdateStrategyParams) {
          console.log("Optimization complete! Best Score:", bestScore, "Params:", bestParams);
          bulkUpdateStrategyParams(bestParams);
          // TODO: Save to Supabase DB here in Phase 3
          // localStorage.setItem(`quantegx_optim_psi8_${activeSymbol}`, JSON.stringify(bestParams));
        }
        worker.terminate();
      }
    };

    worker.postMessage({
      bars: chartData.map(d => ({
        date: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      })),
      // Expanded grid for exhaustive search (Warning: larger grid takes exponentially longer)
      entryLevelsGrid: [[14.6], [23.6], [38.2], [50.0], [61.8], [14.6, 23.6, 38.2, 50.0, 61.8]],
      aymMultipliers: [5, 7, 9, 11],
      aymLimits: [61.8, 78.6, 88.6],
      atrDistances: [2, 3, 4],
      stoplossLevels: [2, 3, 5],
      initialCapital: 100000,
      startDate: strategyStartDate || '2020-01-01',
      endDate: strategyEndDate || new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-48 md:w-60 bg-[#121212]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col transition-all">
      {/* Header / Main Signal */}
      <div 
        className={`p-2.5 md:p-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors flex items-center justify-between ${expanded ? 'rounded-t-xl' : 'rounded-xl'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="relative">
            <div 
              className="mb-1 flex items-center gap-1.5 cursor-pointer text-white/50 hover:text-white transition-colors" 
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            >
              <Target className="w-3 h-3 text-plt-orange" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {selectedLabel}
              </span>
              <ChevronDown className="w-3 h-3 opacity-40" />
            </div>
            
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} 
                />
                <div className="absolute top-full left-0 w-40 bg-[#181818]/95 backdrop-blur-2xl border border-white/[0.1] rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                  {strategies.map((strat) => (
                    <div
                      key={strat.id}
                      className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider ${
                        strat.disabled 
                          ? 'text-white/20 cursor-not-allowed' 
                          : strat.id === selectedStrategy 
                            ? 'text-plt-orange bg-white/[0.06] cursor-default font-semibold' 
                            : 'text-white/70 hover:text-white hover:bg-white/[0.04] cursor-pointer transition-colors'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!strat.disabled) {
                          setSelectedStrategy(strat.id);
                          setDropdownOpen(false);
                        }
                      }}
                    >
                      {strat.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-5 w-20 bg-white/[0.05] animate-pulse rounded" />
            ) : visibleSignalData ? (
              <div className="flex items-center gap-2">
                <span className={`text-base md:text-lg font-bold tracking-tight ${
                  visibleSignalData.signal === 'BUY' ? 'text-[#00e676]' :
                  isExit ? 'text-[#ff4d58]' :
                  'text-white'
                }`}>
                  {signalLabel}
                </span>
                <span className="text-[10px] bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded text-white/80 font-mono">
                  {reason}
                </span>
              </div>
            ) : (
              <span className="text-xs text-white/40">No signals</span>
            )}
          </div>
        </div>

        {/* Status Pill Icon with Glow */}
        <div className={`flex h-7 w-7 items-center justify-center rounded-full border shrink-0 ml-2 ${
          visibleSignalData?.signal === 'BUY' ? 'bg-[#00e676]/10 border-[#00e676]/30 shadow-[0_0_12px_rgba(0,230,118,0.2)]' :
          isExit ? 'bg-[#ff4d58]/10 border-[#ff4d58]/30 shadow-[0_0_12px_rgba(255,77,88,0.2)]' :
          'bg-white/[0.04] border-white/[0.08]'
        }`}>
           {visibleSignalData?.signal === 'BUY' ? <CheckCircle className="w-3.5 h-3.5 text-[#00e676]" /> : 
            isExit ? <AlertTriangle className="w-3.5 h-3.5 text-[#ff4d58]" /> : 
            <Activity className="w-3.5 h-3.5 text-white/40" />}
        </div>
      </div>

      {/* Expanded Details */}
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="overflow-hidden border-t border-white/[0.06]"
      >
        {visibleSignalData && (
          <div className="p-3.5 bg-black/20 flex flex-col gap-3">
            {/* Dynamic Settings */}
            {activeStratDef.settings.length > 0 && (
              <div className="flex flex-col gap-2 text-xs">
                {activeStratDef.settings.map(setting => {
                  if (setting.type === 'range') {
                    return (
                      <div key={setting.key} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
                        <div className="text-white/50 mb-1.5 flex justify-between text-[10px]">
                          <span>{setting.label}</span>
                          <span className="text-white font-mono">{strategyParams[setting.key] ?? setting.default}</span>
                        </div>
                        <input
                          type="range"
                          min={setting.min}
                          max={setting.max}
                          step={setting.step}
                          value={strategyParams[setting.key] ?? setting.default}
                          onChange={(e) => updateStrategyParam?.(setting.key, Number(e.target.value))}
                          className="w-full accent-plt-orange cursor-pointer h-1 bg-white/10 rounded-lg"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Dynamic Metrics */}
            {activeStratDef.metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {activeStratDef.metrics.map(metric => {
                  let rawVal = visibleSignalData[metric.key];
                  let displayVal = 'N/A';
                  
                  if (rawVal !== undefined && rawVal !== null) {
                    if (metric.format === 'percentage') {
                      displayVal = `${Number(rawVal).toFixed(metric.decimals ?? 2)}%`;
                    } else if (metric.format === 'number') {
                      displayVal = Number(rawVal).toFixed(metric.decimals ?? 2);
                    } else {
                      displayVal = String(rawVal);
                    }
                  }

                  return (
                    <div key={metric.key} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2 flex flex-col justify-between">
                      <div className="text-white/40 text-[9px] uppercase tracking-wider">{metric.label}</div>
                      <div className="text-white font-mono text-[11px] font-semibold mt-0.5">{displayVal}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-white/[0.06]">
              <div className="flex bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg">
                <button
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition-colors ${
                    trainingModel === 'psi8' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white'
                  }`}
                  onClick={() => setTrainingModel('psi8')}
                >
                  PSI-8
                </button>
                <button
                  className={`flex-1 py-1 text-[10px] font-semibold rounded transition-colors ${
                    trainingModel === 'psi40' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white'
                  }`}
                  onClick={() => setTrainingModel('psi40')}
                >
                  PSI-40
                </button>
              </div>

              <div className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Training period</div>
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-white/40">Start Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-white text-[10px] focus:outline-none focus:border-plt-orange w-28"
                  value={strategyStartDate || ''}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-white/40">End Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-white text-[10px] focus:outline-none focus:border-plt-orange w-28"
                  value={strategyEndDate || ''}
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
              <button 
                className="mt-1.5 w-full bg-plt-orange text-white hover:bg-plt-orange-hover transition-all rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50 relative overflow-hidden shadow-[0_0_20px_rgba(255,100,13,0.3)] hover:shadow-[0_0_25px_rgba(255,100,13,0.45)]"
                onClick={startTraining}
                disabled={optimizing}
              >
                {optimizing ? (
                  <>
                    <span className="relative z-10">Optimizing... {optimProgress.toFixed(0)}%</span>
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-white/30 z-0 transition-all duration-300" 
                      style={{ width: `${optimProgress}%` }}
                    />
                  </>
                ) : (
                  "Start Training"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-0.5 pt-2 border-t border-white/[0.06] text-[9px] text-white/40">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-plt-orange" /> {visibleSignalData.modelVersion || 'v1.0'}
              </span>
              <span>Updated {new Date(visibleSignalData.date).toLocaleDateString()}</span>
            </div>
            {replayActive && replayEndDate && (
              <div className="text-[9px] text-white/40">Replay as of {new Date(replayEndDate).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

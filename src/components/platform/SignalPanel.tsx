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
    <div className="absolute top-4 left-4 z-10 w-48 md:w-64 bg-tv-glass backdrop-blur-md border border-tv-border rounded-tv-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col">
      {/* Header / Main Signal */}
      <div 
        className={`p-2 md:p-4 cursor-pointer hover:bg-tv-hover transition-colors flex items-center justify-between ${expanded ? 'rounded-t-tv-lg' : 'rounded-tv-lg'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="relative">
            <div 
              className="mb-1 md:mb-1.5 flex items-center gap-1.5 cursor-pointer text-tv-muted hover:text-tv-text transition-colors" 
              onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            >
              <Target className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span className="text-[10px] md:text-xs font-weight-medium uppercase tracking-wider">
                {selectedLabel}
              </span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </div>
            
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} 
                />
                <div className="absolute top-full left-0 w-36 md:w-40 bg-[#1e222d] border border-tv-border rounded-tv-sm shadow-xl z-50 overflow-hidden">
                  {strategies.map((strat) => (
                    <div
                      key={strat.id}
                      className={`px-3 py-2 text-[10px] md:text-xs font-weight-medium uppercase tracking-wider ${
                        strat.disabled 
                          ? 'text-tv-muted/40 cursor-not-allowed' 
                          : strat.id === selectedStrategy 
                            ? 'text-tv-up bg-tv-hover cursor-default' 
                            : 'text-tv-muted hover:text-tv-text hover:bg-tv-hover cursor-pointer transition-colors'
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
              <div className="h-4 md:h-6 w-16 md:w-20 bg-tv-surface animate-pulse rounded-tv-sm" />
            ) : visibleSignalData ? (
              <>
                <span className={`text-sm md:text-lg font-weight-medium ${
                  visibleSignalData.signal === 'BUY' ? 'text-tv-up' :
                  isExit ? 'text-tv-down' :
                  'text-tv-text'
                }`}>
                  {signalLabel}
                </span>
                <span className="text-[10px] md:text-xs bg-tv-surface px-1 md:px-1.5 py-0.5 rounded-tv-sm text-tv-text font-weight-medium">
                  {reason}
                </span>
              </>
            ) : (
              <span className="text-xs md:text-sm text-tv-muted">No PSI signals</span>
            )}
          </div>
        </div>
        <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-tv-full bg-tv-surface border border-tv-border shrink-0 ml-2">
           {visibleSignalData?.signal === 'BUY' ? <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-up" /> : 
            isExit ? <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-down" /> : 
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-tv-muted" />}
        </div>
      </div>

      {/* Expanded Details */}
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="overflow-hidden border-t border-tv-border"
      >
        {visibleSignalData && (
          <div className="p-4 bg-tv-base flex flex-col gap-3">
            {/* Dynamic Settings */}
            {activeStratDef.settings.length > 0 && (
              <div className="flex flex-col gap-3 text-xs mb-2">
                {activeStratDef.settings.map(setting => {
                  if (setting.type === 'range') {
                    return (
                      <div key={setting.key} className="rounded-tv-sm bg-tv-surface p-2">
                        <div className="text-tv-muted mb-2 flex justify-between">
                          <span>{setting.label}</span>
                          <span className="text-tv-text font-weight-medium">{strategyParams[setting.key] ?? setting.default}</span>
                        </div>
                        <input
                          type="range"
                          min={setting.min}
                          max={setting.max}
                          step={setting.step}
                          value={strategyParams[setting.key] ?? setting.default}
                          onChange={(e) => updateStrategyParam?.(setting.key, Number(e.target.value))}
                          className="w-full accent-tv-accent cursor-pointer"
                        />
                      </div>
                    );
                  }
                  // We can support more types later
                  return null;
                })}
              </div>
            )}

            {/* Dynamic Metrics */}
            {activeStratDef.metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
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
                    <div key={metric.key} className="rounded-tv-sm bg-tv-surface p-2 flex flex-col justify-between">
                      <div className="text-tv-muted mb-1">{metric.label}</div>
                      <div className="text-tv-text font-weight-medium">{displayVal}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-tv-border/50">
              <div className="flex bg-tv-surface p-0.5 rounded-tv-sm mb-1">
                <button
                  className={`flex-1 py-1 text-xs font-weight-medium rounded-sm transition-colors ${
                    trainingModel === 'psi8' ? 'bg-tv-base text-tv-text shadow-sm' : 'text-tv-muted hover:text-tv-text'
                  }`}
                  onClick={() => setTrainingModel('psi8')}
                >
                  PSI-8
                </button>
                <button
                  className={`flex-1 py-1 text-xs font-weight-medium rounded-sm transition-colors ${
                    trainingModel === 'psi40' ? 'bg-tv-base text-tv-text shadow-sm' : 'text-tv-muted hover:text-tv-text'
                  }`}
                  onClick={() => setTrainingModel('psi40')}
                >
                  PSI-40
                </button>
              </div>

              <div className="text-[11px] text-tv-text font-weight-medium mb-1 uppercase tracking-wider text-tv-muted">Training period</div>
              <div className="flex items-center justify-between">
                <label className="text-tv-muted text-[10px]">Start Date</label>
                <input 
                  type="date" 
                  className="bg-tv-surface border border-tv-border rounded-tv-sm px-1 py-0.5 text-tv-text text-[10px] focus:outline-none focus:border-tv-accent w-28"
                  value={strategyStartDate || ''}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-tv-muted text-[10px]">End Date</label>
                <input 
                  type="date" 
                  className="bg-tv-surface border border-tv-border rounded-tv-sm px-1 py-0.5 text-tv-text text-[10px] focus:outline-none focus:border-tv-accent w-28"
                  value={strategyEndDate || ''}
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
              <button 
                className="mt-2 w-full bg-tv-accent text-tv-base hover:bg-tv-accent/90 transition-colors rounded-tv-sm py-1.5 text-xs font-weight-medium disabled:opacity-50 relative overflow-hidden"
                onClick={startTraining}
                disabled={optimizing}
              >
                {optimizing ? (
                  <>
                    <span className="relative z-10">Optimizing... {optimProgress.toFixed(0)}%</span>
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-tv-up/30 z-0 transition-all duration-300" 
                      style={{ width: `${optimProgress}%` }}
                    />
                  </>
                ) : (
                  "Start Training"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-1 pt-2 border-t border-tv-border/50 text-[10px] text-tv-muted">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {visibleSignalData.modelVersion || 'v1.0'}
              </span>
              <span>Updated {new Date(visibleSignalData.date).toLocaleDateString()}</span>
            </div>
            {replayActive && replayEndDate && (
              <div className="text-[10px] text-tv-muted">Replay as of {new Date(replayEndDate).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

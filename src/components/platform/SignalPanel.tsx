"use client";

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown, Eye, EyeOff } from '@/components/ui/icons';
import { motion } from 'framer-motion';

import { STRATEGIES, getAvailableStrategies } from '@/strategies/registry';
import type { ChartData } from '@/components/platform/ChartWidget';
import { useToast } from '@/context/ToastContext';

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
  metrics?: Record<string, string> | null;
  showSignals?: boolean;
  setShowSignals?: (show: boolean) => void;
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
  metrics,
  showSignals = true,
  setShowSignals,
}: SignalPanelProps) {
  const { toast } = useToast();
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimProgress, setOptimProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(true);
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

  // Calculate ROI Margin (Strategy ROI - B&H ROI)
  const sysRoi = metrics?.['Sys ROI'] ? parseFloat(metrics['Sys ROI']) : null;
  const bnHroi = metrics?.['B&H ROI'] ? parseFloat(metrics['B&H ROI']) : 0;
  const roiMarginVal = metrics?.['ROI Margin']
    ? parseFloat(metrics['ROI Margin'])
    : sysRoi !== null
      ? sysRoi - bnHroi
      : null;

  const startTraining = () => {
    if (!chartData || chartData.length === 0) return;
    if (trainingModel !== 'psi8') {
      toast.info("Model Training", "Only PSI-8 training is currently supported.");
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
    <div className="absolute top-4 right-[68px] z-30 w-72 md:w-80 bg-black/60 hover:bg-black/75 backdrop-blur-xl border border-white/[0.12] hover:border-white/[0.22] rounded-md shadow-2xl flex flex-col transition-all">
      {/* Header / Main Signal */}
      <div 
        className={`p-3 cursor-pointer hover:bg-white/[0.04] transition-colors flex flex-col gap-2 ${expanded ? 'rounded-t-md' : 'rounded-md'}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Row 1: Strategy Dropdown Selector (Left) + Performance ROI Margin & Eye Toggle (Right) */}
        <div className="flex items-center justify-between gap-2 relative">
          <div 
            className="flex items-center gap-1.5 cursor-pointer text-white/70 hover:text-white transition-colors" 
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
          >
            <Target className="w-3.5 h-3.5 text-plt-orange shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
              {selectedLabel}
            </span>
            <ChevronDown className="w-3 h-3 opacity-40 shrink-0" />
          </div>

          {/* Performance ROI Margin Badge & Eye Toggle */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {roiMarginVal !== null && (
              <span 
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-white/[0.04] border border-white/[0.08] ${
                  roiMarginVal >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}
                title={`ROI Margin (Strategy vs B&H): ${roiMarginVal > 0 ? '+' : ''}${roiMarginVal.toFixed(2)}% | Strategy ROI: ${sysRoi !== null ? (sysRoi > 0 ? '+' : '') + sysRoi.toFixed(2) + '%' : '—'} | B&H ROI: ${(bnHroi > 0 ? '+' : '') + bnHroi.toFixed(2)}%`}
              >
                {roiMarginVal > 0 ? `+${roiMarginVal.toFixed(2)}%` : `${roiMarginVal.toFixed(2)}%`}
              </span>
            )}
            {setShowSignals && (
              <button
                type="button"
                onClick={() => setShowSignals(!showSignals)}
                className={`p-1 rounded-[4px] transition-colors ${
                  !showSignals
                    ? 'text-plt-orange bg-plt-orange/15 border border-plt-orange/30'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
                title={showSignals ? "Hide Signals" : "Show Signals"}
              >
                {showSignals ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            )}
          </div>

          {/* Strategy Picker Dropdown */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }} 
              />
              <div className="absolute top-full left-0 w-44 bg-black/85 backdrop-blur-2xl border border-white/[0.15] rounded-md shadow-2xl z-50 overflow-hidden py-1 mt-1">
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

        {/* Row 2: Signal (Left) + Status Pill & Expand Chevron (Right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {loading ? (
              <div className="h-5 w-24 bg-white/[0.05] animate-pulse rounded-md" />
            ) : visibleSignalData ? (
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold tracking-tight ${
                  visibleSignalData.signal === 'BUY' ? 'text-[#22c55e]' :
                  isExit ? 'text-[#ef4444]' :
                  'text-white'
                }`}>
                  {signalLabel}
                </span>
                <span className="text-[10px] bg-white/[0.06] border border-white/[0.09] px-1.5 py-0.5 rounded-[4px] text-white/80 font-mono">
                  {reason}
                </span>
              </div>
            ) : (
              <span className="text-xs text-white/40">No signals</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status Pill Icon */}
            <div className={`flex h-6 w-6 items-center justify-center rounded-md border shrink-0 ${
              visibleSignalData?.signal === 'BUY' ? 'bg-[#22c55e]/10 border-[#22c55e]/30' :
              isExit ? 'bg-[#ef4444]/10 border-[#ef4444]/30' :
              'bg-white/[0.04] border-white/[0.09]'
            }`}>
               {visibleSignalData?.signal === 'BUY' ? <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" /> : 
                isExit ? <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" /> : 
                <Activity className="w-3.5 h-3.5 text-white/40" />}
            </div>

            {/* Expand Chevron */}
            <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${expanded ? 'rotate-180 text-white' : ''}`} />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="overflow-hidden border-t border-white/[0.09]"
      >
        <div className="p-3 bg-black/50 backdrop-blur-xl flex flex-col gap-2.5">
          {/* Collapsible Performance Metrics Table */}
          {metrics && (
            <div className="rounded-md bg-white/[0.02] border border-white/[0.08] overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                onClick={() => setMetricsExpanded(!metricsExpanded)}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${metricsExpanded ? '' : '-rotate-90'}`} />
                  Strategy Performance
                </div>
                <span className={`font-mono text-[9px] font-bold ${
                  roiMarginVal !== null && roiMarginVal >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}>
                  {roiMarginVal !== null ? (roiMarginVal > 0 ? `+${roiMarginVal.toFixed(2)}%` : `${roiMarginVal.toFixed(2)}%`) : '—'}
                </span>
              </div>

              {metricsExpanded && (
                <div className="px-2 pb-2 pt-0.5 border-t border-white/[0.06]">
                  <table className="w-full text-right border-collapse text-[10px]">
                    <tbody>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">System Total ROI</td>
                        <td className={`py-1 font-mono font-semibold ${parseFloat(metrics['Sys ROI']) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {parseFloat(metrics['Sys ROI']) > 0 ? `+${metrics['Sys ROI']}%` : `${metrics['Sys ROI']}%`}
                        </td>
                      </tr>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">Buy & Hold ROI</td>
                        <td className="py-1 font-mono text-white">{metrics['B&H ROI']}%</td>
                      </tr>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">ROI Margin</td>
                        <td className={`py-1 font-mono font-semibold ${parseFloat(metrics['ROI Margin']) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {parseFloat(metrics['ROI Margin']) > 0 ? `+${metrics['ROI Margin']}%` : `${metrics['ROI Margin']}%`}
                        </td>
                      </tr>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">Win Rate</td>
                        <td className="py-1 font-mono text-white">{metrics['Win Rate']}%</td>
                      </tr>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">Max Drawdown</td>
                        <td className="py-1 font-mono text-[#ef4444] font-semibold">{metrics['Max Drawdown']}%</td>
                      </tr>
                      <tr className="border-b border-white/[0.06]">
                        <td className="py-1 text-white/50 text-left">Avg Return / Trade</td>
                        <td className={`py-1 font-mono ${parseFloat(metrics['Avg. Return/Trade']) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {parseFloat(metrics['Avg. Return/Trade']) > 0 ? `+${metrics['Avg. Return/Trade']}%` : `${metrics['Avg. Return/Trade']}%`}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-white/50 text-left">Annual CAGR</td>
                        <td className={`py-1 font-mono font-semibold ${parseFloat(metrics['Annual CAGR']) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                          {parseFloat(metrics['Annual CAGR']) > 0 ? `+${metrics['Annual CAGR']}%` : `${metrics['Annual CAGR']}%`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
            {/* Dynamic Settings */}
            {activeStratDef.settings.length > 0 && (
              <div className="flex flex-col gap-2 text-xs">
                {activeStratDef.settings.map(setting => {
                  if (setting.type === 'range') {
                    return (
                      <div key={setting.key} className="rounded-md bg-white/[0.02] border border-white/[0.09] p-2">
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
                          className="w-full accent-plt-orange cursor-pointer h-1 bg-white/10 rounded-md"
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
                  let rawVal = visibleSignalData?.[metric.key];
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
                    <div key={metric.key} className="rounded-md bg-white/[0.02] border border-white/[0.09] p-2 flex flex-col justify-between">
                      <div className="text-white/40 text-[9px] uppercase tracking-wider">{metric.label}</div>
                      <div className="text-white font-mono text-[11px] font-semibold mt-0.5">{displayVal}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex flex-col gap-2 mt-0.5 pt-2 border-t border-white/[0.09]">
              <div className="flex bg-white/[0.02] border border-white/[0.09] p-0.5 rounded-md">
                <button
                  className={`flex-1 py-1 text-[10px] font-medium rounded-[4px] transition-colors ${
                    trainingModel === 'psi8' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white'
                  }`}
                  onClick={() => setTrainingModel('psi8')}
                >
                  PSI-8
                </button>
                <button
                  className={`flex-1 py-1 text-[10px] font-medium rounded-[4px] transition-colors ${
                    trainingModel === 'psi40' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white'
                  }`}
                  onClick={() => setTrainingModel('psi40')}
                >
                  PSI-40
                </button>
              </div>

              <div className="text-[9px] font-medium uppercase tracking-wider text-white/40">Training period</div>
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-white/40">Start Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.09] rounded-md px-1.5 py-0.5 text-white text-[10px] focus:outline-none focus:border-plt-orange w-28"
                  value={strategyStartDate || ''}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <label className="text-white/40">End Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.09] rounded-md px-1.5 py-0.5 text-white text-[10px] focus:outline-none focus:border-plt-orange w-28"
                  value={strategyEndDate || ''}
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
              <button 
                className="mt-1 w-full bg-plt-orange text-white hover:bg-plt-orange-hover transition-all rounded-md py-1.5 text-xs font-medium disabled:opacity-50 relative overflow-hidden"
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

            <div className="flex items-center justify-between mt-0.5 pt-2 border-t border-white/[0.09] text-[9px] text-white/40">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-plt-orange" /> {visibleSignalData?.modelVersion || 'v1.0'}
              </span>
              <span>Updated {visibleSignalData?.date ? new Date(visibleSignalData.date).toLocaleDateString() : 'N/A'}</span>
            </div>
            {replayActive && replayEndDate && (
              <div className="text-[9px] text-white/40">Replay as of {new Date(replayEndDate).toLocaleDateString()}</div>
            )}
          </div>
      </motion.div>
    </div>
  );
}

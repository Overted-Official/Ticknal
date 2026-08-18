"use client";

import React, { useState, useEffect } from 'react';
import {
  Target,
  Activity,
  ShieldCheck,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Zap,
  TrendingUp,
  Sliders,
  Sparkles,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Cpu,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { STRATEGIES, getAvailableStrategies } from '@/strategies/registry';
import type { ChartData } from '@/components/platform/ChartWidget';
import { useToast } from '@/context/ToastContext';
import { PsiOptimizationDrawer } from './PsiOptimizationDrawer';
import type { CandidateOptimizationResult } from '@/strategies/PSI/psiOptimizer.worker';
import type { PsiStrategyParams } from '@/strategies/PSI/psiStrategy';

type SignalData = Record<string, any>;

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
  const [activeTab, setActiveTab] = useState<'signal' | 'alpha' | 'optimizer'>('signal');
  const [trainingModel, setTrainingModel] = useState<'psi8' | 'psi40'>('psi8');
  const [trainCutoffPreset, setTrainCutoffPreset] = useState<'2020' | '2022' | '2024' | 'custom'>('2024');
  const [customCutoffDate, setCustomCutoffDate] = useState<string>("2024-12-31");

  // Optimization Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCandidates, setDrawerCandidates] = useState<CandidateOptimizationResult[]>([]);
  const [drawerTrainPeriod, setDrawerTrainPeriod] = useState("2020-01-01 to 2024-12-31");
  const [drawerTestPeriod, setDrawerTestPeriod] = useState("2025-01-01 to Present");
  const [drawerTotalEvaluated, setDrawerTotalEvaluated] = useState(50220);

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
  }, [activeSymbol, replayActive, replayEndDate, replayStartDate, selectedStrategy, strategyParams]);

  if (!activeSymbol) return null;

  const visibleSignalData = signalData;
  const rawSignal = visibleSignalData?.signal || 'NEUTRAL';
  const isBuy = rawSignal.toUpperCase().includes('BUY');
  const isExit = rawSignal.toUpperCase().includes('SELL') || rawSignal.toUpperCase().includes('EXIT');
  const isNeutral = !isBuy && !isExit;
  const reason = isExit ? visibleSignalData?.exitReason : visibleSignalData?.entryReason;

  // Master Index Score
  const masterIndex = visibleSignalData?.masterIndex !== undefined && visibleSignalData?.masterIndex !== null 
    ? Number(visibleSignalData.masterIndex) 
    : null;
  const mdm = visibleSignalData?.medianDailyMove !== undefined && visibleSignalData?.medianDailyMove !== null 
    ? Number(visibleSignalData.medianDailyMove) 
    : null;

  // Key execution levels
  const triggerPrice = visibleSignalData?.price !== undefined ? Number(visibleSignalData.price) : null;
  const stopLossPrice = visibleSignalData?.stopLoss !== undefined ? Number(visibleSignalData.stopLoss) : null;
  const targetPrice = visibleSignalData?.targetPrice !== undefined ? Number(visibleSignalData.targetPrice) : null;

  // ROI Margin & Performance Alpha
  const sysRoi = metrics?.['Sys ROI'] ? parseFloat(metrics['Sys ROI']) : null;
  const bnHroi = metrics?.['B&H ROI'] ? parseFloat(metrics['B&H ROI']) : 0;
  const roiMarginVal = metrics?.['ROI Margin']
    ? parseFloat(metrics['ROI Margin'])
    : sysRoi !== null
      ? sysRoi - bnHroi
      : null;

  const getEffectiveCutoffDate = (): string => {
    if (trainCutoffPreset === '2020') return '2020-12-31';
    if (trainCutoffPreset === '2022') return '2022-12-31';
    if (trainCutoffPreset === '2024') return '2024-12-31';
    return customCutoffDate || '2024-12-31';
  };

  const startTraining = () => {
    if (!chartData || chartData.length === 0) return;

    setOptimizing(true);
    setOptimProgress(0);

    const worker = new Worker(new URL('../../strategies/PSI/psiOptimizer.worker.ts', import.meta.url));

    const cutoff = getEffectiveCutoffDate();
    const cutoffDate = new Date(cutoff);
    const testStart = new Date(cutoffDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setOptimProgress(e.data.progress);
      } else if (e.data.type === 'done') {
        setOptimizing(false);
        setDrawerCandidates(e.data.candidates);
        setDrawerTrainPeriod(e.data.trainPeriod);
        setDrawerTestPeriod(e.data.testPeriod);
        setDrawerTotalEvaluated(e.data.totalEvaluated);
        setDrawerOpen(true);
        toast.success(
          "Walk-Forward Complete",
          `Evaluated ${e.data.totalEvaluated.toLocaleString()} combinations for ${activeSymbol} on ${trainingModel.toUpperCase()}.`
        );
        worker.terminate();
      } else if (e.data.type === 'error') {
        setOptimizing(false);
        toast.error("Optimization Error", e.data.message);
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
      model: trainingModel,
      trainStartDate: undefined, // Always train from earliest inception up to cutoff date
      trainEndDate: cutoff,
      testStartDate: testStart,
      testEndDate: undefined,
      topK: 10,
    });
  };

  // ----------------------------------------------------
  // RENDER: Inspector Body (Tabs: Signal / Alpha / Optimizer)
  // ----------------------------------------------------
  const renderInspectorBody = () => (
    <div className="flex flex-col gap-3">
      {/* 3-Tab Segmented Controller */}
      <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] relative">
        <button
          type="button"
          onClick={() => setActiveTab('signal')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'signal'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-plt-orange" />
          <span>Signal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alpha')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'alpha'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Alpha</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('optimizer')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'optimizer'
              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Optimizer</span>
        </button>
      </div>

      {/* TAB 1: SIGNAL & LIVE LEVELS */}
      {activeTab === 'signal' && (
        <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
          {/* Hero Verdict Box */}
          <div className={`p-3 rounded-lg border flex flex-col gap-1.5 relative overflow-hidden ${
            isBuy 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : isExit 
                ? 'bg-rose-950/20 border-rose-500/30' 
                : 'bg-zinc-900/40 border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  isBuy ? 'bg-emerald-400 animate-pulse' : isExit ? 'bg-rose-500' : 'bg-amber-400'
                }`} />
                <span className={`text-xs font-bold font-mono tracking-tight uppercase ${
                  isBuy ? 'text-emerald-400' : isExit ? 'text-rose-400' : 'text-zinc-300'
                }`}>
                  {rawSignal}
                </span>
              </div>
              {triggerPrice && (
                <span className="text-xs font-mono font-bold text-white">
                  {triggerPrice.toFixed(2)} EGP
                </span>
              )}
            </div>

            {reason && (
              <p className="text-[10px] text-white/50 leading-relaxed font-sans mt-0.5">
                {reason}
              </p>
            )}
          </div>

          {/* Execution Coordinates 3-Card Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Trigger</span>
              <span className="text-[11px] font-mono font-bold text-white mt-1">
                {triggerPrice ? `${triggerPrice.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-rose-400/80 font-medium">Stop Loss</span>
              <span className="text-[11px] font-mono font-bold text-rose-400 mt-1">
                {stopLossPrice ? `${stopLossPrice.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-medium">AYM Target</span>
              <span className="text-[11px] font-mono font-bold text-emerald-400 mt-1">
                {targetPrice ? `${targetPrice.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* Master Index (0-100 Gauge) */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/60 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3 h-3 text-plt-orange" />
                Master Index (0-100)
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-white font-bold">{masterIndex !== null ? masterIndex.toFixed(1) : '—'}</span>
                {mdm !== null && (
                  <span className="text-[9px] text-white/40">MDM: {mdm.toFixed(2)}%</span>
                )}
              </div>
            </div>

            {/* Gauge Track */}
            <div className="relative w-full h-2 rounded-full bg-zinc-900 border border-white/[0.08] overflow-hidden flex">
              <div className="w-[20%] h-full bg-emerald-500/30" title="Oversold / Buy" />
              <div className="w-[60%] h-full bg-white/[0.03]" title="Equilibrium" />
              <div className="w-[20%] h-full bg-rose-500/30" title="Overbought / Sell" />
              {masterIndex !== null && (
                <div 
                  className="absolute top-0 bottom-0 w-1.5 bg-plt-orange rounded-full shadow-[0_0_8px_rgba(254,80,0,0.8)] -ml-0.5 transition-all duration-300"
                  style={{ left: `${Math.min(Math.max(masterIndex, 0), 100)}%` }}
                />
              )}
            </div>

            <div className="flex justify-between text-[8px] font-mono text-white/30 px-0.5">
              <span>0 (Oversold)</span>
              <span>50</span>
              <span>100 (Overbought)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALPHA & BACKTEST SCORECARD */}
      {activeTab === 'alpha' && (
        <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
          {/* 3-Card Alpha Grid (System ROI, Buy & Hold, Alpha Spread) */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">System ROI</span>
              <span className={`text-[11px] font-mono font-bold mt-1 ${
                metrics?.['Sys ROI'] && parseFloat(metrics['Sys ROI']) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {metrics?.['Sys ROI'] ? `${parseFloat(metrics['Sys ROI']) > 0 ? '+' : ''}${metrics['Sys ROI']}%` : '—'}
              </span>
            </div>

            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Buy & Hold</span>
              <span className="text-[11px] font-mono font-bold text-zinc-200 mt-1">
                {metrics?.['B&H ROI'] ? `${parseFloat(metrics['B&H ROI']) > 0 ? '+' : ''}${metrics['B&H ROI']}%` : '—'}
              </span>
            </div>

            <div className={`p-2 rounded-md border flex flex-col justify-between ${
              roiMarginVal !== null && roiMarginVal >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`text-[9px] uppercase tracking-wider font-semibold ${
                roiMarginVal !== null && roiMarginVal >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'
              }`}>
                Alpha (α)
              </span>
              <span className="text-[11px] font-mono font-bold mt-1">
                {roiMarginVal !== null ? (roiMarginVal > 0 ? `+${roiMarginVal.toFixed(2)}%` : `${roiMarginVal.toFixed(2)}%`) : '—'}
              </span>
            </div>
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Win Rate</span>
              <span className="text-xs font-mono font-bold text-emerald-400 mt-1">
                {metrics?.['Win Rate'] ? `${metrics['Win Rate']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Annual CAGR</span>
              <span className="text-xs font-mono font-bold text-white mt-1">
                {metrics?.['Annual CAGR'] ? `${metrics['Annual CAGR']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-rose-400/80 font-medium">Max Drawdown</span>
              <span className="text-xs font-mono font-bold text-rose-400 mt-1">
                {metrics?.['Max Drawdown'] ? `${metrics['Max Drawdown']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Avg Return/Trade</span>
              <span className="text-xs font-mono font-bold text-white mt-1">
                {metrics?.['Avg. Return/Trade'] ? `${metrics['Avg. Return/Trade']}%` : '—'}
              </span>
            </div>
          </div>

          {/* Chart Backtest Horizon Controls */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08] flex flex-col gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-plt-orange" />
              Chart Backtest Horizon
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-[9px]">Start Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.09] rounded-md px-1.5 py-1 text-white text-[10px] focus:outline-none focus:border-plt-orange font-mono"
                  value={strategyStartDate || '2025-01-01'}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-white/40 text-[9px]">End Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.09] rounded-md px-1.5 py-1 text-white text-[10px] focus:outline-none focus:border-plt-orange font-mono"
                  value={strategyEndDate || ''}
                  placeholder="Present"
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WALK-FORWARD OPTIMIZER STUDIO */}
      {activeTab === 'optimizer' && (
        <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
          {/* Model Architecture Toggle */}
          <div className="flex bg-white/[0.02] border border-white/[0.08] p-0.5 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                trainingModel === 'psi8' 
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold' 
                  : 'text-white/40 hover:text-white'
              }`}
              onClick={() => setTrainingModel('psi8')}
            >
              PSI-8 (Inflection)
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                trainingModel === 'psi40' 
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold' 
                  : 'text-white/40 hover:text-white'
              }`}
              onClick={() => setTrainingModel('psi40')}
            >
              PSI-40 (Trend)
            </button>
          </div>

          {/* Interactive Split-Timeline Visualizer */}
          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[9px] text-white/40">
              <span className="font-semibold uppercase tracking-wider">In-Sample Cutoff</span>
              <div className="flex gap-1">
                {(['2020', '2022', '2024', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTrainCutoffPreset(preset)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition ${
                      trainCutoffPreset === preset
                        ? 'bg-plt-orange text-white font-semibold'
                        : 'bg-white/[0.04] text-white/40 hover:text-white'
                    }`}
                  >
                    {preset === 'custom' ? 'Custom' : `≤ ${preset}`}
                  </button>
                ))}
              </div>
            </div>

            {trainCutoffPreset === 'custom' && (
              <div className="flex items-center justify-between text-[10px] pt-1">
                <label className="text-white/40 text-[9px]">Custom Cutoff Date</label>
                <input 
                  type="date" 
                  className="bg-white/[0.04] border border-white/[0.09] rounded-md px-1.5 py-0.5 text-white text-[10px] focus:outline-none focus:border-plt-orange w-28 font-mono"
                  value={customCutoffDate}
                  onChange={(e) => setCustomCutoffDate(e.target.value)}
                />
              </div>
            )}

            {/* Visual Slices Bar */}
            <div className="px-2 py-1.5 rounded-md bg-zinc-950/80 border border-white/[0.06] text-[9px] text-white/50 flex flex-col gap-1 font-mono">
              <div className="flex justify-between">
                <span className="text-amber-400/90 font-medium">Train (In-Sample):</span>
                <span>Inception → {getEffectiveCutoffDate()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400/90 font-medium">Test (Out-of-Sample):</span>
                <span>{new Date(new Date(getEffectiveCutoffDate()).getTime() + 86400000).toISOString().split('T')[0]} → Present</span>
              </div>
            </div>
          </div>

          {/* Run Optimizer CTA */}
          <button 
            type="button"
            className="w-full bg-plt-orange text-white hover:bg-plt-orange-hover transition-all rounded-lg py-2 text-xs font-semibold disabled:opacity-50 relative overflow-hidden flex items-center justify-center gap-1.5 shadow-lg shadow-orange-950/30 active:scale-[0.99]"
            onClick={startTraining}
            disabled={optimizing}
          >
            {optimizing ? (
              <>
                <span className="relative z-10 font-mono">Evaluating 50,220 Combos... {optimProgress.toFixed(0)}%</span>
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/25 z-0 transition-all duration-300" 
                  style={{ width: `${optimProgress}%` }}
                />
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Run Walk-Forward Optimizer (50k)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[9px] text-white/40">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-plt-orange" /> {visibleSignalData?.modelVersion || 'v1.0'}
        </span>
        <span>Updated {visibleSignalData?.date ? new Date(visibleSignalData.date).toLocaleDateString() : 'Live'}</span>
      </div>
    </div>
  );

  return (
    <div className="absolute top-4 right-[68px] z-30 w-72 md:w-80 bg-[#09090b]/80 hover:bg-[#09090b]/95 backdrop-blur-2xl border border-white/[0.12] hover:border-white/[0.22] rounded-xl shadow-2xl flex flex-col transition-all">
      {/* -------------------------------------------------- */}
      {/* FLOATING HUD (COLLAPSED HEADER)                   */}
      {/* -------------------------------------------------- */}
      <div 
        className={`p-3 cursor-pointer hover:bg-white/[0.03] transition-colors flex flex-col gap-2 ${expanded ? 'rounded-t-xl' : 'rounded-xl'}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Row 1: Strategy Label + Strategy Dropdown + Alpha Spread Badge + Eye Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-white/80" onClick={(e) => e.stopPropagation()}>
            <Target className="w-3.5 h-3.5 text-plt-orange shrink-0" />
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-[11px] font-bold text-white focus:outline-none focus:border-plt-orange cursor-pointer tracking-wide uppercase"
            >
              {strategies.map((strat) => (
                <option key={strat.id} value={strat.id} className="bg-zinc-900 text-white">
                  {strat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {roiMarginVal !== null && (
              <span 
                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] border ${
                  roiMarginVal >= 0 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
                title={`Alpha Margin: ${roiMarginVal > 0 ? '+' : ''}${roiMarginVal.toFixed(2)}%`}
              >
                {roiMarginVal > 0 ? `+${roiMarginVal.toFixed(1)}% α` : `${roiMarginVal.toFixed(1)}% α`}
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
        </div>

        {/* Row 2: Live Signal Status + Master Index + Expand Chevron */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {loading ? (
              <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-mono">
                <Activity className="w-3 h-3 animate-spin text-plt-orange" />
                <span>Scanning...</span>
              </div>
            ) : (
              <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono flex items-center gap-1.5 border ${
                isBuy 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : isExit 
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                    : 'bg-white/[0.05] text-zinc-300 border-white/[0.08]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isBuy ? 'bg-emerald-400 animate-pulse' : isExit ? 'bg-rose-500' : 'bg-amber-400'
                }`} />
                <span className="truncate">{rawSignal}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {masterIndex !== null && (
              <span className="text-[10px] font-mono font-semibold text-white/50 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.06]">
                MI: <strong className="text-white">{masterIndex.toFixed(0)}</strong>
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${expanded ? 'rotate-180 text-white' : ''}`} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* DESKTOP EXPANDED INSPECTOR BODY                    */}
      {/* -------------------------------------------------- */}
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="hidden md:block overflow-hidden border-t border-white/[0.09]"
      >
        <div className="p-3 bg-[#09090b]/90 backdrop-blur-2xl">
          {renderInspectorBody()}
        </div>
      </motion.div>

      {/* -------------------------------------------------- */}
      {/* MOBILE EXPANDED BOTTOM SHEET DRAWER                */}
      {/* -------------------------------------------------- */}
      {expanded && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setExpanded(false)}
          />
          {/* Bottom Sheet */}
          <div className="relative w-full max-h-[85vh] bg-zinc-950 border-t border-zinc-800 rounded-t-2xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle & Header */}
            <div className="p-3 border-b border-zinc-800/80 flex flex-col items-center gap-2 bg-zinc-900/60 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
              <div className="w-full flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-plt-orange" />
                  <span className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    {trainingModel === 'psi40' ? 'PSI-40 TREND' : 'PSI-8 INFLECTION'}
                  </span>
                  {roiMarginVal !== null && (
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.05] ${roiMarginVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {roiMarginVal > 0 ? `+${roiMarginVal.toFixed(1)}% α` : `${roiMarginVal.toFixed(1)}% α`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderInspectorBody()}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* WALK-FORWARD CANDIDATE COMBINATIONS DRAWER         */}
      {/* -------------------------------------------------- */}
      <PsiOptimizationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        symbol={activeSymbol}
        model={trainingModel}
        trainPeriod={drawerTrainPeriod}
        testPeriod={drawerTestPeriod}
        totalEvaluated={drawerTotalEvaluated}
        candidates={drawerCandidates}
        onPreviewCombination={(params) => {
          if (bulkUpdateStrategyParams) {
            bulkUpdateStrategyParams(params);
          }
        }}
        onApplyCombination={(params, chosenModel) => {
          if (bulkUpdateStrategyParams) {
            bulkUpdateStrategyParams({ ...params, model: chosenModel });
            try {
              localStorage.setItem(`quantegx_custom_psi_${activeSymbol}`, JSON.stringify({ ...params, model: chosenModel }));
            } catch (e) {}
            toast.success("Strategy Updated", `Applied combination for ${activeSymbol} on ${chosenModel.toUpperCase()}.`);
          }
        }}
      />
    </div>
  );
}

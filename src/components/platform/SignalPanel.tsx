'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Target,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Zap,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  Activity,
} from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';

import { STRATEGIES, getAvailableStrategies } from '@/strategies/registry';
import type { ChartData } from '@/components/platform/ChartWidget';
import { useToast } from '@/context/ToastContext';
import { PsiOptimizationDrawer } from './PsiOptimizationDrawer';
import type { CandidateOptimizationResult } from '@/strategies/PSI/psiOptimizer.worker';

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
  const [customCutoffDate, setCustomCutoffDate] = useState<string>('2024-12-31');
  const [isStrategyDropdownOpen, setIsStrategyDropdownOpen] = useState(false);
  const strategyDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!isStrategyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(e.target as Node)) {
        setIsStrategyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isStrategyDropdownOpen]);

  // Optimization Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCandidates, setDrawerCandidates] = useState<CandidateOptimizationResult[]>([]);
  const [drawerTrainPeriod, setDrawerTrainPeriod] = useState('2020-01-01 to 2024-12-31');
  const [drawerTestPeriod, setDrawerTestPeriod] = useState('2025-01-01 to Present');
  const [drawerTotalEvaluated, setDrawerTotalEvaluated] = useState(50220);

  const strategies = getAvailableStrategies();
  const activeStratDef = STRATEGIES[selectedStrategy] || STRATEGIES['psi'];

  useEffect(() => {
    if (!activeSymbol) return;
    if (replayActive && !replayEndDate) return;

    const fetchSignals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          symbol: activeSymbol,
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
        } else {
          if (strategyStartDate) params.set('start', strategyStartDate);
          if (strategyEndDate) params.set('end', strategyEndDate);
        }

        const res = await fetch(`/api/signals?${params.toString()}`);
        const data = await res.json();
        if (data.latestSignal || (data.signals && data.signals.length > 0)) {
          const latestSignal = data.latestSignal ?? data.signals[data.signals.length - 1];
          setSignalData({
            ...latestSignal,
            latestMasterIndex: data.latestMasterIndex ?? latestSignal.masterIndex,
          });
        } else {
          setSignalData(data.latestMasterIndex !== null ? { masterIndex: data.latestMasterIndex } : null);
        }
      } catch (err) {
        console.error('Error fetching signals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [activeSymbol, replayActive, replayEndDate, replayStartDate, strategyStartDate, strategyEndDate, selectedStrategy, strategyParams]);

  if (!activeSymbol) return null;

  const visibleSignalData = signalData;
  const rawSignal = visibleSignalData?.signal || 'NEUTRAL';
  const isBuy = rawSignal.toUpperCase().includes('BUY');
  const isExit = rawSignal.toUpperCase().includes('SELL') || rawSignal.toUpperCase().includes('EXIT');
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
          'Walk-Forward Complete',
          `Evaluated ${e.data.totalEvaluated.toLocaleString()} combinations for ${activeSymbol} on ${trainingModel.toUpperCase()}.`
        );
        worker.terminate();
      } else if (e.data.type === 'error') {
        setOptimizing(false);
        toast.error('Optimization Error', e.data.message);
        worker.terminate();
      }
    };

    worker.postMessage({
      bars: chartData.map((d) => ({
        date: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      })),
      model: trainingModel,
      trainStartDate: undefined,
      trainEndDate: cutoff,
      testStartDate: testStart,
      testEndDate: undefined,
      topK: 10,
    });
  };

  const renderInspectorBody = () => (
    <div className="flex flex-col gap-3 pt-2">
      {/* 3-Tab Segmented Controller */}
      <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab('signal')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'signal'
              ? 'bg-white/[0.12] text-plt-text shadow-sm'
              : 'text-plt-muted hover:text-plt-text'
          }`}
        >
          <Target size={13} className="text-plt-muted" />
          <span>Signal</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alpha')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'alpha'
              ? 'bg-white/[0.12] text-plt-text shadow-sm'
              : 'text-plt-muted hover:text-plt-text'
          }`}
        >
          <BarChart3 size={13} className="text-plt-profit" />
          <span>Alpha</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('optimizer')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'optimizer'
              ? 'bg-white/[0.12] text-plt-text shadow-sm'
              : 'text-plt-muted hover:text-plt-text'
          }`}
        >
          <Sparkles size={13} className="text-plt-muted" />
          <span>Optimizer</span>
        </button>
      </div>

      {/* TAB 1: SIGNAL & LIVE LEVELS */}
      {activeTab === 'signal' && (
        <div className="flex flex-col gap-2.5">
          {/* Signal Header Banner */}
          <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
            isBuy
              ? 'bg-plt-profit/10 border-plt-profit/25'
              : isExit
                ? 'bg-plt-risk/10 border-plt-risk/25'
                : 'bg-white/[0.03] border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isBuy ? 'bg-plt-profit animate-pulse' : isExit ? 'bg-plt-risk' : 'bg-plt-muted'
                }`} />
                <span className={isBuy ? 'text-plt-profit' : isExit ? 'text-plt-risk' : 'text-plt-text'}>
                  {displaySignal}
                </span>
              </div>
              {triggerPrice && (
                <span className="text-[11px] font-mono tabular-nums font-medium text-plt-text">
                  {triggerPrice.toFixed(2)} EGP
                </span>
              )}
            </div>

            {reason && (
              <p className="text-[10px] text-plt-muted leading-relaxed font-sans">
                {reason}
              </p>
            )}
          </div>

          {/* Execution Coordinates 3-Card Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Trigger</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-text mt-1">
                {triggerPrice ? triggerPrice.toFixed(2) : '—'}
              </span>
            </div>
            {selectedStrategy === 'thoth_egx_macro' ? (
              <>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-purple-300/80 font-medium">Pred Exhaustion</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-purple-300 mt-1">
                    {visibleSignalData?.predictedExhaustion !== undefined && visibleSignalData?.predictedExhaustion !== null
                      ? `${Number(visibleSignalData.predictedExhaustion).toFixed(1)}%`
                      : visibleSignalData?.masterIndexAdjusted !== undefined && visibleSignalData?.masterIndexAdjusted !== null
                        ? `${Number(visibleSignalData.masterIndexAdjusted).toFixed(1)}%`
                        : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-plt-profit/80 font-medium">Conviction</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-plt-profit mt-1">
                    {visibleSignalData?.convictionScore !== undefined && visibleSignalData?.convictionScore !== null
                      ? `${Number(visibleSignalData.convictionScore).toFixed(1)}`
                      : '—'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-plt-risk/80 font-medium">Stop Loss</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-plt-risk mt-1">
                    {stopLossPrice ? stopLossPrice.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-plt-profit/80 font-medium">AYM Target</span>
                  <span className="text-xs font-mono tabular-nums font-semibold text-plt-profit mt-1">
                    {targetPrice ? targetPrice.toFixed(2) : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Master Index (0-100 Gauge) */}
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-plt-muted font-medium uppercase tracking-wider">
                Master Index (0–100)
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-plt-text font-semibold">{masterIndex !== null ? masterIndex.toFixed(1) : '—'}</span>
                {mdm !== null && (
                  <span className="text-plt-muted text-[9px]">MDM: {mdm.toFixed(2)}%</span>
                )}
              </div>
            </div>

            {/* Gauge Track */}
            <div className="relative w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-plt-profit/40 via-white/10 to-plt-risk/40" />
              {masterIndex !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-sm -ml-0.5 transition-all duration-300"
                  style={{ left: `${Math.min(Math.max(masterIndex, 0), 100)}%` }}
                />
              )}
            </div>

            <div className="flex justify-between text-[9px] font-mono text-plt-muted pt-0.5">
              <span>0 Oversold</span>
              <span>50</span>
              <span>100 Overbought</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALPHA & BACKTEST SCORECARD */}
      {activeTab === 'alpha' && (
        <div className="flex flex-col gap-2.5">
          {/* 3-Card Alpha Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">System ROI</span>
              <span className={`text-xs font-mono tabular-nums font-semibold mt-1 ${
                metrics?.['Sys ROI'] && parseFloat(metrics['Sys ROI']) >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}>
                {metrics?.['Sys ROI'] ? `${parseFloat(metrics['Sys ROI']) > 0 ? '+' : ''}${metrics['Sys ROI']}%` : '—'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Buy & Hold</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-muted mt-1">
                {metrics?.['B&H ROI'] ? `${parseFloat(metrics['B&H ROI']) > 0 ? '+' : ''}${metrics['B&H ROI']}%` : '—'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Alpha (α)</span>
              <span className={`text-xs font-mono tabular-nums font-semibold mt-1 ${
                roiMarginVal !== null && roiMarginVal >= 0 ? 'text-plt-profit' : 'text-plt-risk'
              }`}>
                {roiMarginVal !== null ? (roiMarginVal > 0 ? `+${roiMarginVal.toFixed(1)}%` : `${roiMarginVal.toFixed(1)}%`) : '—'}
              </span>
            </div>
          </div>

          {/* 6-Metric Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Win Rate</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-profit mt-0.5">
                {metrics?.['Win Rate'] ? `${metrics['Win Rate']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Annual CAGR</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-text mt-0.5">
                {metrics?.['Annual CAGR'] ? `${metrics['Annual CAGR']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-risk/80 font-medium">Max Drawdown</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-risk mt-0.5">
                {metrics?.['Max Drawdown'] ? `${metrics['Max Drawdown']}%` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
              <span className="text-[9px] uppercase tracking-wider text-plt-muted font-medium">Avg/Trade</span>
              <span className="text-xs font-mono tabular-nums font-semibold text-plt-text mt-0.5">
                {metrics?.['Avg. Return/Trade'] ? `${metrics['Avg. Return/Trade']}%` : '—'}
              </span>
            </div>
          </div>

          {/* Chart Backtest Horizon Controls */}
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-plt-muted flex items-center gap-1.5">
              <Calendar size={12} className="text-plt-muted" />
              Backtest Horizon
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex flex-col gap-1">
                <label className="text-plt-muted text-[10px]">Start Date</label>
                <input
                  type="date"
                  className="date-token font-mono"
                  value={strategyStartDate || '2025-01-01'}
                  onChange={(e) => setStrategyStartDate?.(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-plt-muted text-[10px]">End Date</label>
                <input
                  type="date"
                  className="date-token font-mono"
                  value={strategyEndDate || ''}
                  placeholder="Present"
                  onChange={(e) => setStrategyEndDate?.(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WALK-FORWARD OPTIMIZER / PRODUCTION ARCHITECTURE */}
      {activeTab === 'optimizer' && (
        selectedStrategy === 'thoth_egx_macro' ? (
          <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-purple-400">Primary Growth Champion</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">FROZEN V3.7P</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1">
              <div className="bg-white/[0.04] p-2 rounded-lg border border-white/[0.06]">
                <span className="text-plt-muted block text-[9px] uppercase">Signal Entry</span>
                <span className="text-plt-text font-semibold">Conviction ≥ 70</span>
              </div>
              <div className="bg-white/[0.04] p-2 rounded-lg border border-white/[0.06]">
                <span className="text-plt-muted block text-[9px] uppercase">Exit Rule</span>
                <span className="text-plt-text font-semibold">Dynamic Velocity</span>
              </div>
              <div className="bg-white/[0.04] p-2 rounded-lg border border-white/[0.06]">
                <span className="text-plt-muted block text-[9px] uppercase">Constraints</span>
                <span className="text-plt-text font-semibold">Hold ≥3, Cool 10</span>
              </div>
              <div className="bg-white/[0.04] p-2 rounded-lg border border-white/[0.06]">
                <span className="text-plt-muted block text-[9px] uppercase">Universe</span>
                <span className="text-plt-text font-semibold">Full EGX (216)</span>
              </div>
            </div>
            <p className="text-[9.5px] text-plt-muted leading-relaxed pt-0.5">
              Production candidate frozen model using lookback synthesis (UP: 21 bars, DOWN: 126 bars) and calibrated momentum delta hazard scoring.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Model Toggle */}
            <div className="flex bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl">
              <button
                type="button"
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  trainingModel === 'psi8'
                    ? 'bg-white/[0.12] text-plt-text shadow-sm'
                    : 'text-plt-muted hover:text-plt-text'
                }`}
                onClick={() => setTrainingModel('psi8')}
              >
                PSI-8 (Inflection)
              </button>
              <button
                type="button"
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  trainingModel === 'psi40'
                    ? 'bg-white/[0.12] text-plt-text shadow-sm'
                    : 'text-plt-muted hover:text-plt-text'
                }`}
                onClick={() => setTrainingModel('psi40')}
              >
                PSI-40 (Trend)
              </button>
            </div>

            {/* Cutoff Selector */}
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-plt-muted">
                <span className="font-medium uppercase tracking-wider">In-Sample Cutoff</span>
                <div className="flex gap-1 font-mono">
                  {(['2020', '2022', '2024', 'custom'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTrainCutoffPreset(preset)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] transition ${
                        trainCutoffPreset === preset
                          ? 'bg-white/[0.15] text-plt-text font-medium'
                          : 'bg-white/[0.06] text-plt-muted hover:text-plt-text'
                      }`}
                    >
                      {preset === 'custom' ? 'Custom' : `≤${preset}`}
                    </button>
                  ))}
                </div>
              </div>

              {trainCutoffPreset === 'custom' && (
                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-plt-muted text-[10px]">Custom Date</label>
                  <input
                    type="date"
                    className="date-token w-32 font-mono"
                    value={customCutoffDate}
                    onChange={(e) => setCustomCutoffDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Run Optimizer CTA */}
            <button
              type="button"
              className="w-full bg-white text-black hover:bg-white/90 transition-all rounded-xl py-2 text-[11px] font-semibold disabled:opacity-50 relative overflow-hidden flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              onClick={startTraining}
              disabled={optimizing}
            >
              {optimizing ? (
                <>
                  <span className="relative z-10 font-mono">50k Combos... {optimProgress.toFixed(0)}%</span>
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white/20 z-0 transition-all duration-300"
                    style={{ width: `${optimProgress}%` }}
                  />
                </>
              ) : (
                <>
                  <Zap size={13} />
                  <span>Run Walk-Forward Optimizer (50k)</span>
                </>
              )}
            </button>
          </div>
        )
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[9px] text-plt-muted font-mono">
        <span>{visibleSignalData?.modelVersion || 'PSI v1.0'}</span>
        <span>Updated {visibleSignalData?.date ? new Date(visibleSignalData.date).toLocaleDateString() : 'Live'}</span>
      </div>
    </div>
  );

  const displaySignal = isBuy ? 'Buy' : isExit ? 'Sell' : 'Hold';

  return (
    <div className="absolute top-[50px] left-3 right-3 sm:top-3 sm:right-3 sm:left-auto z-30 w-auto max-w-[calc(100vw-24px)] sm:max-w-[380px] sm:min-w-[280px] bg-white/[0.06] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/[0.16] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col transition-all select-none">
      {/* -------------------------------------------------- */}
      {/* FLOATING HUD (COLLAPSED HEADER - SINGLE ROW)      */}
      {/* -------------------------------------------------- */}
      <div
        className="p-1.5 sm:p-2 cursor-pointer flex items-center justify-between gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left: Custom Strategy Selector Dropdown */}
        <div className="relative flex items-center min-w-0" ref={strategyDropdownRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsStrategyDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-1 rounded-md text-xs font-semibold text-plt-text hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer tracking-tight"
          >
            <span className="truncate max-w-[130px] sm:max-w-[160px]">{activeStratDef?.label || 'Select Strategy'}</span>
            <ChevronDown
              size={12}
              className={`text-plt-muted transition-transform duration-200 shrink-0 ${isStrategyDropdownOpen ? 'rotate-180 text-plt-text' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isStrategyDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 mt-1.5 min-w-[210px] w-max max-w-[260px] bg-plt-raised/95 backdrop-blur-2xl border border-plt-border-strong rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] p-1 z-50 overflow-hidden"
              >
                <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-plt-muted border-b border-plt-border/50 mb-1">
                  Active Strategies
                </div>
                <div className="space-y-0.5">
                  {strategies.map((strat) => {
                    const isSelected = strat.id === selectedStrategy;
                    return (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => {
                          setSelectedStrategy(strat.id);
                          setIsStrategyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.12] text-white font-medium shadow-sm'
                            : 'text-plt-muted hover:text-plt-text hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className={`text-xs ${isSelected ? 'font-semibold text-white' : 'text-plt-text'}`}>
                            {strat.label}
                          </span>
                          {strat.description && (
                            <span className="text-[10px] text-plt-muted font-normal leading-tight line-clamp-1 mt-0.5">
                              {strat.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-plt-profit shrink-0 shadow-[0_0_8px_var(--plt-profit)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Signal Badge + MI + Alpha + Eye + Chevron */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Signal Status Badge (Buy / Sell / Hold) */}
          {loading ? (
            <div className="flex items-center gap-1 text-plt-muted text-[10px] font-mono">
              <Activity size={11} className="animate-spin text-plt-muted" />
            </div>
          ) : (
            <div
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 border ${
                isBuy
                  ? 'bg-plt-profit/15 text-plt-profit border-plt-profit/30'
                  : isExit
                    ? 'bg-plt-risk/15 text-plt-risk border-plt-risk/30'
                    : 'bg-white/[0.06] text-plt-muted border-white/[0.1]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBuy ? 'bg-plt-profit animate-pulse' : isExit ? 'bg-plt-risk' : 'bg-plt-muted'
                }`}
              />
              <span>{displaySignal}</span>
            </div>
          )}

          {/* Master Index (MI) */}
          {masterIndex !== null && (
            <span className="text-[10px] font-mono text-plt-muted whitespace-nowrap">
              MI: <strong className="text-plt-text font-semibold">{masterIndex.toFixed(0)}</strong>
            </span>
          )}

          {/* Alpha Margin Pill */}
          {roiMarginVal !== null && (
            <span
              className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                roiMarginVal >= 0
                  ? 'bg-plt-profit/15 text-plt-profit border-plt-profit/30'
                  : 'bg-plt-risk/15 text-plt-risk border-plt-risk/30'
              }`}
              title={`Alpha Margin: ${roiMarginVal > 0 ? '+' : ''}${roiMarginVal.toFixed(2)}%`}
            >
              {roiMarginVal > 0 ? `+${roiMarginVal.toFixed(1)}% α` : `${roiMarginVal.toFixed(1)}% α`}
            </span>
          )}

          {/* Eye Toggle Button */}
          {setShowSignals && (
            <button
              type="button"
              onClick={() => setShowSignals(!showSignals)}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                !showSignals
                  ? 'text-plt-text bg-white/[0.10]'
                  : 'text-plt-muted hover:text-plt-text hover:bg-white/10'
              }`}
              title={showSignals ? 'Hide Signals' : 'Show Signals'}
            >
              {showSignals ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}

          {/* Expand Chevron */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-plt-muted hover:text-plt-text transition-colors cursor-pointer"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180 text-plt-text' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* EXPANDED INSPECTOR BODY                            */}
      {/* -------------------------------------------------- */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-white/[0.08] px-2.5 pb-2.5"
          >
            {renderInspectorBody()}
          </motion.div>
        )}
      </AnimatePresence>

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
            toast.success('Strategy Updated', `Applied combination for ${activeSymbol} on ${chosenModel.toUpperCase()}.`);
          }
        }}
      />
    </div>
  );
}

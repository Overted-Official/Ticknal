'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  Calendar,
  Activity,
  Download,
  Maximize2,
  Minimize2,
  Camera,
  HelpCircle,
  SlidersHorizontal,
} from '@/components/ui/icon-library';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';

import {
  STRATEGIES,
  getAvailableStrategies,
  type EquityPoint,
  type FullBacktestReport,
} from '@/strategies/registry';
import { runPsiStrategy } from '@/strategies/PSI/psiStrategy';
import type { ChartData } from '@/components/platform/ChartWidget';
import { useToast } from '@/context/ToastContext';
import { PsiOptimizationDrawer } from './PsiOptimizationDrawer';
import type { CandidateOptimizationResult } from '@/strategies/PSI/psiOptimizer.worker';

type ViewTab = 'performance' | 'trades' | 'optimizer';

interface SignalPanelProps {
  activeSymbol: string | null;
  timeframe?: string;
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
  companyName?: string;
  logoUrl?: string | null;
}

export default function SignalPanel({
  activeSymbol,
  timeframe = 'D',
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

  // Layout states (default to collapsed on all viewports so chart has full view; expanded via toolbar or dock toggle)
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('performance');

  // Strategy Report / Backtest State
  const [initialCapital, setInitialCapital] = useState<number>(3000);
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [activePreset, setActivePreset] = useState<'2025' | '1y' | 'all' | 'custom'>('2025');
  const [reportLoading, setReportLoading] = useState(false);

  // Series visibility toggles
  const [showCumulativePnl, setShowCumulativePnl] = useState(true);
  const [showBuyHold, setShowBuyHold] = useState(true);
  const [showExcursions, setShowExcursions] = useState(true);

  // Breakdown sub-tab
  const [analysisSubTab, setAnalysisSubTab] = useState<'breakdown' | 'periodical' | 'benchmarking'>('breakdown');
  const [signalGrouping, setSignalGrouping] = useState<'by-signals' | 'by-side'>('by-signals');

  // Signals State
  const [signalData, setSignalData] = useState<Record<string, any> | null>(null);
  const [internalMetrics, setInternalMetrics] = useState<Record<string, string> | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [isStrategyDropdownOpen, setIsStrategyDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const strategyDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Optimizer State
  const [optimizing, setOptimizing] = useState(false);
  const [optimProgress, setOptimProgress] = useState(0);
  const [trainingModel, setTrainingModel] = useState<'psi8' | 'psi40'>('psi8');
  const [trainCutoffPreset, setTrainCutoffPreset] = useState<'2020' | '2022' | '2024' | 'custom'>('2024');
  const [customCutoffDate, setCustomCutoffDate] = useState<string>('2024-12-31');

  // Optimization Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCandidates, setDrawerCandidates] = useState<CandidateOptimizationResult[]>([]);
  const [drawerTrainPeriod, setDrawerTrainPeriod] = useState('2020-01-01 to 2024-12-31');
  const [drawerTestPeriod, setDrawerTestPeriod] = useState('2025-01-01 to Present');
  const [drawerTotalEvaluated, setDrawerTotalEvaluated] = useState(50220);

  // Global listener from BottomToolbar
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      setIsCollapsed(false);
      const requested = customEvent.detail?.tab;
      if (requested === 'trades') {
        setActiveTab('trades');
      } else if (requested === 'optimizer') {
        setActiveTab('optimizer');
      } else {
        setActiveTab('performance');
      }
    };
    window.addEventListener('ticknal:open-strategy-report', handleOpen);
    return () => window.removeEventListener('ticknal:open-strategy-report', handleOpen);
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(e.target as Node)) {
        setIsStrategyDropdownOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const strategies = getAvailableStrategies();
  const activeStratDef = STRATEGIES[selectedStrategy] || STRATEGIES['psi'];

  const currencySymbol = useMemo(() => {
    if (!activeSymbol) return 'EGP';
    const clean = activeSymbol.toUpperCase();
    if (clean.includes('GC') || clean.includes('SI') || clean.includes('GOLD') || clean.includes('SILVER')) {
      return 'USD';
    }
    return 'EGP';
  }, [activeSymbol]);

  // Full Backtest Report State
  const [report, setReport] = useState<FullBacktestReport>({
    trades: [],
    equityCurve: [],
    signals: [],
    stats: {
      initialCapital: 3000,
      finalEquity: 3000,
      netProfit: 0,
      netProfitPct: 0,
      buyHoldReturn: 0,
      buyHoldReturnPct: 0,
      alphaMargin: 0,
      maxDrawdown: 0,
      maxDrawdownAmount: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      grossProfit: 0,
      grossLoss: 0,
      avgTradePnl: 0,
      avgTradeReturnPct: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      avgBarsHeld: 0,
      annualCagr: 0,
      sharpeRatio: 0,
      startDate: strategyStartDate || '2025-01-01',
      endDate: strategyEndDate || '',
    },
  });

  // Fetch Signals
  useEffect(() => {
    if (!activeSymbol) return;
    if (replayActive && !replayEndDate) return;

    const fetchSignals = async () => {
      setSignalsLoading(true);
      try {
        const params = new URLSearchParams({
          symbol: activeSymbol,
          strategy: selectedStrategy,
          timeframe,
        });

        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
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
        if (data.formattedMetrics && typeof data.formattedMetrics === 'object') {
          setInternalMetrics(data.formattedMetrics);
        }
        if (data.latestActionableSignal) {
          setSignalData({
            ...data.latestActionableSignal,
            latestMasterIndex: data.latestMasterIndex ?? data.latestActionableSignal.masterIndex,
          });
        } else {
          setSignalData(
            data.latestMasterIndex !== null
              ? { signal: 'NO FRESH SIGNAL', masterIndex: data.latestMasterIndex }
              : { signal: 'NO FRESH SIGNAL' }
          );
        }
      } catch (err) {
        console.error('Error fetching signals:', err);
      } finally {
        setSignalsLoading(false);
      }
    };

    fetchSignals();
  }, [
    activeSymbol, replayActive, replayEndDate, replayStartDate,
    strategyStartDate, strategyEndDate, selectedStrategy, strategyParams, timeframe,
  ]);

  // Fetch Strategy Report from /api/strategy-report
  useEffect(() => {
    if (!activeSymbol) return;

    const controller = new AbortController();
    const fetchReport = async () => {
      setReportLoading(true);
      try {
        const params = new URLSearchParams({
          symbol: activeSymbol,
          strategy: selectedStrategy,
          timeframe,
          start: strategyStartDate || '2025-01-01',
          initialCapital: String(initialCapital),
        });
        if (strategyEndDate) params.set('end', strategyEndDate);

        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });

        const res = await fetch(`/api/strategy-report?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Could not load strategy report');
        const data = await res.json();
        if (data?.stats) {
          setReport(data as FullBacktestReport);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error('Error fetching strategy report:', err);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
    return () => controller.abort();
  }, [activeSymbol, selectedStrategy, timeframe, strategyStartDate, strategyEndDate, initialCapital, strategyParams]);

  if (!activeSymbol) return null;

  // Computed signal values
  const visibleSignalData = signalData;
  const rawSignal = visibleSignalData?.signal || 'NEUTRAL';
  const isBuy = rawSignal.toUpperCase().includes('BUY');
  const isExit = rawSignal.toUpperCase().includes('SELL') || rawSignal.toUpperCase().includes('EXIT');
  const signalAction: 'BUY' | 'HOLD' | 'SELL' = isBuy ? 'BUY' : isExit ? 'SELL' : 'HOLD';
  const bannerSignal = signalAction;
  const reason = isExit ? visibleSignalData?.exitReason : visibleSignalData?.entryReason;

  const masterIndex =
    visibleSignalData?.masterIndex !== undefined && visibleSignalData?.masterIndex !== null
      ? Number(visibleSignalData.masterIndex) : null;
  const mdm =
    visibleSignalData?.medianDailyMove !== undefined && visibleSignalData?.medianDailyMove !== null
      ? Number(visibleSignalData.medianDailyMove) : null;

  const triggerPrice  = visibleSignalData?.price     !== undefined ? Number(visibleSignalData.price)       : null;
  const stopLossPrice = visibleSignalData?.stopLoss   !== undefined ? Number(visibleSignalData.stopLoss)    : null;
  const targetPrice   = visibleSignalData?.targetPrice !== undefined ? Number(visibleSignalData.targetPrice) : null;

  const effectiveMetrics = metrics || internalMetrics;
  const sysRoi      = effectiveMetrics?.['Sys ROI']  ? parseFloat(effectiveMetrics['Sys ROI'])  : null;
  const bnHroi      = effectiveMetrics?.['B&H ROI']  ? parseFloat(effectiveMetrics['B&H ROI'])  : 0;
  const roiMarginVal = effectiveMetrics?.['ROI Margin']
    ? parseFloat(effectiveMetrics['ROI Margin'])
    : sysRoi !== null ? sysRoi - bnHroi : null;

  const { stats, trades, equityCurve } = report;

  const effectiveStrategyRoiPct = stats.netProfitPct !== 0 ? stats.netProfitPct : (sysRoi ?? 0);
  const effectiveStrategyRoiAmt = stats.netProfit;
  const effectiveBnhRoiPct = stats.buyHoldReturnPct !== 0 ? stats.buyHoldReturnPct : bnHroi;
  const effectiveBnhRoiAmt = stats.buyHoldReturn;
  const effectiveAlphaPct = stats.alphaMargin !== 0 ? stats.alphaMargin : (roiMarginVal ?? (effectiveStrategyRoiPct - effectiveBnhRoiPct));

  const effectiveAvgTradeReturnPct = stats.avgTradeReturnPct !== 0
    ? stats.avgTradeReturnPct
    : (effectiveMetrics?.['Avg. Return/Trade'] ? parseFloat(effectiveMetrics['Avg. Return/Trade']) : 0);

  const effectiveAvgBars = stats.avgBarsHeld > 0
    ? stats.avgBarsHeld.toFixed(1)
    : (effectiveMetrics?.['Avg Bars/Trade'] ? String(effectiveMetrics['Avg Bars/Trade']) : (stats.totalTrades > 0 ? '—' : '0.0'));

  const effectiveMaxDd = stats.maxDrawdown > 0
    ? stats.maxDrawdown
    : (effectiveMetrics?.['Max Drawdown'] ? Math.abs(parseFloat(effectiveMetrics['Max Drawdown'])) : 0);

  const { computedMaxMae, computedAvgMae } = useMemo(() => {
    const rawMax =
      effectiveMetrics?.['Max Adverse Excursion'] ??
      effectiveMetrics?.['maxAdverseExcursion'] ??
      effectiveMetrics?.['MAE'];
    const rawAvg =
      effectiveMetrics?.['Avg. Adverse Excursion'] ??
      effectiveMetrics?.['avgAdverseExcursion'];

    let maxMaeStr = '—';
    let avgMaeStr = '—';

    if (rawMax !== undefined && rawMax !== null && rawMax !== '') {
      const num = parseFloat(String(rawMax));
      if (!isNaN(num)) maxMaeStr = num === 0 ? '0.00%' : num < 0 ? `${num.toFixed(2)}%` : `-${num.toFixed(2)}%`;
    }

    if (rawAvg !== undefined && rawAvg !== null && rawAvg !== '') {
      const num = parseFloat(String(rawAvg));
      if (!isNaN(num)) avgMaeStr = num === 0 ? '0.00%' : num < 0 ? `${num.toFixed(2)}%` : `-${num.toFixed(2)}%`;
    }

    if (trades && trades.length > 0) {
      const adverseVals = trades
        .map((t) => (typeof t.adverseExcursion === 'number' ? t.adverseExcursion : null))
        .filter((v): v is number => v !== null);

      if (adverseVals.length > 0) {
        if (maxMaeStr === '—') {
          const worst = Math.min(...adverseVals);
          maxMaeStr = worst === 0 ? '0.00%' : worst < 0 ? `${worst.toFixed(2)}%` : `-${worst.toFixed(2)}%`;
        }
        if (avgMaeStr === '—') {
          const avg = adverseVals.reduce((a, b) => a + b, 0) / adverseVals.length;
          avgMaeStr = avg === 0 ? '0.00%' : avg < 0 ? `${avg.toFixed(2)}%` : `-${avg.toFixed(2)}%`;
        }
      }
    }

    if (maxMaeStr === '—' && chartData && chartData.length > 1) {
      try {
        const bars = chartData.map((d) => ({ date: String(d.time), open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume }));
        const res = runPsiStrategy(bars, strategyParams as any);
        if (res.metrics && typeof res.metrics.maxAdverseExcursion === 'number') {
          const num = res.metrics.maxAdverseExcursion;
          maxMaeStr = num === 0 ? '0.00%' : num < 0 ? `${num.toFixed(2)}%` : `-${num.toFixed(2)}%`;
        }
        if (res.metrics && typeof res.metrics.avgAdverseExcursion === 'number') {
          const num = res.metrics.avgAdverseExcursion;
          avgMaeStr = num === 0 ? '0.00%' : num < 0 ? `${num.toFixed(2)}%` : `-${num.toFixed(2)}%`;
        }
      } catch { /* ignore */ }
    }

    return { computedMaxMae: maxMaeStr, computedAvgMae: avgMaeStr };
  }, [effectiveMetrics, trades, chartData, strategyParams]);

  const computedMae = computedMaxMae;

  // Risk / Reward
  const hasRR = selectedStrategy !== 'psi_v2' && selectedStrategy !== 'thoth_egx_macro'
    && triggerPrice !== null && stopLossPrice !== null && targetPrice !== null;
  const riskAmt   = hasRR ? Math.abs(triggerPrice! - stopLossPrice!) : 0;
  const rewardAmt = hasRR ? Math.abs(targetPrice!  - triggerPrice!)  : 0;
  const rrTotal   = riskAmt + rewardAmt;
  const riskBarPct = rrTotal > 0 ? (riskAmt / rrTotal) * 100 : 50;
  const rrRatio    = riskAmt > 0 ? rewardAmt / riskAmt : null;

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'wins') return trades.filter((t) => t.netPnl > 0);
    if (tradeFilter === 'losses') return trades.filter((t) => t.netPnl <= 0);
    return trades;
  }, [trades, tradeFilter]);

  const handleExportCSV = () => {
    if (!trades || trades.length === 0) return;
    const headers = [
      'Trade #', 'Direction', 'Entry Date', 'Entry Price', 'Exit Date', 'Exit Price',
      'Units', 'Position Value', 'Net PnL', 'Return %', 'Bars Held', 'Exit Reason',
    ];
    const rows = trades.map((t) => [
      t.tradeNumber, 'LONG', t.entryDate, t.entryPrice.toFixed(2), t.exitDate, t.exitPrice.toFixed(2),
      t.shares, t.positionValue.toFixed(2), t.netPnl.toFixed(2), `${t.returnPct.toFixed(2)}%`,
      t.barsHeld, `"${t.exitReason}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeSymbol.replace('.CA', '')}_strategy_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePresetDate = (preset: '2025' | '1y' | 'all') => {
    setActivePreset(preset);
    const lastDate = chartData.length > 0
      ? (typeof chartData[chartData.length - 1].time === 'number'
          ? new Date((chartData[chartData.length - 1].time as number) * 1000).toISOString().split('T')[0]
          : String(chartData[chartData.length - 1].time))
      : new Date().toISOString().split('T')[0];
    setStrategyEndDate?.(lastDate);

    if (preset === '2025') {
      setStrategyStartDate?.('2025-01-01');
    } else if (preset === '1y') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      setStrategyStartDate?.(d.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      const firstDate = chartData.length > 0
        ? (typeof chartData[0].time === 'number'
            ? new Date((chartData[0].time as number) * 1000).toISOString().split('T')[0]
            : String(chartData[0].time))
        : '2020-01-01';
      setStrategyStartDate?.(firstDate);
    }
  };

  const startTraining = () => {
    if (!chartData || chartData.length === 0) return;
    setOptimizing(true);
    setOptimProgress(0);
    const worker = new Worker(new URL('../../strategies/PSI/psiOptimizer.worker.ts', import.meta.url));
    const cutoff = trainCutoffPreset === '2020' ? '2020-12-31' : trainCutoffPreset === '2022' ? '2022-12-31' : trainCutoffPreset === '2024' ? '2024-12-31' : customCutoffDate;
    const testStart = new Date(new Date(cutoff).getTime() + 86400000).toISOString().split('T')[0];
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
        toast.success('Walk-Forward Complete', `Evaluated ${e.data.totalEvaluated.toLocaleString()} combinations.`);
        worker.terminate();
      } else if (e.data.type === 'error') {
        setOptimizing(false);
        toast.error('Optimization Error', e.data.message);
        worker.terminate();
      }
    };
    worker.postMessage({
      bars: chartData.map((d) => ({ date: d.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume })),
      model: trainingModel, trainStartDate: undefined, trainEndDate: cutoff,
      testStartDate: testStart, testEndDate: undefined, topK: 10,
    });
  };

  return (
    <>
      {/* Mobile Backdrop when open */}
      {!isCollapsed && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={`w-full bg-plt-base border-t border-plt-border-soft shrink-0 flex flex-col select-none relative font-sans transition-all duration-200 ${
          isCollapsed
            ? 'h-10 md:h-9 z-30'
            : isMaximized
            ? 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-10 max-md:z-50 max-md:h-[calc(100vh-2.5rem)] max-md:rounded-t-2xl max-md:shadow-2xl md:h-[620px] md:z-30'
            : 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:z-50 max-md:h-[calc(100vh-3.5rem)] max-md:rounded-t-2xl max-md:shadow-2xl md:h-[400px] md:z-30'
        }`}
      >
        {/* Mobile Header when expanded */}
        {!isCollapsed && (
          <div className="md:hidden flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-plt-border-soft bg-plt-base rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-plt-text flex items-center gap-1.5">
                <Sparkles size={13} className="text-plt-accent" />
                Strategy Report
              </span>
              <span className="text-[10px] font-semibold text-plt-muted bg-plt-active px-2 py-0.5 rounded">
                {activeStratDef?.shortName || activeStratDef?.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded text-plt-muted hover:text-white transition-colors cursor-pointer"
              title="Close Strategy Report"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        )}

        {/* Mobile Top Bar when collapsed */}
        {isCollapsed && (
          <div
            onClick={() => setIsCollapsed(false)}
            className="md:hidden flex items-center justify-between px-3 h-10 w-full cursor-pointer hover:bg-plt-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-plt-text flex items-center gap-1.5">
                <Sparkles size={13} className="text-plt-accent" />
                {activeStratDef?.shortName || activeStratDef?.label}
              </span>
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  signalAction === 'BUY'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : signalAction === 'SELL'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-white/10 text-plt-subtle border border-white/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    signalAction === 'BUY'
                      ? 'bg-emerald-400 animate-pulse'
                      : signalAction === 'SELL'
                      ? 'bg-rose-400'
                      : 'bg-plt-muted'
                  }`}
                />
                <span>{signalAction}</span>
                {triggerPrice !== null && (
                  <span className="tabular-nums font-mono font-bold text-white text-[10px]">
                    {triggerPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-plt-accent bg-plt-accent/15 border border-plt-accent/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                Report <ChevronUp size={13} />
              </span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            1. TRADINGVIEW-STYLE TOP TOOLBAR (Always on desktop; on mobile only when expanded)
        ══════════════════════════════════════════════════════ */}
        <div className={`items-center justify-between px-3 h-9 shrink-0 bg-plt-base border-b border-plt-border-soft ${isCollapsed ? 'hidden md:flex' : 'flex'}`}>
          {/* Left: Strategy dropdown & date range */}
          <div className="flex items-center gap-2">
          {/* Strategy Dropdown */}
          <div className="relative" ref={strategyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStrategyDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold text-plt-text hover:bg-plt-hover transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeStratDef?.label || 'Select Strategy'}</span>
              <ChevronDown size={12} className={`text-plt-muted transition-transform duration-200 ${isStrategyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isStrategyDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: isCollapsed ? 4 : -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: isCollapsed ? 4 : -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className={`surface-popover absolute ${isCollapsed ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-0 w-[230px] z-[60] p-1 shadow-2xl`}
                >
                  <div className="kpi-title px-2 py-1 border-b border-plt-border-soft mb-1">
                    Select Strategy
                  </div>
                  {strategies.map((strat) => (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => { setSelectedStrategy(strat.id); setIsStrategyDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                        strat.id === selectedStrategy ? 'bg-plt-active text-plt-text font-semibold' : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                      }`}
                    >
                      <span className="truncate">{strat.label}</span>
                      {strat.id === selectedStrategy && <div className="w-1.5 h-1.5 rounded-full bg-plt-profit" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-3.5 w-px bg-plt-border-soft" />

          {/* Date Range Picker Pill */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-plt-subtle hover:bg-plt-hover transition-colors cursor-pointer tabular-nums"
            >
              <Calendar size={12} className="text-plt-muted" />
              <span className="text-[11px]">{strategyStartDate || '2025-01-01'} — {strategyEndDate || 'Present'}</span>
              <ChevronDown size={11} className="text-plt-muted" />
            </button>

            <AnimatePresence>
              {isDatePickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: isCollapsed ? 4 : -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: isCollapsed ? 4 : -4 }}
                  className={`surface-popover absolute ${isCollapsed ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} left-0 z-[60] space-y-2.5 w-[260px] p-3 shadow-2xl`}
                >
                  <div className="pill-switch w-full flex">
                    {(['2025', '1y', 'all'] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => { handlePresetDate(preset); setIsDatePickerOpen(false); }}
                        className={`flex-1 pill-switch-btn ${
                          activePreset === preset ? 'pill-switch-btn-active font-semibold' : ''
                        }`}
                      >
                        {preset === '2025' ? '2025+' : preset === '1y' ? '1 Year' : 'All Data'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] tabular-nums">
                    <div>
                      <span className="kpi-title block mb-0.5">Start</span>
                      <input
                        type="date"
                        value={strategyStartDate || '2025-01-01'}
                        onChange={(e) => { setStrategyStartDate?.(e.target.value); setActivePreset('custom'); }}
                        className="date-token w-full text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="kpi-title block mb-0.5">End</span>
                      <input
                        type="date"
                        value={strategyEndDate || ''}
                        onChange={(e) => { setStrategyEndDate?.(e.target.value); setActivePreset('custom'); }}
                        className="date-token w-full text-[11px]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-3.5 w-px bg-plt-border-soft" />

          {/* Actionable Signal Pill */}
          {signalsLoading ? (
            <div className="flex items-center gap-1 text-cold-gray-400 text-[11px]">
              <Activity size={11} className="animate-spin" />
            </div>
          ) : (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
              signalAction === 'BUY'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : signalAction === 'SELL'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-cold-gray-800 text-cold-gray-300 border border-cold-gray-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                signalAction === 'BUY'
                  ? 'bg-emerald-400 animate-pulse'
                  : signalAction === 'SELL'
                  ? 'bg-rose-400'
                  : 'bg-cold-gray-400'
              }`} />
              <span>{signalAction}</span>
              {triggerPrice !== null && signalAction === 'BUY' && (
                <span className="tabular-nums font-sans font-bold text-white text-[11px]">
                  {triggerPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick actions & window controls */}
        <div className="flex items-center gap-1">
          {/* CSV export */}
          {trades.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export Trades CSV"
              className="p-1 rounded text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors"
            >
              <Download size={13} />
            </button>
          )}

          {/* Eye toggle for chart signals */}
          {setShowSignals && (
            <button
              type="button"
              onClick={() => setShowSignals(!showSignals)}
              className={`p-1 rounded transition-colors ${!showSignals ? 'text-plt-text bg-plt-active' : 'text-plt-muted hover:text-plt-text hover:bg-plt-hover'}`}
              title={showSignals ? 'Hide signals on chart' : 'Show signals on chart'}
            >
              {showSignals ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          )}

          {/* Maximize */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 rounded text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors"
              title={isMaximized ? 'Restore height' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}

          {/* Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors"
            title={isCollapsed ? 'Expand Strategy Tester' : 'Collapse Strategy Tester'}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. EXPANDED CONTENT AREA
      ══════════════════════════════════════════════════════ */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-plt-base p-6 sm:p-8 space-y-10">

          {/* Docker Tab Switcher (Flat TradingView-style tabs, zero surface boxes or borders) */}
          <div className="flex items-center justify-between border-b border-[#1e222d] pb-3 mb-6 max-w-[1440px] mx-auto">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('performance')}
                className={`pb-2 -mb-2 text-xs font-medium transition-colors cursor-pointer relative ${
                  activeTab === 'performance'
                    ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
                    : 'text-cold-gray-400 hover:text-white'
                }`}
              >
                Strategy Performance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trades')}
                className={`pb-2 -mb-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  activeTab === 'trades'
                    ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
                    : 'text-cold-gray-400 hover:text-white'
                }`}
              >
                <span>List of Trades</span>
                <span className="text-[10px] text-cold-gray-500">({trades.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('optimizer')}
                className={`pb-2 -mb-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  activeTab === 'optimizer'
                    ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white'
                    : 'text-cold-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={12} className={activeTab === 'optimizer' ? 'text-white' : 'text-cold-gray-400'} />
                <span>Optimizer</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-cold-gray-400">
              <span className="font-semibold text-white">{activeSymbol}</span>
              <span>•</span>
              <span>{STRATEGIES[selectedStrategy]?.label || selectedStrategy}</span>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────
              TAB: STRATEGY PERFORMANCE (Flagship View)
          ────────────────────────────────────────────────── */}
          {activeTab === 'performance' && (
            <div className="space-y-12 sm:space-y-14 max-w-[1440px] mx-auto pb-12">

              {/* 1. KEY STATS SECTION (2 Clean Full-Width Rows, 1px White Border Cards, Core Stat Focused) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cold-gray-400">Key Stats</h4>
                  <span className="text-[11px] text-cold-gray-400 font-normal">
                    {stats.startDate} — {stats.endDate || 'Present'}
                  </span>
                </div>

                {/* Row 1: 3 ROI Metrics extending full width */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 w-full">
                  {/* 1. Strategy ROI */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">Strategy ROI</span>
                    <div className={`text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight mt-1.5 ${
                      effectiveStrategyRoiPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}>
                      {effectiveStrategyRoiPct >= 0 ? '+' : ''}{effectiveStrategyRoiPct.toFixed(2)}%
                    </div>
                  </div>

                  {/* 2. B&H ROI */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">B&amp;H ROI</span>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight text-white mt-1.5">
                      {effectiveBnhRoiPct >= 0 ? '+' : ''}{effectiveBnhRoiPct.toFixed(2)}%
                    </div>
                  </div>

                  {/* 3. ROI Alpha */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">ROI Alpha</span>
                    <div className={`text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight mt-1.5 ${
                      effectiveAlphaPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}>
                      {effectiveAlphaPct >= 0 ? '+' : ''}{effectiveAlphaPct.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Row 2: 4 Other Metrics extending full width (2x2 on phone) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full">
                  {/* 4. Avg move per trade (%) */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">Avg move / trade</span>
                    <div className={`text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight mt-1.5 ${
                      effectiveAvgTradeReturnPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}>
                      {effectiveAvgTradeReturnPct >= 0 ? '+' : ''}{effectiveAvgTradeReturnPct.toFixed(2)}%
                    </div>
                  </div>

                  {/* 5. Avg bars per trade */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">Avg bars / trade</span>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight text-white mt-1.5">
                      {effectiveAvgBars}
                    </div>
                  </div>

                  {/* 6. Max adverse excursion */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">Max adverse excursion</span>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight text-[#f23645] mt-1.5">
                      {computedMaxMae}
                    </div>
                  </div>

                  {/* 7. Max drawdown */}
                  <div className="bg-[#121214] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-3.5 sm:p-4 flex flex-col justify-between min-h-[82px] sm:min-h-[86px]">
                    <span className="text-xs sm:text-[13px] text-[#d1d4dc] font-normal truncate tracking-tight">Max drawdown</span>
                    <div className="text-xl sm:text-2xl font-bold tabular-nums font-sans tracking-tight text-[#f23645] mt-1.5">
                      {effectiveMaxDd > 0 ? `-${Math.abs(effectiveMaxDd).toFixed(2)}%` : '0.00%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PERFORMANCE (RECHARTS AREA & BENCHMARK CHART - Borderless & Flat) */}
              <div className="space-y-4 pt-10 sm:pt-12 border-t border-[#1e222d]">
                <div className="w-full space-y-4">
                  {/* Header with Legends */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cold-gray-400">Performance</h4>
                      <p className="text-[11px] text-cold-gray-400 mt-0.5">
                        Cumulative strategy equity compared against buy &amp; hold benchmark
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs select-none">
                      <button
                        type="button"
                        onClick={() => setShowCumulativePnl(!showCumulativePnl)}
                        className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${showCumulativePnl ? 'text-white font-medium' : 'text-cold-gray-500 opacity-60'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
                        <span>Cumulative PnL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBuyHold(!showBuyHold)}
                        className={`flex items-center gap-1.5 transition-opacity cursor-pointer ${showBuyHold ? 'text-white font-medium' : 'text-cold-gray-500 opacity-60'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]" />
                        <span>Buy and hold</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? 'Restore height' : 'Maximize'}
                        className="p-1 rounded text-cold-gray-400 hover:text-white transition-colors ml-1 cursor-pointer"
                      >
                        {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Chart Canvas */}
                  <div className="w-full h-[280px] sm:h-[320px] relative">
                    {equityCurve.length < 2 ? (
                      <div className="flex h-full items-center justify-center text-xs text-cold-gray-400 font-sans">
                        Not enough historical backtest points in period.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityCurve} margin={{ top: 12, right: 68, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="tvEquityGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#089981" stopOpacity={0.28} />
                              <stop offset="100%" stopColor="#089981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            stroke="#1e222d"
                            strokeDasharray="2 2"
                            vertical={false}
                            strokeOpacity={0.7}
                          />

                          <XAxis
                            dataKey="date"
                            stroke="#787b86"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={6}
                            minTickGap={35}
                          />

                          <YAxis
                            orientation="right"
                            stroke="#787b86"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : v.toFixed(0))}
                            dx={8}
                            domain={['auto', 'auto']}
                          />

                          {equityCurve.length > 0 && (
                            <ReferenceLine
                              y={equityCurve[equityCurve.length - 1].equity}
                              stroke="#089981"
                              strokeDasharray="2 2"
                              strokeOpacity={0.6}
                              label={({ viewBox }: any) => {
                                if (!viewBox) return null;
                                const { x, y, width } = viewBox;
                                const posX = x + width + 4;
                                const val = equityCurve[equityCurve.length - 1].equity;
                                return (
                                  <g transform={`translate(${posX}, ${y - 11})`}>
                                    <rect width="64" height="22" rx="4" fill="#089981" />
                                    <text
                                      x="32"
                                      y="15"
                                      fill="#ffffff"
                                      textAnchor="middle"
                                      fontSize="11"
                                      fontWeight="bold"
                                      fontFamily="sans-serif"
                                    >
                                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                                    </text>
                                  </g>
                                );
                              }}
                            />
                          )}

                          <RechartsTooltip
                            content={<StrategyChartTooltip currencySymbol={currencySymbol} initialCapital={initialCapital} />}
                          />

                          {showCumulativePnl && (
                            <Area
                              type="monotone"
                              dataKey="equity"
                              name="Strategy Equity"
                              stroke="#089981"
                              strokeWidth={2}
                              fill="url(#tvEquityGrad)"
                              isAnimationActive={false}
                            />
                          )}

                          {showBuyHold && (
                            <Line
                              type="monotone"
                              dataKey="buyHoldEquity"
                              name="Buy & Hold"
                              stroke="#2962ff"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              isAnimationActive={false}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. SIGNAL & EXECUTION LEVELS (Borderless & Flat) */}
              <div className="space-y-4 pt-10 sm:pt-12 border-t border-[#1e222d]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cold-gray-400">Signal &amp; Execution Levels</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  {/* Signal Card */}
                  <div className="flex flex-col justify-between space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cold-gray-400">Signal Status</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        signalAction === 'BUY'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : signalAction === 'SELL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-cold-gray-800 text-cold-gray-300 border border-cold-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          signalAction === 'BUY' ? 'bg-emerald-400 animate-pulse' : signalAction === 'SELL' ? 'bg-rose-400' : 'bg-cold-gray-400'
                        }`} />
                        <span>{signalAction}</span>
                      </span>
                    </div>
                    <div className="py-1">
                      <div className="text-lg font-bold text-white tabular-nums">
                        {triggerPrice !== null ? `${triggerPrice.toFixed(2)} ${currencySymbol}` : 'Market Price'}
                      </div>
                      <p className="text-xs text-cold-gray-400 mt-1 leading-relaxed">
                        {reason || (signalAction === 'BUY' ? 'Active long entry setup triggered.' : signalAction === 'SELL' ? 'Strategy exit rule reached.' : 'Position holding / waiting for trigger conditions.')}
                      </p>
                    </div>
                  </div>

                  {/* Risk-Reward Execution Levels */}
                  <div className="flex flex-col justify-between space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cold-gray-400">Execution Levels</span>
                      {rrRatio !== null && (
                        <span className="text-xs font-semibold text-cold-gray-300 tabular-nums">
                          R:R {rrRatio.toFixed(1)}x
                        </span>
                      )}
                    </div>
                    {hasRR ? (
                      <div className="space-y-2.5 tabular-nums py-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#f23645] font-semibold">SL {stopLossPrice!.toFixed(2)}</span>
                          <span className="text-cold-gray-400">Entry {triggerPrice!.toFixed(2)}</span>
                          <span className="text-[#089981] font-semibold">TP {targetPrice!.toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden flex bg-cold-gray-800">
                          <div className="bg-[#f23645] h-full rounded-l-full opacity-80" style={{ width: `${riskBarPct}%` }} />
                          <div className="w-0.5 bg-white shrink-0" />
                          <div className="bg-[#089981] h-full flex-1 rounded-r-full opacity-80" />
                        </div>
                        <div className="flex justify-between text-[11px] text-cold-gray-400">
                          <span>Risk: {riskAmt.toFixed(2)}</span>
                          <span>Reward: {rewardAmt.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-cold-gray-400 py-2">
                        Dynamic trailing model active without static bracket targets.
                      </div>
                    )}
                  </div>

                  {/* Master Index & Sentiment Gauge */}
                  <div className="flex flex-col justify-between space-y-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cold-gray-400">Master Index (MI)</span>
                      <span className="text-xs font-bold text-white tabular-nums">
                        {masterIndex !== null ? masterIndex.toFixed(1) : '—'}
                      </span>
                    </div>
                    <div className="space-y-2 py-1">
                      <div className="relative w-full h-2 rounded-full bg-cold-gray-800 overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-emerald-500/40 via-white/10 to-rose-500/40" />
                        {masterIndex !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-2 bg-white rounded-full -ml-1 shadow-[0_0_6px_white]"
                            style={{ left: `${Math.min(Math.max(masterIndex, 0), 100)}%` }}
                          />
                        )}
                      </div>
                      <div className="flex justify-between text-[10px] tabular-nums text-cold-gray-400">
                        <span>0 Oversold</span>
                        <span>50 Neutral</span>
                        <span>100 Overbought</span>
                      </div>
                    </div>
                    {mdm !== null && (
                      <div className="text-xs tabular-nums text-cold-gray-400">
                        Median Daily Move (MDM): <span className="text-white font-medium">{mdm.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. PERFORMANCE SUMMARY ANALYTICS (Borderless & Flat) */}
              <div className="space-y-4 pt-10 sm:pt-12 border-t border-[#1e222d]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cold-gray-400">Performance Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  {/* Panel 1 */}
                  <div className="space-y-3 py-1">
                    <div className="text-xs font-semibold text-white">Trade Analytics</div>
                    <div className="space-y-2.5 text-xs tabular-nums">
                      <div className="flex justify-between"><span className="text-cold-gray-400">Total Trades</span><span className="text-white font-medium">{stats.totalTrades}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Winning Trades</span><span className="text-white font-medium">{stats.winningTrades}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Losing Trades</span><span className="text-white font-medium">{stats.losingTrades}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Win Rate</span><span className="text-[#089981] font-bold">{stats.winRate.toFixed(2)}%</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Profit Factor</span><span className="text-white font-bold">{stats.profitFactor.toFixed(2)}</span></div>
                    </div>
                  </div>

                  {/* Panel 2 */}
                  <div className="space-y-3 py-1">
                    <div className="text-xs font-semibold text-white">Capital &amp; Returns</div>
                    <div className="space-y-2.5 text-xs tabular-nums">
                      <div className="flex justify-between"><span className="text-cold-gray-400">Net Profit</span><span className="text-[#089981] font-bold">+{stats.netProfit.toFixed(2)} {currencySymbol}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Gross Profit</span><span className="text-white font-medium">+{stats.grossProfit.toFixed(2)} {currencySymbol}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Gross Loss</span><span className="text-white font-medium">-{stats.grossLoss.toFixed(2)} {currencySymbol}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Buy &amp; Hold Return</span><span className="text-[#2962ff] font-medium">{stats.buyHoldReturnPct.toFixed(2)}%</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Alpha Margin</span><span className="text-[#089981] font-bold">+{stats.alphaMargin.toFixed(2)}%</span></div>
                    </div>
                  </div>

                  {/* Panel 3 */}
                  <div className="space-y-3 py-1">
                    <div className="text-xs font-semibold text-white">Risk &amp; Streaks</div>
                    <div className="space-y-2.5 text-xs tabular-nums">
                      <div className="flex justify-between"><span className="text-cold-gray-400">Max Drawdown</span><span className="text-[#f23645] font-bold">{stats.maxDrawdown.toFixed(2)}%</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Sharpe Ratio</span><span className="text-white font-medium">{stats.sharpeRatio.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Annualized CAGR</span><span className="text-white font-medium">{stats.annualCagr.toFixed(2)}%</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">Max Consecutive Wins</span><span className="text-white font-medium">{stats.maxConsecutiveWins}</span></div>
                      <div className="flex justify-between"><span className="text-cold-gray-400">MAE</span><span className="text-[#f23645] font-medium">{computedMae}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. TRADES ANALYSIS (Borderless & Flat) */}
              <div className="space-y-4 pt-10 sm:pt-12 border-t border-[#1e222d]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cold-gray-400">Trades Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
                  {/* Trades Distribution Donut */}
                  <div className="flex flex-col justify-between py-1">
                    <span className="text-xs font-semibold text-white mb-3">Trades Distribution</span>
                    <div className="flex items-center justify-around gap-4 py-2">
                      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#2a2e39" strokeWidth="14" />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="#089981"
                            strokeWidth="14"
                            strokeDasharray={`${(stats.winningTrades / (stats.totalTrades || 1)) * 238.76} 238.76`}
                            strokeDashoffset="0"
                            className="transition-all duration-300"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="#f23645"
                            strokeWidth="14"
                            strokeDasharray={`${(stats.losingTrades / (stats.totalTrades || 1)) * 238.76} 238.76`}
                            strokeDashoffset={`-${(stats.winningTrades / (stats.totalTrades || 1)) * 238.76}`}
                            className="transition-all duration-300"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold tabular-nums text-white leading-none">{stats.totalTrades}</span>
                          <span className="text-[9px] text-cold-gray-400 mt-0.5 uppercase tracking-tight">Total trades</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#089981] shrink-0" />
                          <span className="text-cold-gray-400 w-16">Winners</span>
                          <span className="font-semibold text-white">{stats.winningTrades}</span>
                          <span className="text-[#089981] ml-2">({stats.winRate.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f23645] shrink-0" />
                          <span className="text-cold-gray-400 w-16">Losers</span>
                          <span className="font-semibold text-white">{stats.losingTrades}</span>
                          <span className="text-[#f23645] ml-2">({(100 - stats.winRate).toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Returns distribution / Expectancy */}
                  <div className="flex flex-col justify-between py-1">
                    <span className="text-xs font-semibold text-white mb-2">Expectancy &amp; Payoff</span>
                    <div className="space-y-2.5 text-xs tabular-nums py-1">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-cold-gray-400">Average Profit per Win</span>
                        <span className="text-[#089981] font-bold">+{stats.avgWin.toFixed(2)} {currencySymbol}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-cold-gray-400">Average Loss per Loss</span>
                        <span className="text-[#f23645] font-bold">-{stats.avgLoss.toFixed(2)} {currencySymbol}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-cold-gray-400">Win / Loss Payoff</span>
                        <span className="text-white font-bold">{stats.winLossRatio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-cold-gray-400">Average Bars Held</span>
                        <span className="text-white font-bold">{stats.avgBarsHeld.toFixed(1)} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ──────────────────────────────────────────────────
              TAB: LIST OF TRADES (Full Ledger Table)
          ────────────────────────────────────────────────── */}
          {activeTab === 'trades' && (
            <div className="space-y-3 max-w-[1440px] mx-auto">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <div className="pill-switch text-xs">
                  {(['all', 'wins', 'losses'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTradeFilter(filter)}
                      className={`pill-switch-btn capitalize ${tradeFilter === filter ? 'pill-switch-btn-active' : ''}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-token btn-secondary btn-compact text-xs flex items-center gap-1.5"
                >
                  <Download size={12} />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="tv-holdings-table w-full">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>Entry Date</th>
                      <th className="text-right">Entry Price</th>
                      <th>Exit Date</th>
                      <th className="text-right">Exit Price</th>
                      <th className="text-right">Units</th>
                      <th className="text-right">Net PnL</th>
                      <th className="text-right">Return %</th>
                      <th>Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.slice().reverse().map((t) => {
                      const isWin = t.netPnl > 0;
                      return (
                        <tr key={t.id} className="tabular-nums">
                          <td className="font-bold text-plt-text">{t.tradeNumber}</td>
                          <td>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-plt-info-soft text-plt-info border border-plt-info-border">
                              LONG
                            </span>
                          </td>
                          <td className="text-plt-subtle">{t.entryDate}</td>
                          <td className="text-right text-plt-text font-semibold">{t.entryPrice.toFixed(2)}</td>
                          <td className="text-plt-subtle">{t.exitDate}</td>
                          <td className="text-right text-plt-text font-semibold">{t.exitPrice.toFixed(2)}</td>
                          <td className="text-right text-plt-muted">{t.shares.toLocaleString()}</td>
                          <td className={`text-right font-bold ${isWin ? 'text-plt-profit' : 'text-plt-risk'}`}>
                            {isWin ? '+' : ''}{t.netPnl.toFixed(2)} {currencySymbol}
                          </td>
                          <td className="text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isWin ? 'bg-plt-profit-soft text-plt-profit border border-plt-profit-border' : 'bg-plt-risk-soft text-plt-risk border border-plt-risk-border'
                            }`}>
                              {isWin ? '+' : ''}{t.returnPct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="text-plt-muted text-[10px] truncate max-w-[160px]">
                            {t.exitReason}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────
              TAB: WALK-FORWARD OPTIMIZER
          ────────────────────────────────────────────────── */}
          {activeTab === 'optimizer' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="space-y-4 py-2">
                <div className="text-sm font-semibold text-plt-text">Walk-Forward Combinatorial Optimization</div>
                <p className="text-xs text-plt-muted leading-relaxed">
                  Evaluate up to 50,000 parameter permutations across Egyptian stock market regimes without lookahead bias.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1e222d]">
                  <div className="space-y-1">
                    <span className="kpi-title block">Model</span>
                    <div className="pill-switch text-xs">
                      <button
                        type="button"
                        onClick={() => setTrainingModel('psi8')}
                        className={`pill-switch-btn ${trainingModel === 'psi8' ? 'pill-switch-btn-active font-semibold' : ''}`}
                      >
                        PSI-8
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrainingModel('psi40')}
                        className={`pill-switch-btn ${trainingModel === 'psi40' ? 'pill-switch-btn-active font-semibold' : ''}`}
                      >
                        PSI-40
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="kpi-title block">Cutoff Preset</span>
                    <div className="pill-switch text-xs tabular-nums">
                      {(['2020', '2022', '2024', 'custom'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTrainCutoffPreset(preset)}
                          className={`pill-switch-btn ${trainCutoffPreset === preset ? 'pill-switch-btn-active' : ''}`}
                        >
                          {preset === 'custom' ? '…' : `≤${preset}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={startTraining}
                      disabled={optimizing}
                      className="btn-token btn-primary btn-compact text-xs flex items-center gap-1.5"
                    >
                      {optimizing ? (
                        <span>Evaluating ({optimProgress.toFixed(0)}%)…</span>
                      ) : (
                        <><Zap size={13} /><span>Run Walk-Forward (50k)</span></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Candidate Combinations Drawer */}
      <PsiOptimizationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        symbol={activeSymbol}
        model={trainingModel}
        trainPeriod={drawerTrainPeriod}
        testPeriod={drawerTestPeriod}
        totalEvaluated={drawerTotalEvaluated}
        candidates={drawerCandidates}
        onPreviewCombination={(params) => { if (bulkUpdateStrategyParams) bulkUpdateStrategyParams(params); }}
        onApplyCombination={(params, chosenModel) => {
          if (bulkUpdateStrategyParams) {
            bulkUpdateStrategyParams({ ...params, model: chosenModel });
            try { localStorage.setItem(`ticknal_custom_psi_${activeSymbol}`, JSON.stringify({ ...params, model: chosenModel })); } catch (e) {}
            toast.success('Strategy Updated', `Applied combination for ${activeSymbol} on ${chosenModel.toUpperCase()}.`);
          }
        }}
      />
    </div>
    </>
  );
}

// ============================================================================
// STRATEGY EQUITY RECHARTS TOOLTIP
// ============================================================================
function StrategyChartTooltip({
  active,
  payload,
  currencySymbol = 'EGP',
  initialCapital = 3000,
}: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload as EquityPoint;
    const pnl = d.equity - initialCapital;
    const pnlPct = initialCapital > 0 ? (pnl / initialCapital) * 100 : 0;
    const bnhPnl = d.buyHoldEquity - initialCapital;
    const bnhPct = initialCapital > 0 ? (bnhPnl / initialCapital) * 100 : 0;

    return (
      <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
        <div className="font-semibold text-white mb-1 border-b border-[#2a2e39] pb-1">
          {d.date}
        </div>
        <div className="flex justify-between gap-6 text-[#089981]">
          <span>Strategy:</span>
          <strong className="text-white">
            {d.equity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currencySymbol}
            <span className="ml-1.5 text-[#089981]">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
          </strong>
        </div>
        <div className="flex justify-between gap-6 text-[#2962ff]">
          <span>Buy &amp; Hold:</span>
          <strong className="text-white">
            {d.buyHoldEquity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {currencySymbol}
            <span className="ml-1.5 text-[#2962ff]">({bnhPct >= 0 ? '+' : ''}{bnhPct.toFixed(2)}%)</span>
          </strong>
        </div>
        {d.drawdown !== undefined && d.drawdown !== 0 && (
          <div className="flex justify-between gap-6 text-[#f23645]">
            <span>Drawdown:</span>
            <strong className="text-white">
              -{Math.abs(d.drawdown).toFixed(2)}%
            </strong>
          </div>
        )}
      </div>
    );
  }
  return null;
}

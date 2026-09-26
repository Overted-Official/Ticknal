'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  STRATEGIES,
  type FullBacktestReport,
} from '@/strategies/registry';
import { runPsiStrategy } from '@/strategies/PSI/psiStrategy';

import type {
  StrategyReportDrawerProps,
  StrategyReportTab,
  ComputedReportMetrics,
  BacktestPreset,
} from './types';
import StrategyReportHeader from './StrategyReportHeader';
import StrategyReportTabBar from './StrategyReportTabBar';
import PerformanceOverviewTab from './tabs/PerformanceOverviewTab';
import ListOfTradesTab from './tabs/ListOfTradesTab';

export default function StrategyReportDrawer({
  isOpen,
  onClose,
  symbol,
  timeframe = 'D',
  selectedStrategy,
  setSelectedStrategy,
  strategyParams = {},
  bulkUpdateStrategyParams,
  chartData = [],
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
  metrics,
  companyName,
  logoUrl,
  initialTab = 'performance',
}: StrategyReportDrawerProps) {
  const [activeTab, setActiveTab] = useState<StrategyReportTab>(initialTab);
  const [mounted, setMounted] = useState(false);

  // Strategy Report / Backtest State
  const [initialCapital] = useState<number>(1000);
  const [activePreset, setActivePreset] = useState<BacktestPreset>('ytd');
  const [reportLoading, setReportLoading] = useState(false);

  // Signals State
  const [signalData, setSignalData] = useState<Record<string, any> | null>(null);
  const [internalMetrics, setInternalMetrics] = useState<Record<string, string> | null>(null);

  // Full Backtest Report State
  const [report, setReport] = useState<FullBacktestReport>({
    trades: [],
    equityCurve: [],
    signals: [],
    stats: {
      initialCapital: 1000,
      finalEquity: 1000,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update activeTab when initialTab changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currencySymbol = useMemo(() => {
    if (!symbol) return 'EGP';
    const clean = symbol.toUpperCase();
    if (clean.includes('GC') || clean.includes('SI') || clean.includes('GOLD') || clean.includes('SILVER')) {
      return 'USD';
    }
    return 'EGP';
  }, [symbol]);

  // Fetch Signals
  useEffect(() => {
    if (!isOpen || !symbol) return;
    const fetchSignals = async () => {
      try {
        const params = new URLSearchParams({
          symbol,
          strategy: selectedStrategy,
          timeframe,
        });

        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.set(k, String(v));
        });

        if (strategyStartDate) params.set('start', strategyStartDate);
        if (strategyEndDate) params.set('end', strategyEndDate);

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
        console.error('Error fetching signals for drawer:', err);
      }
    };

    fetchSignals();
  }, [isOpen, symbol, strategyStartDate, strategyEndDate, selectedStrategy, strategyParams, timeframe]);

  // Fetch Strategy Report from /api/strategy-report
  useEffect(() => {
    if (!isOpen || !symbol) return;

    const controller = new AbortController();
    const fetchReport = async () => {
      setReportLoading(true);
      try {
        const params = new URLSearchParams({
          symbol,
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
        if (err?.name !== 'AbortError') console.error('Error fetching strategy report in drawer:', err);
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
    return () => controller.abort();
  }, [isOpen, symbol, selectedStrategy, timeframe, strategyStartDate, strategyEndDate, initialCapital, strategyParams]);

  // Computed signal values
  const visibleSignalData = signalData;
  const rawSignal = visibleSignalData?.signal || 'NEUTRAL';
  const isBuy = rawSignal.toUpperCase().includes('BUY');
  const isExit = rawSignal.toUpperCase().includes('SELL') || rawSignal.toUpperCase().includes('EXIT');
  const signalAction: 'BUY' | 'HOLD' | 'SELL' = isBuy ? 'BUY' : isExit ? 'SELL' : 'HOLD';
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

  const { stats, trades } = report;

  const effectiveStrategyRoiPct = stats.netProfitPct !== 0 ? stats.netProfitPct : (sysRoi ?? 0);
  const effectiveBnhRoiPct = stats.buyHoldReturnPct !== 0 ? stats.buyHoldReturnPct : bnHroi;
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

  const effectiveWinRate = stats.totalTrades > 0
    ? stats.winRate
    : (effectiveMetrics?.['Win Rate'] ? parseFloat(effectiveMetrics['Win Rate']) : 0);

  const { computedMaxMae } = useMemo(() => {
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
      } catch { /* ignore */ }
    }

    return { computedMaxMae: maxMaeStr, computedAvgMae: avgMaeStr };
  }, [effectiveMetrics, trades, chartData, strategyParams]);

  const computedMetrics: ComputedReportMetrics = {
    effectiveStrategyRoiPct,
    effectiveBnhRoiPct,
    effectiveAlphaPct,
    effectiveWinRate,
    effectiveAvgTradeReturnPct,
    effectiveAvgBars,
    effectiveMaxDd,
    computedMaxMae,
    currencySymbol,
  };

  // Risk / Reward
  const hasRR = selectedStrategy !== 'psi_v2' && selectedStrategy !== 'thoth_egx_macro' && selectedStrategy !== 'hydra'
    && triggerPrice !== null && stopLossPrice !== null && targetPrice !== null;
  const riskAmt   = hasRR ? Math.abs(triggerPrice! - stopLossPrice!) : 0;
  const rewardAmt = hasRR ? Math.abs(targetPrice!  - triggerPrice!)  : 0;
  const rrTotal   = riskAmt + rewardAmt;
  const riskBarPct = rrTotal > 0 ? (riskAmt / rrTotal) * 100 : 50;
  const rrRatio    = riskAmt > 0 ? rewardAmt / riskAmt : null;

  const handleExportCSV = useCallback(() => {
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
    link.setAttribute('download', `${symbol.replace('.CA', '')}_strategy_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [trades, symbol]);

  const handlePresetDate = (preset: BacktestPreset) => {
    setActivePreset(preset);
    if (preset === 'custom') return;

    const lastDate = chartData.length > 0
      ? (typeof chartData[chartData.length - 1].time === 'number'
          ? new Date((chartData[chartData.length - 1].time as number) * 1000).toISOString().split('T')[0]
          : String(chartData[chartData.length - 1].time))
      : new Date().toISOString().split('T')[0];
    setStrategyEndDate?.(lastDate);

    if (preset === '3m') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      setStrategyStartDate?.(d.toISOString().split('T')[0]);
    } else if (preset === '6m') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setStrategyStartDate?.(d.toISOString().split('T')[0]);
    } else if (preset === 'ytd' || (preset as string) === '2025') {
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-stretch justify-end overflow-hidden select-none font-sans">
          {/* Backdrop with smooth fade in/out */}
          <motion.div
            key="strategy-report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer z-0"
            onClick={onClose}
            aria-label="Close strategy report overlay"
          />

          {/* Drawer Sheet: slides in smoothly from the right on BOTH desktop and mobile */}
          <motion.div
            key="strategy-report-sheet"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 340,
              mass: 0.8,
            }}
            className="relative w-full md:w-[75vw] md:max-w-[1300px] h-full bg-black text-text-primary rounded-none border-l border-white/10 flex flex-col shadow-2xl z-10 overflow-hidden"
          >
            {/* 1. Sticky Header */}
            <StrategyReportHeader
              symbol={symbol}
              companyName={companyName}
              logoUrl={logoUrl}
              selectedStrategy={selectedStrategy}
              setSelectedStrategy={setSelectedStrategy}
              strategyStartDate={strategyStartDate}
              strategyEndDate={strategyEndDate}
              onSelectPresetDate={handlePresetDate}
              onSetCustomStartDate={(d) => {
                setStrategyStartDate?.(d);
                setActivePreset('custom');
              }}
              onSetCustomEndDate={(d) => {
                setStrategyEndDate?.(d);
                setActivePreset('custom');
              }}
              activePreset={activePreset}
              metrics={computedMetrics}
              hasTrades={trades.length > 0}
              onExportCSV={handleExportCSV}
              onClose={onClose}
            />

            {/* 2. Flat Tab Bar */}
            <StrategyReportTabBar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              tradesCount={trades.length}
              reportLoading={reportLoading}
            />

            {/* 3. Tab Body Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-8 bg-black">
              {activeTab === 'performance' && (
                <PerformanceOverviewTab
                  report={report}
                  metrics={computedMetrics}
                  signalAction={signalAction}
                  triggerPrice={triggerPrice}
                  reason={reason}
                  stopLossPrice={stopLossPrice}
                  targetPrice={targetPrice}
                  hasRR={hasRR}
                  rrRatio={rrRatio}
                  riskAmt={riskAmt}
                  rewardAmt={rewardAmt}
                  riskBarPct={riskBarPct}
                  masterIndex={masterIndex}
                  mdm={mdm}
                  initialCapital={initialCapital}
                />
              )}

              {activeTab === 'trades' && (
                <ListOfTradesTab
                  trades={trades}
                  currencySymbol={currencySymbol}
                  onExportCSV={handleExportCSV}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

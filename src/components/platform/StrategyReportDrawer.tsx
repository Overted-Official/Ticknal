'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from '@/components/ui/icon-library';
import { runFullStrategyBacktest } from '@/strategies/PSI/psiBacktestEngine';
import { runFullPsiV2Backtest } from '@/strategies/PSI_V2';
import {
  type StrategyTrade,
  type EquityPoint,
  type StrategyKeyStats,
  type FullBacktestReport,
} from '@/strategies/registry';
import {
  resolvePsiParams,
  type PriceBar,
  type PsiStrategyParams,
} from '@/strategies/PSI/psiStrategy';

// ============================================================================
// TICKER LOGO COMPONENT
// ============================================================================
function TickerLogo({
  symbol,
  logoUrl,
}: {
  symbol: string;
  logoUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.12] shrink-0 flex items-center justify-center overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-full bg-transparent"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-bold tabular-nums text-plt-profit font-mono">
          {symbol.replace('.CA', '').slice(0, 2)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MAIN STRATEGY REPORT DRAWER
// ============================================================================
interface StrategyReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName?: string;
  logoUrl?: string | null;
  chartData: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  activeStrategy?: string;
  customParams?: Partial<PsiStrategyParams>;
}

export default function StrategyReportDrawer({
  isOpen,
  onClose,
  symbol,
  companyName: propCompanyName,
  logoUrl: propLogoUrl,
  chartData = [],
  activeStrategy = 'psi',
  customParams,
}: StrategyReportDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'trades'>('stats');
  const [model, setModel] = useState<'psi8' | 'psi40' | 'thoth_egx_macro' | 'psi_v2'>(() => {
    if (activeStrategy === 'psi_v2') return 'psi_v2';
    if (activeStrategy === 'thoth_egx_macro') return 'thoth_egx_macro';
    return 'psi8';
  });
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);

  // Fallback ticker metadata fetching if not provided
  const [fetchedMeta, setFetchedMeta] = useState<{ companyName?: string; logoUrl?: string | null }>({});

  useEffect(() => {
    if (!propCompanyName || !propLogoUrl) {
      fetch('/api/tickers')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const found = data.find(
              (t: any) => t.symbol?.toUpperCase() === symbol?.toUpperCase()
            );
            if (found) {
              setFetchedMeta({
                companyName: found.companyName,
                logoUrl: found.logoUrl,
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [symbol, propCompanyName, propLogoUrl]);

  const resolvedCompanyName = propCompanyName || fetchedMeta.companyName || '';
  const resolvedLogoUrl = propLogoUrl || fetchedMeta.logoUrl || null;

  // Date range state
  const defaultEndDate = chartData.length > 0 ? chartData[chartData.length - 1].time : '';
  const [startDate, setStartDate] = useState<string>('2025-01-01');
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [activePreset, setActivePreset] = useState<'2025' | '1y' | 'all' | 'custom'>('2025');

  // Trade list filter
  const [tradeFilter, setTradeFilter] = useState<'all' | 'wins' | 'losses'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeStrategy === 'psi_v2') {
      setModel('psi_v2');
    } else if (activeStrategy === 'thoth_egx_macro') {
      setModel('thoth_egx_macro');
    }
  }, [activeStrategy]);

  useEffect(() => {
    if (chartData.length > 0 && !endDate) {
      setEndDate(chartData[chartData.length - 1].time);
    }
  }, [chartData, endDate]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currencySymbol = useMemo(() => {
    const clean = symbol.toUpperCase();
    if (clean.includes('GC') || clean.includes('SI') || clean.includes('GOLD') || clean.includes('SILVER')) {
      return 'USD';
    }
    return 'EGP';
  }, [symbol]);

  const handlePresetDate = (preset: '2025' | '1y' | 'all') => {
    setActivePreset(preset);
    const lastDate = chartData.length > 0 ? chartData[chartData.length - 1].time : new Date().toISOString().split('T')[0];
    setEndDate(lastDate);

    if (preset === '2025') {
      setStartDate('2025-01-01');
    } else if (preset === '1y') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      setStartDate(d.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      const firstDate = chartData.length > 0 ? chartData[0].time : '2020-01-01';
      setStartDate(firstDate);
    }
  };

  const [report, setReport] = useState<FullBacktestReport>({
    trades: [],
    equityCurve: [],
    signals: [],
    stats: {
      initialCapital,
      finalEquity: initialCapital,
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
      startDate,
      endDate,
    },
  });

  // Execute Backtest
  useEffect(() => {
    if (!isOpen || chartData.length === 0) return;

    const bars: PriceBar[] = chartData
      .map((d) => ({
        date: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))
      .filter((b) => b.open > 0 && b.high > 0 && b.low > 0 && b.close > 0);

    if (bars.length < 5) return;

    if (model === 'psi_v2') {
      try {
        const psiV2Report = runFullPsiV2Backtest(bars, {
          startDate,
          endDate,
          initialCapital,
        });
        setReport(psiV2Report);
      } catch (err) {
        console.error('Error calculating PSI V2 report:', err);
      }
      return;
    }

    if (model === 'thoth_egx_macro') {
      const params = new URLSearchParams({
        symbol,
        strategy: 'thoth_egx_macro',
        start: startDate,
      });
      if (endDate) params.set('end', endDate);

      fetch(`/api/strategy-report?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.stats) {
            setReport(data);
          }
        })
        .catch((err) => {
          console.error('Error fetching Thoth report:', err);
        });
      return;
    }

    try {
      const psiParams = resolvePsiParams(symbol, {
        startDate,
        endDate,
        initialCapital,
        model: model === 'psi40' ? 'psi40' : 'psi8',
        ...customParams,
      });
      const psiResult = runFullStrategyBacktest(bars, psiParams);
      setReport(psiResult);
    } catch (e) {
      console.error('Backtest calculation error:', e);
    }
  }, [isOpen, chartData, startDate, endDate, initialCapital, model, customParams, symbol]);

  const { stats, trades, equityCurve } = report;

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'wins') return trades.filter((t) => t.netPnl > 0);
    if (tradeFilter === 'losses') return trades.filter((t) => t.netPnl <= 0);
    return trades;
  }, [trades, tradeFilter]);

  const handleExportCSV = () => {
    if (!trades || trades.length === 0) return;
    const headers = [
      'Trade #',
      'Direction',
      'Entry Date',
      'Entry Price',
      'Exit Date',
      'Exit Price',
      'Units',
      'Position Value',
      'Net PnL',
      'Return %',
      'Bars Held',
      'Exit Reason',
    ];
    const rows = trades.map((t) => [
      t.tradeNumber,
      'LONG',
      t.entryDate,
      t.entryPrice.toFixed(2),
      t.exitDate,
      t.exitPrice.toFixed(2),
      t.shares,
      t.positionValue.toFixed(2),
      t.netPnl.toFixed(2),
      `${t.returnPct.toFixed(2)}%`,
      t.barsHeld,
      `"${t.exitReason}"`,
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
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col items-end pointer-events-auto select-none">
      {/* Dim Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Drawer Shell */}
      <div className="relative w-full max-w-5xl h-full bg-plt-base text-plt-text border-l border-plt-border-soft shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* ================================================================= */}
        {/* REFINED HEADER                                                    */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Left: Fully Circular Logo + Ticker + Company Name */}
            <div className="flex items-center gap-3 min-w-0">
              <TickerLogo symbol={symbol} logoUrl={resolvedLogoUrl} />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-plt-text tracking-tight font-mono">
                    {symbol.replace('.CA', '')}
                  </span>
                  <span className="text-[11px] text-plt-muted font-normal truncate max-w-64 font-sans">
                    {resolvedCompanyName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-plt-base text-plt-muted border border-plt-border-soft">
                    {model === 'psi_v2'
                      ? 'PSI V2'
                      : model === 'thoth_egx_macro'
                      ? 'THOTH 3.7P'
                      : model === 'psi40'
                      ? 'PSI-40 Trend'
                      : 'PSI-8 Inflection'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Consolidated Tool Controls */}
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              {/* Strategy Model Switcher */}
              <div className="pill-switch">
                <button
                  type="button"
                  onClick={() => setModel('psi8')}
                  className={`pill-switch-btn ${
                    model === 'psi8' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  PSI-8
                </button>
                <button
                  type="button"
                  onClick={() => setModel('psi40')}
                  className={`pill-switch-btn ${
                    model === 'psi40' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  PSI-40
                </button>
                <button
                  type="button"
                  onClick={() => setModel('thoth_egx_macro')}
                  className={`pill-switch-btn ${
                    model === 'thoth_egx_macro' ? 'pill-switch-btn-active font-semibold text-plt-purple' : ''
                  }`}
                >
                  THOTH 3.7P
                </button>
                <button
                  type="button"
                  onClick={() => setModel('psi_v2')}
                  className={`pill-switch-btn ${
                    model === 'psi_v2' ? 'pill-switch-btn-active font-semibold text-emerald-400' : ''
                  }`}
                >
                  PSI V2
                </button>
              </div>

              {/* Date Presets */}
              <div className="pill-switch">
                {(['2025', '1y', 'all'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetDate(preset)}
                    className={`pill-switch-btn ${
                      activePreset === preset ? 'pill-switch-btn-active font-semibold' : ''
                    }`}
                  >
                    {preset === '2025' ? '2025+' : preset === '1y' ? '1Y' : 'All'}
                  </button>
                ))}
              </div>

              {/* Date Range Inputs */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-plt-base border border-plt-border-soft text-[11px] font-mono">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="bg-transparent text-plt-text outline-none w-24"
                />
                <span className="text-plt-muted">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="bg-transparent text-plt-text outline-none w-24"
                />
              </div>

              {/* Capital Input */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-plt-base border border-plt-border-soft text-[11px] font-mono">
                <span className="text-plt-muted">$</span>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Math.max(100, Number(e.target.value) || 1000))}
                  className="bg-transparent text-plt-text outline-none w-16 text-right font-semibold"
                />
                <span className="text-plt-muted text-[10px]">{currencySymbol}</span>
              </div>

              {/* Tab Navigation Switcher */}
              <div className="pill-switch">
                <button
                  type="button"
                  onClick={() => setActiveTab('stats')}
                  className={`pill-switch-btn ${
                    activeTab === 'stats' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  Key Stats
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trades')}
                  className={`pill-switch-btn flex items-center gap-1.5 ${
                    activeTab === 'trades' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <span>Trades</span>
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-plt-card border border-plt-border-soft">
                    {trades.length}
                  </span>
                </button>
              </div>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export Trades to CSV"
                className="p-1.5 rounded-xl bg-plt-card hover:bg-plt-hover border border-plt-border-soft text-plt-muted hover:text-plt-text transition cursor-pointer"
              >
                <Download size={14} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                title="Close report (Esc)"
              >
                <X size={15} />
              </button>
            </div>

          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY CONTENT                                                      */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* =============================================================== */}
          {/* TAB 1: KEY STATS & PERFORMANCE                                  */}
          {/* =============================================================== */}
          {activeTab === 'stats' && (
            <div className="space-y-4 animate-in fade-in duration-150">

              {/* 4 Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Net PnL */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 flex flex-col justify-between shadow-panel">
                  <span className="text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
                    Total Net PnL
                  </span>
                  <div className="mt-3">
                    <div className={`text-2xl font-bold font-mono tracking-tight ${
                      stats.netProfit >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                    }`}>
                      {stats.netProfit >= 0 ? '+' : ''}
                      {stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="text-xs font-normal text-plt-muted">{currencySymbol}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                      <span className={`font-semibold ${stats.netProfitPct >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                        {stats.netProfitPct >= 0 ? '+' : ''}{stats.netProfitPct.toFixed(2)}%
                      </span>
                      <span className="text-plt-muted">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        stats.alphaMargin >= 0
                          ? 'bg-plt-profit-soft text-plt-profit border border-plt-profit-border'
                          : 'bg-plt-risk-soft text-plt-risk border border-plt-risk-border'
                      }`}>
                        {stats.alphaMargin >= 0 ? `+${stats.alphaMargin.toFixed(1)}% α` : `${stats.alphaMargin.toFixed(1)}% α`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Max Drawdown */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 flex flex-col justify-between shadow-panel">
                  <span className="text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
                    Max Drawdown
                  </span>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-plt-risk">
                      {stats.maxDrawdownAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="text-xs font-normal text-plt-muted">{currencySymbol}</span>
                    </div>
                    <div className="mt-1 text-xs font-mono text-plt-risk/90 font-medium">
                      {stats.maxDrawdown.toFixed(2)}% of peak
                    </div>
                  </div>
                </div>

                {/* 3. Profitable Trades */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 flex flex-col justify-between shadow-panel">
                  <span className="text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
                    Profitable Trades
                  </span>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-plt-text">
                      {stats.winRate.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-plt-muted">
                      <span className="text-plt-profit font-semibold">{stats.winningTrades} wins</span>
                      <span>/</span>
                      <span className="text-plt-risk font-semibold">{stats.losingTrades} losses</span>
                      <span>({stats.totalTrades} total)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Profit Factor */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 flex flex-col justify-between shadow-panel">
                  <span className="text-[11px] font-semibold text-plt-muted uppercase tracking-wider">
                    Profit Factor
                  </span>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-plt-text">
                      {stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs font-mono text-plt-muted">
                      Gross: +{stats.grossProfit.toFixed(0)} / -{stats.grossLoss.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Section: Equity Curve Chart */}
              <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-5 shadow-panel space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-plt-border-soft">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-plt-text font-sans">
                      Performance Equity Curve
                    </span>
                    <span className="text-[11px] text-plt-muted font-normal">• Mark-to-Market vs Benchmark</span>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-plt-profit" />
                      <span className="text-plt-text">
                        Strategy ({stats.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-plt-info" />
                      <span className="text-plt-muted">
                        Buy & Hold ({(initialCapital + stats.buyHoldReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol})
                      </span>
                    </div>
                  </div>
                </div>

                {/* SVG Equity Chart */}
                <EquityCurveChart
                  equityCurve={equityCurve}
                  initialCapital={initialCapital}
                  currencySymbol={currencySymbol}
                  onHoverPoint={setHoveredPoint}
                  hoveredPoint={hoveredPoint}
                />
              </div>

              {/* Detailed Breakdown (3 Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Panel 1: Trade Analytics */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 space-y-3 shadow-panel">
                  <div className="text-xs font-bold text-plt-text uppercase tracking-wider pb-2 border-b border-plt-border-soft">
                    Trade Analytics
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Total Trades:</span>
                      <span className="font-mono font-semibold text-plt-text">{stats.totalTrades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Win Rate:</span>
                      <span className="font-mono font-semibold text-plt-profit">{stats.winRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Winning / Losing:</span>
                      <span className="font-mono text-plt-subtle">{stats.winningTrades} / {stats.losingTrades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Win / Loss Payoff:</span>
                      <span className="font-mono text-plt-subtle">{stats.winLossRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Avg Duration:</span>
                      <span className="font-mono text-plt-subtle">{stats.avgBarsHeld.toFixed(1)} days</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: PnL Distribution */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 space-y-3 shadow-panel">
                  <div className="text-xs font-bold text-plt-text uppercase tracking-wider pb-2 border-b border-plt-border-soft">
                    PnL Distribution
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Gross Profit:</span>
                      <span className="font-mono font-semibold text-plt-profit">+{stats.grossProfit.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Gross Loss:</span>
                      <span className="font-mono font-semibold text-plt-risk">-{stats.grossLoss.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Avg Trade PnL:</span>
                      <span className={`font-mono font-semibold ${stats.avgTradePnl >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                        {stats.avgTradePnl >= 0 ? '+' : ''}{stats.avgTradePnl.toFixed(2)} {currencySymbol} ({stats.avgTradeReturnPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Avg Win:</span>
                      <span className="font-mono text-plt-profit">+{stats.avgWin.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Avg Loss:</span>
                      <span className="font-mono text-plt-risk">-{stats.avgLoss.toFixed(2)} {currencySymbol}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Risk & Efficiency */}
                <div className="bg-plt-card border border-plt-border-soft rounded-2xl p-4 space-y-3 shadow-panel">
                  <div className="text-xs font-bold text-plt-text uppercase tracking-wider pb-2 border-b border-plt-border-soft">
                    Risk & Streaks
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Max Drawdown:</span>
                      <span className="font-mono font-semibold text-plt-risk">{stats.maxDrawdown.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Annualized CAGR:</span>
                      <span className="font-mono font-semibold text-plt-profit">{stats.annualCagr.toFixed(2)}% / yr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Sharpe Ratio:</span>
                      <span className="font-mono text-plt-subtle">{stats.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Max Consec. Wins:</span>
                      <span className="font-mono font-semibold text-plt-profit">{stats.maxConsecutiveWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-plt-muted">Max Consec. Losses:</span>
                      <span className="font-mono font-semibold text-plt-risk">{stats.maxConsecutiveLosses}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: LIST OF TRADES                                           */}
          {/* =============================================================== */}
          {activeTab === 'trades' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">

              {/* Table Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-plt-muted text-xs font-sans">Filter Trades:</span>
                  <div className="pill-switch">
                    <button
                      type="button"
                      onClick={() => setTradeFilter('all')}
                      className={`pill-switch-btn ${
                        tradeFilter === 'all' ? 'pill-switch-btn-active font-semibold' : ''
                      }`}
                    >
                      All ({trades.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFilter('wins')}
                      className={`pill-switch-btn ${
                        tradeFilter === 'wins' ? 'pill-switch-btn-active font-semibold text-plt-profit' : ''
                      }`}
                    >
                      Wins ({stats.winningTrades})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFilter('losses')}
                      className={`pill-switch-btn ${
                        tradeFilter === 'losses' ? 'pill-switch-btn-active font-semibold text-plt-risk' : ''
                      }`}
                    >
                      Losses ({stats.losingTrades})
                    </button>
                  </div>
                </div>

                <div className="text-plt-muted text-xs font-mono">
                  Showing {filteredTrades.length} of {trades.length} closed trades
                </div>
              </div>

              {/* Trades Table */}
              <div className="bg-plt-card border border-plt-border-soft rounded-2xl overflow-hidden shadow-panel">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-plt-border-soft bg-plt-base text-plt-muted text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-4">Trade #</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Price</th>
                        <th className="py-2.5 px-4">Size</th>
                        <th className="py-2.5 px-4 text-right">Net PnL</th>
                        <th className="py-2.5 px-4 text-right">Return %</th>
                        <th className="py-2.5 px-4">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-plt-border-soft">
                      {filteredTrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-plt-muted font-sans">
                            No trades recorded matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredTrades
                          .slice()
                          .reverse()
                          .map((trade) => {
                            const isWin = trade.netPnl > 0;
                            return (
                              <React.Fragment key={trade.id}>
                                {/* Exit Row */}
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                  <td rowSpan={2} className="py-3 px-4 font-semibold align-top border-r border-plt-border-soft">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-plt-text">{trade.tradeNumber}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-plt-info-soft text-plt-info border border-plt-info-border">
                                        long
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-plt-muted font-normal mt-1 font-sans">
                                      {trade.barsHeld} days
                                    </div>
                                  </td>

                                  <td className="py-2 px-3 text-plt-risk font-semibold text-[11px]">
                                    Exit
                                  </td>
                                  <td className="py-2 px-4 text-plt-subtle">
                                    {trade.exitDate}
                                  </td>
                                  <td className="py-2 px-4 font-semibold text-plt-text">
                                    {trade.exitPrice.toFixed(2)} <span className="text-[10px] text-plt-muted font-normal">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className="py-3 px-4 align-top text-plt-subtle">
                                    <div>{trade.shares.toLocaleString()} units</div>
                                    <div className="text-[10px] text-plt-muted font-sans mt-0.5">
                                      {(trade.positionValue / 1000).toFixed(2)} K {currencySymbol}
                                    </div>
                                  </td>
                                  <td rowSpan={2} className={`py-3 px-4 font-semibold text-right align-top ${
                                    isWin ? 'text-plt-profit' : 'text-plt-risk'
                                  }`}>
                                    {isWin ? '+' : ''}
                                    {trade.netPnl.toFixed(2)} <span className="text-[10px] text-plt-muted font-normal">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className={`py-3 px-4 font-semibold text-right align-top ${
                                    isWin ? 'text-plt-profit' : 'text-plt-risk'
                                  }`}>
                                    <span className={`px-2 py-1 rounded-md text-[11px] inline-block font-mono font-semibold ${
                                      isWin ? 'bg-plt-profit-soft text-plt-profit border border-plt-profit-border' : 'bg-plt-risk-soft text-plt-risk border border-plt-risk-border'
                                    }`}>
                                      {isWin ? '+' : ''}
                                      {trade.returnPct.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td rowSpan={2} className="py-3 px-4 align-top">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-white/[0.04] text-plt-subtle border border-white/[0.08] whitespace-nowrap">
                                      {trade.exitReason}
                                    </span>
                                  </td>
                                </tr>

                                {/* Entry Row */}
                                <tr className="hover:bg-white/[0.02] transition-colors border-b border-plt-border-soft">
                                  <td className="py-2 px-3 text-plt-profit font-semibold text-[11px]">
                                    Entry
                                  </td>
                                  <td className="py-2 px-4 text-plt-subtle">
                                    {trade.entryDate}
                                  </td>
                                  <td className="py-2 px-4 text-plt-subtle">
                                    {trade.entryPrice.toFixed(2)} <span className="text-[10px] text-plt-muted font-normal">{currencySymbol}</span>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ================================================================= */}
        {/* FOOTER NOTE                                                       */}
        {/* ================================================================= */}
        <div className="px-5 py-3 border-t border-plt-border-soft bg-plt-card text-xs text-plt-muted flex items-center justify-between shrink-0">
          <span className="text-[11px]">
            Simulated using exact point-in-time quantitative execution without lookahead bias.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-plt-text font-medium transition text-xs shrink-0 border border-white/[0.1] cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// EQUITY CURVE CHART COMPONENT (High-Fidelity Interactive SVG)
// ============================================================================
interface EquityCurveChartProps {
  equityCurve: EquityPoint[];
  initialCapital: number;
  currencySymbol: string;
  onHoverPoint: (pt: EquityPoint | null) => void;
  hoveredPoint: EquityPoint | null;
}

function EquityCurveChart({
  equityCurve,
  initialCapital,
  currencySymbol,
  onHoverPoint,
  hoveredPoint,
}: EquityCurveChartProps) {
  if (!equityCurve || equityCurve.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-plt-muted text-xs font-sans">
        Not enough historical data in selected period to render equity curve.
      </div>
    );
  }

  const width = 900;
  const height = 240;
  const padding = { top: 20, right: 75, bottom: 30, left: 15 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min and max for Y-axis
  const allEquities = equityCurve.flatMap((p) => [p.equity, p.buyHoldEquity]);
  const minEquity = Math.min(...allEquities, initialCapital) * 0.95;
  const maxEquity = Math.max(...allEquities, initialCapital) * 1.05;
  const equityRange = maxEquity - minEquity || 1;

  // Coordinate mapping
  const getX = (index: number) => padding.left + (index / (equityCurve.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - minEquity) / equityRange) * chartHeight;

  // Path generators
  const strategyPath = equityCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.equity).toFixed(1)}`)
    .join(' ');

  const buyHoldPath = equityCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.buyHoldEquity).toFixed(1)}`)
    .join(' ');

  const initialCapitalY = getY(initialCapital);

  // Sample Date X-ticks
  const tickStep = Math.max(1, Math.floor(equityCurve.length / 6));
  const xTicks = [];
  for (let i = 0; i < equityCurve.length; i += tickStep) {
    xTicks.push({ index: i, date: equityCurve[i].date });
  }

  // Y-axis tick values
  const yTicks = [
    maxEquity,
    minEquity + equityRange * 0.75,
    minEquity + equityRange * 0.5,
    minEquity + equityRange * 0.25,
    minEquity,
  ];

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none font-mono"
        onMouseLeave={() => onHoverPoint(null)}
      >
        <defs>
          <linearGradient id="strategyFillClean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--plt-profit)" stopOpacity="0.25" />
            <stop offset="80%" stopColor="var(--plt-profit)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--plt-profit)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="var(--palette-chart-grid)"
                strokeWidth={1}
              />
              <text
                x={padding.left + chartWidth + 8}
                y={y + 3.5}
                fill="var(--plt-text-faint)"
                fontSize={10}
                textAnchor="start"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toFixed(0)} {currencySymbol}
              </text>
            </g>
          );
        })}

        {/* Initial Capital Reference Baseline */}
        <line
          x1={padding.left}
          y1={initialCapitalY}
          x2={padding.left + chartWidth}
          y2={initialCapitalY}
          stroke="var(--plt-border-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Area under Strategy curve */}
        <path
          d={`${strategyPath} L ${getX(equityCurve.length - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`}
          fill="url(#strategyFillClean)"
        />

        {/* Buy & Hold Benchmark line */}
        <path
          d={buyHoldPath}
          fill="none"
          stroke="var(--plt-info)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.8}
        />

        {/* Strategy Main Equity line */}
        <path
          d={strategyPath}
          fill="none"
          stroke="var(--plt-profit)"
          strokeWidth={2}
        />

        {/* X-axis Date Ticks */}
        {xTicks.map((tick) => {
          const x = getX(tick.index);
          return (
            <text
              key={tick.index}
              x={x}
              y={padding.top + chartHeight + 18}
              fill="var(--plt-text-faint)"
              fontSize={10}
              textAnchor="middle"
            >
              {tick.date}
            </text>
          );
        })}

        {/* Interactive Hover Vertical Crosshair */}
        {hoveredPoint && (
          <g>
            {(() => {
              const idx = equityCurve.findIndex((p) => p.date === hoveredPoint.date);
              if (idx === -1) return null;
              const hX = getX(idx);
              const hStratY = getY(hoveredPoint.equity);

              return (
                <>
                  <line
                    x1={hX}
                    y1={padding.top}
                    x2={hX}
                    y2={padding.top + chartHeight}
                    stroke="var(--plt-accent)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <circle cx={hX} cy={hStratY} r={4} fill="var(--plt-accent)" stroke="var(--core-white)" strokeWidth={1.5} />
                </>
              );
            })()}
          </g>
        )}

        {/* Transparent overlay for mouse interaction */}
        {equityCurve.map((pt, i) => {
          const x = getX(i);
          const sliceWidth = chartWidth / equityCurve.length;
          return (
            <rect
              key={pt.date}
              x={x - sliceWidth / 2}
              y={padding.top}
              width={sliceWidth}
              height={chartHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => onHoverPoint(pt)}
            />
          );
        })}
      </svg>
    </div>
  );
}

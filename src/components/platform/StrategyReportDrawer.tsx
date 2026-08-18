"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BarChart3,
  ListFilter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Activity,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  runFullStrategyBacktest,
  type StrategyTrade,
  type EquityPoint,
  type StrategyKeyStats,
  type FullBacktestReport,
} from "@/strategies/PSI/psiBacktestEngine";
import {
  resolvePsiParams,
  type PriceBar,
  type PsiStrategyParams,
} from "@/strategies/PSI/psiStrategy";

interface StrategyReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  chartData: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  customParams?: Partial<PsiStrategyParams>;
}

export default function StrategyReportDrawer({
  isOpen,
  onClose,
  symbol,
  chartData = [],
  customParams,
}: StrategyReportDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "trades">("stats");
  const [model, setModel] = useState<"psi8" | "psi40">("psi8");
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);

  // Date range state (default to 2025-01-01 OOS)
  const defaultStartDate = "2025-01-01";
  const defaultEndDate = chartData.length > 0 ? chartData[chartData.length - 1].time : "";
  const [startDate, setStartDate] = useState<string>("2025-01-01");
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [activePreset, setActivePreset] = useState<"2025" | "1y" | "all" | "custom">("2025");

  // Trade list filter
  const [tradeFilter, setTradeFilter] = useState<"all" | "wins" | "losses">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update date ranges if chart data changes
  useEffect(() => {
    if (chartData.length > 0) {
      if (!endDate) setEndDate(chartData[chartData.length - 1].time);
    }
  }, [chartData]);

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

  const currencySymbol = useMemo(() => {
    const clean = symbol.toUpperCase();
    if (clean.includes("GC") || clean.includes("SI") || clean.includes("GOLD") || clean.includes("SILVER")) {
      return "USD";
    }
    return "EGP";
  }, [symbol]);

  // Preset Date Handlers
  const handlePresetDate = (preset: "2025" | "1y" | "all") => {
    setActivePreset(preset);
    const lastDate = chartData.length > 0 ? chartData[chartData.length - 1].time : new Date().toISOString().split("T")[0];
    setEndDate(lastDate);

    if (preset === "2025") {
      setStartDate("2025-01-01");
    } else if (preset === "1y") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      setStartDate(d.toISOString().split("T")[0]);
    } else if (preset === "all") {
      const firstDate = chartData.length > 0 ? chartData[0].time : "2020-01-01";
      setStartDate(firstDate);
    }
  };

  // Run backtest calculation
  const report: FullBacktestReport = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
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
      };
    }

    const priceBars: PriceBar[] = chartData.map((d) => ({
      date: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    const resolvedParams = resolvePsiParams(symbol, {
      model,
      initialCapital,
      startDate,
      endDate: endDate || undefined,
      ...(customParams || {}),
    });

    return runFullStrategyBacktest(priceBars, resolvedParams);
  }, [chartData, symbol, model, initialCapital, startDate, endDate, customParams]);

  const { stats, trades, equityCurve } = report;

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    if (tradeFilter === "wins") return trades.filter((t) => t.netPnl > 0);
    if (tradeFilter === "losses") return trades.filter((t) => t.netPnl <= 0);
    return trades;
  }, [trades, tradeFilter]);

  // Export trades to CSV
  const handleExportCSV = () => {
    if (trades.length === 0) return;
    const headers = [
      "Trade #",
      "Type",
      "Entry Date",
      "Entry Price",
      "Exit Date",
      "Exit Price",
      "Shares",
      "Position Capital",
      "Net PnL",
      "Return %",
      "Exit Reason",
      "Bars Held",
      "Cumulative Equity",
    ];

    const rows = trades.map((t) => [
      t.tradeNumber,
      t.type.toUpperCase(),
      t.entryDate,
      t.entryPrice.toFixed(2),
      t.exitDate,
      t.exitPrice.toFixed(2),
      t.shares,
      t.positionValue.toFixed(2),
      t.netPnl.toFixed(2),
      `${t.returnPct.toFixed(2)}%`,
      `"${t.exitReason}"`,
      t.barsHeld,
      t.cumulativeEquity.toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${symbol.replace(".CA", "")}_Strategy_Trades_${model}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end pointer-events-auto select-none">
      {/* Dark Ambient Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Spacious Slide-Over Modal Drawer */}
      <div className="relative z-10 w-full sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-full bg-[#090A0E] border-l border-white/[0.08] text-zinc-100 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* ================================================================= */}
        {/* TOP BAR & HEADER                                                  */}
        {/* ================================================================= */}
        <div className="px-6 py-5 border-b border-white/[0.07] bg-[#0C0D12] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Title & Architecture */}
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-plt-orange/20 to-plt-orange/5 border border-plt-orange/30 text-plt-orange shadow-inner">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                    {symbol.replace(".CA", "")}
                  </h2>
                  <span className="text-xs font-semibold text-white/50">&bull;</span>
                  <span className="text-sm font-semibold text-white/90">
                    Strategy Performance Report
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white/[0.05] text-white/70 border border-white/[0.08]">
                    {model === "psi40" ? "PSI-40 Trend" : "PSI-8 Inflection"}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5 font-sans">
                  TradingView Quantitative Simulation &bull; Zero Lookahead Bias
                </p>
              </div>
            </div>

            {/* Model Toggle & Controls */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {/* Architecture Model Switcher */}
              <div className="flex bg-zinc-900/80 border border-white/[0.08] p-1 rounded-xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setModel("psi8")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    model === "psi8"
                      ? "bg-zinc-800 text-white shadow-sm font-semibold border border-white/[0.12]"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  PSI-8 Inflection
                </button>
                <button
                  type="button"
                  onClick={() => setModel("psi40")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    model === "psi40"
                      ? "bg-zinc-800 text-white shadow-sm font-semibold border border-white/[0.12]"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  PSI-40 Trend
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export Trades to CSV"
                className="px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/80 hover:bg-zinc-800 text-white/70 hover:text-white text-xs font-medium flex items-center gap-1.5 transition active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 text-white/60" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/40 hover:text-white hover:bg-white/[0.08] rounded-xl transition"
                title="Close report (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* UNIFIED CONTROLS TOOLBAR (Date Presets, Capital & Tabs)         */}
          {/* =============================================================== */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-4 pt-3.5 border-t border-white/[0.06]">
            
            {/* Left: Date Presets & Custom Inputs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center bg-zinc-900/80 border border-white/[0.08] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handlePresetDate("2025")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    activePreset === "2025"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  2025+ (OOS)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate("1y")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    activePreset === "1y"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  1 Year
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate("all")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    activePreset === "all"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  All
                </button>
              </div>

              {/* Range Inputs */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-white/[0.08] text-[11px]">
                <span className="text-white/35 font-mono">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="bg-transparent text-white/90 font-mono text-[11px] outline-none w-24"
                />
                <span className="text-white/35 font-mono">&rarr;</span>
                <span className="text-white/35 font-mono">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="bg-transparent text-white/90 font-mono text-[11px] outline-none w-24"
                />
              </div>

              {/* Capital Input */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-white/[0.08] text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-white/35 font-mono">Capital:</span>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Math.max(100, Number(e.target.value) || 1000))}
                  className="bg-transparent text-white font-mono text-[11px] outline-none w-16 text-right font-medium"
                />
                <span className="text-white/50 font-mono text-[10px]">{currencySymbol}</span>
              </div>
            </div>

            {/* Right: Tab Navigation Switcher */}
            <div className="flex items-center bg-zinc-900/80 border border-white/[0.08] p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("stats")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === "stats"
                    ? "bg-white/[0.10] text-white shadow-sm border border-white/[0.12]"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-plt-orange" />
                <span>Overview & Key Stats</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("trades")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === "trades"
                    ? "bg-white/[0.10] text-white shadow-sm border border-white/[0.12]"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5 text-plt-orange" />
                <span>List of Trades</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/[0.10] text-white/80">
                  {trades.length}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY CONTENT                                                      */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* =============================================================== */}
          {/* TAB 1: KEY STATS & PERFORMANCE                                  */}
          {/* =============================================================== */}
          {activeTab === "stats" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* 4 Top KPI Cards (TradingView Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Net PnL */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#13151D] to-[#0E1017] border border-white/[0.08] shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                    <span>Total Net PnL</span>
                    <TrendingUp className={`w-3.5 h-3.5 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
                  </div>
                  <div className="mt-3">
                    <div className={`text-2xl font-bold font-mono tracking-tight ${
                      stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {stats.netProfit >= 0 ? "+" : ""}
                      {stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-white/50">{currencySymbol}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-mono">
                      <span className={`font-semibold ${stats.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {stats.netProfitPct >= 0 ? "+" : ""}{stats.netProfitPct.toFixed(2)}%
                      </span>
                      <span className="text-white/20">&bull;</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        stats.alphaMargin >= 0 ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}>
                        {stats.alphaMargin >= 0 ? `+${stats.alphaMargin.toFixed(1)}% α` : `${stats.alphaMargin.toFixed(1)}% α`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Max Drawdown */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#13151D] to-[#0E1017] border border-white/[0.08] shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                    <span>Max Drawdown</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
                      {stats.maxDrawdownAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-white/50">{currencySymbol}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-rose-400/90 font-semibold">
                      <span>{stats.maxDrawdown.toFixed(2)}% of peak capital</span>
                    </div>
                  </div>
                </div>

                {/* 3. Profitable Trades */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#13151D] to-[#0E1017] border border-white/[0.08] shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                    <span>Profitable Trades</span>
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {stats.winRate.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-white/60">
                      <span className="text-emerald-400 font-semibold">{stats.winningTrades} wins</span>
                      <span>/</span>
                      <span className="text-rose-400 font-semibold">{stats.losingTrades} losses</span>
                      <span>({stats.totalTrades} total)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Profit Factor */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#13151D] to-[#0E1017] border border-white/[0.08] shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                    <span>Profit Factor</span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 text-xs font-mono text-white/50">
                      <span>Gross: +{stats.grossProfit.toFixed(0)} / -{stats.grossLoss.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Section: Equity Curve Chart */}
              <div className="p-5 rounded-2xl bg-[#0E1017] border border-white/[0.08] shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Performance Equity Curve</span>
                      <span className="text-xs font-normal text-white/40">&bull; Cumulative Mark-to-Market vs Benchmark</span>
                    </h3>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <span className="text-white font-mono">Strategy ({stats.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded-full bg-blue-400" />
                      <span className="text-white/60 font-mono">Buy & Hold ({(initialCapital + stats.buyHoldReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol})</span>
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

              {/* Deep-Dive Performance Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Panel 1: Trade Performance */}
                <div className="p-4 rounded-2xl bg-[#0E1017] border border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                    <TrendingUp className="w-4 h-4 text-plt-orange" /> Trade Analytics
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Total Trades:</span>
                      <span className="font-mono font-bold text-white">{stats.totalTrades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Win Rate:</span>
                      <span className="font-mono font-bold text-emerald-400">{stats.winRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Winning / Losing:</span>
                      <span className="font-mono text-white/80">{stats.winningTrades} / {stats.losingTrades}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Win / Loss Payoff:</span>
                      <span className="font-mono text-white/80">{stats.winLossRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Avg Duration:</span>
                      <span className="font-mono text-white/80">{stats.avgBarsHeld.toFixed(1)} days</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: PnL & Return Breakdown */}
                <div className="p-4 rounded-2xl bg-[#0E1017] border border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> PnL Distribution
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Gross Profit:</span>
                      <span className="font-mono font-bold text-emerald-400">+{stats.grossProfit.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Gross Loss:</span>
                      <span className="font-mono font-bold text-rose-400">-{stats.grossLoss.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Avg Trade PnL:</span>
                      <span className={`font-mono font-bold ${stats.avgTradePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.avgTradePnl >= 0 ? '+' : ''}{stats.avgTradePnl.toFixed(2)} {currencySymbol} ({stats.avgTradeReturnPct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Avg Winning Trade:</span>
                      <span className="font-mono text-emerald-400">+{stats.avgWin.toFixed(2)} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Avg Losing Trade:</span>
                      <span className="font-mono text-rose-400">-{stats.avgLoss.toFixed(2)} {currencySymbol}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Risk & Efficiency */}
                <div className="p-4 rounded-2xl bg-[#0E1017] border border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                    <Award className="w-4 h-4 text-amber-400" /> Risk & Streaks
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Max Drawdown:</span>
                      <span className="font-mono font-bold text-rose-400">{stats.maxDrawdown.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Annualized CAGR:</span>
                      <span className="font-mono font-bold text-emerald-400">{stats.annualCagr.toFixed(2)}% / yr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Sharpe Ratio:</span>
                      <span className="font-mono text-white/80">{stats.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Max Consec. Wins:</span>
                      <span className="font-mono text-emerald-400 font-bold">{stats.maxConsecutiveWins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/45">Max Consec. Losses:</span>
                      <span className="font-mono text-rose-400 font-bold">{stats.maxConsecutiveLosses}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: LIST OF TRADES (TradingView Style Ledger)                */}
          {/* =============================================================== */}
          {activeTab === "trades" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white/45">Filter Trades:</span>
                  <div className="flex bg-zinc-900/80 border border-white/[0.08] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTradeFilter("all")}
                      className={`px-3 py-1 rounded-md transition ${
                        tradeFilter === "all"
                          ? "bg-zinc-800 text-white font-semibold"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      All ({trades.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFilter("wins")}
                      className={`px-3 py-1 rounded-md transition ${
                        tradeFilter === "wins"
                          ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                          : "text-white/40 hover:text-emerald-400"
                      }`}
                    >
                      Wins ({stats.winningTrades})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFilter("losses")}
                      className={`px-3 py-1 rounded-md transition ${
                        tradeFilter === "losses"
                          ? "bg-rose-500/20 text-rose-400 font-semibold"
                          : "text-white/40 hover:text-rose-400"
                      }`}
                    >
                      Losses ({stats.losingTrades})
                    </button>
                  </div>
                </div>

                <div className="text-white/40 text-xs font-mono">
                  Showing {filteredTrades.length} of {trades.length} closed trades
                </div>
              </div>

              {/* Trades Table */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E1017] shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-zinc-900/60 text-white/50 text-[10px] uppercase font-mono tracking-wider">
                        <th className="py-3.5 px-4">Trade #</th>
                        <th className="py-3.5 px-3">Type</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4">Size</th>
                        <th className="py-3.5 px-4 text-right">Net PnL</th>
                        <th className="py-3.5 px-4 text-right">Return %</th>
                        <th className="py-3.5 px-4">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredTrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-white/40">
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
                                  <td rowSpan={2} className="py-3.5 px-4 font-mono font-bold align-top pt-3.5 border-r border-white/[0.04]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white/90 font-bold">{trade.tradeNumber}</span>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                                        long
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-white/40 font-normal mt-1.5 font-sans">
                                      {trade.barsHeld} days held
                                    </div>
                                  </td>
                                  
                                  {/* Exit info */}
                                  <td className="py-2 px-3 text-rose-400 font-semibold text-[11px]">
                                    Exit
                                  </td>
                                  <td className="py-2 px-4 font-mono text-white/80">
                                    {trade.exitDate}
                                  </td>
                                  <td className="py-2 px-4 font-mono font-bold text-white">
                                    {trade.exitPrice.toFixed(2)} <span className="text-[10px] font-normal text-white/40">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className="py-3.5 px-4 font-mono align-top pt-3.5 text-white/80">
                                    <div>{trade.shares.toLocaleString()} units</div>
                                    <div className="text-[10px] text-white/40 font-sans mt-0.5">
                                      {(trade.positionValue / 1000).toFixed(2)} K {currencySymbol}
                                    </div>
                                  </td>
                                  <td rowSpan={2} className={`py-3.5 px-4 font-mono font-bold text-right text-sm align-top pt-3.5 ${
                                    isWin ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    {isWin ? "+" : ""}
                                    {trade.netPnl.toFixed(2)} <span className="text-[10px] font-normal text-white/40">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className={`py-3.5 px-4 font-mono font-bold text-right align-top pt-3.5 ${
                                    isWin ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    <span className={`px-2.5 py-1 rounded-md text-xs inline-block font-semibold ${
                                      isWin ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    }`}>
                                      {isWin ? "+" : ""}
                                      {trade.returnPct.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td rowSpan={2} className="py-3.5 px-4 align-top pt-3.5">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/[0.05] text-white/70 border border-white/[0.08] whitespace-nowrap">
                                      {trade.exitReason}
                                    </span>
                                  </td>
                                </tr>

                                {/* Entry Row */}
                                <tr className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.06]">
                                  <td className="py-2 px-3 text-emerald-400 font-semibold text-[11px]">
                                    Entry
                                  </td>
                                  <td className="py-2 px-4 font-mono text-white/60">
                                    {trade.entryDate}
                                  </td>
                                  <td className="py-2 px-4 font-mono text-white/70">
                                    {trade.entryPrice.toFixed(2)} <span className="text-[10px] font-normal text-white/40">{currencySymbol}</span>
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
        <div className="px-6 py-4 border-t border-white/[0.07] bg-[#0C0D12] text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-plt-orange shrink-0" />
            <span className="text-xs">
              Simulated using exact point-in-time quantitative execution without lookahead bias.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition text-xs shrink-0 shadow-sm"
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
      <div className="h-72 flex items-center justify-center text-white/40 text-xs">
        Not enough historical data in selected period to render equity curve.
      </div>
    );
  }

  const width = 900;
  const height = 300;
  const padding = { top: 25, right: 80, bottom: 45, left: 20 };

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
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(pt.equity).toFixed(1)}`)
    .join(" ");

  const buyHoldPath = equityCurve
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(pt.buyHoldEquity).toFixed(1)}`)
    .join(" ");

  // Zero/Initial Capital reference line
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
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => onHoverPoint(null)}
      >
        <defs>
          {/* Strategy Line Gradient */}
          <linearGradient id="strategyFillModern" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#10B981" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
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
                stroke="rgba(255, 255, 255, 0.04)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left + chartWidth + 10}
                y={y + 3}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="500"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toFixed(0)} {currencySymbol}
              </text>
            </g>
          );
        })}

        {/* Initial Capital Reference Line */}
        <line
          x1={padding.left}
          y1={initialCapitalY}
          x2={padding.left + chartWidth}
          y2={initialCapitalY}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Buy & Hold Benchmark Curve (Blue) */}
        <path
          d={buyHoldPath}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeOpacity="0.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Strategy Equity Area Fill */}
        <path
          d={`${strategyPath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
          fill="url(#strategyFillModern)"
        />

        {/* Strategy Equity Line (Green/Emerald) */}
        <path
          d={strategyPath}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        />

        {/* Trade Markers on the Strategy Curve */}
        {equityCurve.map((pt, i) => {
          if (pt.tradePnl === undefined) return null;
          const isWin = pt.tradePnl > 0;
          return (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(pt.equity)}
              r={4}
              fill={isWin ? "#10B981" : "#EF4444"}
              stroke="#090A0E"
              strokeWidth="2"
              className="drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]"
            />
          );
        })}

        {/* X-Axis Date Ticks */}
        {xTicks.map((tick, idx) => {
          const x = getX(tick.index);
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={padding.top + chartHeight}
                x2={x}
                y2={padding.top + chartHeight + 5}
                stroke="rgba(255, 255, 255, 0.12)"
              />
              <text
                x={x}
                y={padding.top + chartHeight + 18}
                fill="rgba(255, 255, 255, 0.45)"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {tick.date}
              </text>
            </g>
          );
        })}

        {/* Hover Crosshair Overlay */}
        {equityCurve.map((pt, i) => {
          const x = getX(i);
          return (
            <rect
              key={i}
              x={x - chartWidth / (equityCurve.length * 2)}
              y={padding.top}
              width={chartWidth / equityCurve.length}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => onHoverPoint(pt)}
              className="cursor-crosshair"
            />
          );
        })}

        {/* Hover Marker Point */}
        {hoveredPoint && (
          <g>
            {(() => {
              const idx = equityCurve.findIndex((p) => p.date === hoveredPoint.date);
              if (idx === -1) return null;
              const hX = getX(idx);
              const hY = getY(hoveredPoint.equity);
              return (
                <>
                  <line
                    x1={hX}
                    y1={padding.top}
                    x2={hX}
                    y2={padding.top + chartHeight}
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={hX}
                    cy={hY}
                    r={6}
                    fill="#10B981"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]"
                  />
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div className="absolute top-3 left-4 p-3 rounded-xl bg-black/90 border border-white/[0.15] backdrop-blur-md shadow-2xl text-xs space-y-1.5 font-mono pointer-events-none z-20 min-w-[220px]">
          <div className="text-[11px] text-white/50 font-bold border-b border-white/[0.08] pb-1 flex items-center justify-between">
            <span>Date:</span>
            <span className="text-white">{hoveredPoint.date}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
            <span>Strategy:</span>
            <span>{hoveredPoint.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-blue-400 font-medium">
            <span>Buy & Hold:</span>
            <span>{hoveredPoint.buyHoldEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
          </div>
          {hoveredPoint.drawdown > 0 && (
            <div className="flex items-center justify-between gap-4 text-rose-400 text-[11px]">
              <span>Drawdown:</span>
              <span>-{hoveredPoint.drawdown.toFixed(2)}%</span>
            </div>
          )}
          {hoveredPoint.tradePnl !== undefined && (
            <div className={`flex items-center justify-between gap-4 text-[11px] pt-1 border-t border-white/[0.08] font-bold ${
              hoveredPoint.tradePnl > 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              <span>Trade Realized:</span>
              <span>{hoveredPoint.tradePnl > 0 ? "+" : ""}{hoveredPoint.tradePnl.toFixed(2)} {currencySymbol} ({hoveredPoint.tradeReturnPct?.toFixed(2)}%)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

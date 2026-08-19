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
  ShieldAlert,
  Percent,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  runFullStrategyBacktest,
} from "@/strategies/PSI/psiBacktestEngine";
import {
  type StrategyTrade,
  type EquityPoint,
  type StrategyKeyStats,
  type FullBacktestReport,
} from "@/strategies/registry";
import {
  resolvePsiParams,
  type PriceBar,
  type PsiStrategyParams,
} from "@/strategies/PSI/psiStrategy";

// ============================================================================
// TICKER LOGO COMPONENT
// ============================================================================
function TickerLogo({
  symbol,
  logoUrl,
  size = "md",
}: {
  symbol: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses =
    size === "lg"
      ? "w-10 h-10 rounded-lg"
      : size === "md"
      ? "w-8 h-8 rounded-md"
      : "w-6 h-6 rounded-md";

  return (
    <div
      className={`${sizeClasses} bg-white/[0.04] border border-white/[0.09] p-0.5 shrink-0 flex items-center justify-center overflow-hidden`}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-contain rounded-[3px] bg-transparent"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[11px] font-bold font-mono text-plt-orange uppercase">
          {symbol.slice(0, 2)}
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
  activeStrategy = "psi",
  customParams,
}: StrategyReportDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "trades">("stats");
  const [model, setModel] = useState<"psi8" | "psi40" | "thoth_egx_macro">(() => {
    return activeStrategy === "thoth_egx_macro" ? "thoth_egx_macro" : "psi8";
  });
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [hoveredPoint, setHoveredPoint] = useState<EquityPoint | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fallback ticker metadata fetching if not provided
  const [fetchedMeta, setFetchedMeta] = useState<{ companyName?: string; logoUrl?: string | null }>({});

  useEffect(() => {
    if (!propCompanyName || !propLogoUrl) {
      fetch("/api/tickers")
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

  const resolvedCompanyName = propCompanyName || fetchedMeta.companyName || "";
  const resolvedLogoUrl = propLogoUrl || fetchedMeta.logoUrl || null;

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

  useEffect(() => {
    if (activeStrategy === "thoth_egx_macro") {
      setModel("thoth_egx_macro");
    }
  }, [activeStrategy]);

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

  useEffect(() => {
    if (!isOpen || !chartData || chartData.length === 0) return;
    let isActive = true;

    async function computeReport() {
      setIsCalculating(true);
      try {
        const priceBars: PriceBar[] = chartData.map((d) => ({
          date: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));

        let res: FullBacktestReport;
        if (model === "thoth_egx_macro") {
          const params = new URLSearchParams({
            symbol,
            strategy: "thoth_egx_macro",
            start: startDate,
            initialCapital: String(initialCapital),
          });
          if (endDate) params.set("end", endDate);
          if (customParams) {
            Object.entries(customParams).forEach(([k, v]) => {
              if (v !== undefined && v !== null) params.set(k, String(v));
            });
          }
          const response = await fetch(`/api/strategy-report?${params.toString()}`);
          if (!response.ok) throw new Error("Failed to fetch Thoth strategy report");
          res = await response.json();
        } else {
          const resolvedParams = resolvePsiParams(symbol, {
            model,
            initialCapital,
            startDate,
            endDate: endDate || undefined,
            ...(customParams || {}),
          });
          res = runFullStrategyBacktest(priceBars, resolvedParams);
        }

        if (isActive) {
          setReport(res);
        }
      } catch (err) {
        console.error("Error computing strategy report:", err);
      } finally {
        if (isActive) setIsCalculating(false);
      }
    }

    void computeReport();
    return () => {
      isActive = false;
    };
  }, [isOpen, chartData, symbol, model, initialCapital, startDate, endDate, customParams]);

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
      <div className="relative z-10 w-full sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-full bg-black border-l border-white/[0.09] text-zinc-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* ================================================================= */}
        {/* COMPACT STREAMLINED HEADER (All settings on right of ticker)      */}
        {/* ================================================================= */}
        <div className="px-4 py-2.5 border-b border-white/[0.09] bg-black shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            
            {/* Left: Logo + Eyebrow Title + Ticker & Full Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <TickerLogo symbol={symbol} logoUrl={resolvedLogoUrl} size="lg" />
              
              <div className="flex flex-col min-w-0">
                {/* 1) Small title above the ticker name */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-plt-orange">
                    Strategy Performance Report
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                      model === "thoth_egx_macro"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/25"
                        : "bg-white/[0.05] text-white/70 border border-white/[0.08]"
                    }`}
                  >
                    {model === "thoth_egx_macro"
                      ? "Thoth Macro (AI)"
                      : model === "psi40"
                      ? "PSI-40 Trend"
                      : "PSI-8 Inflection"}
                  </span>
                </div>

                {/* 2) Ticker Symbol and Full Name */}
                <div className="flex items-baseline gap-2 mt-0.5 truncate">
                  <h2 className="text-lg font-bold tracking-tight text-white font-mono shrink-0">
                    {symbol.replace(".CA", "")}
                  </h2>
                  {resolvedCompanyName && (
                    <span className="text-xs text-white/40 truncate font-normal">
                      {resolvedCompanyName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: All Settings, Inputs, Tabs & Actions */}
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              
              {/* Architecture Model Switcher */}
              <div className="flex bg-white/[0.03] border border-white/[0.09] p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setModel("psi8")}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                    model === "psi8"
                      ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  PSI-8
                </button>
                <button
                  type="button"
                  onClick={() => setModel("psi40")}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                    model === "psi40"
                      ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  PSI-40
                </button>
                <button
                  type="button"
                  onClick={() => setModel("thoth_egx_macro")}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${
                    model === "thoth_egx_macro"
                      ? "bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Thoth (AI)
                </button>
              </div>

              {/* Date Presets */}
              <div className="flex items-center bg-white/[0.03] border border-white/[0.09] rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => handlePresetDate("2025")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activePreset === "2025"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  2025+
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate("1y")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activePreset === "1y"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  1Y
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate("all")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    activePreset === "all"
                      ? "bg-plt-orange text-white font-semibold shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  All
                </button>
              </div>

              {/* Compact Date Range Inputs */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.09] text-[11px]">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="bg-transparent text-white/90 font-mono text-[10px] outline-none w-20"
                />
                <span className="text-white/30 font-mono">&rarr;</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="bg-transparent text-white/90 font-mono text-[10px] outline-none w-20"
                />
              </div>

              {/* Compact Capital Input */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.09] text-[11px]">
                <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Math.max(100, Number(e.target.value) || 1000))}
                  className="bg-transparent text-white font-mono text-[10px] outline-none w-14 text-right font-medium"
                />
                <span className="text-white/40 font-mono text-[9px]">{currencySymbol}</span>
              </div>

              {/* Tab Navigation Switcher */}
              <div className="flex items-center bg-white/[0.03] border border-white/[0.09] p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setActiveTab("stats")}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "stats"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3 h-3 text-plt-orange" />
                  <span>Key stats</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("trades")}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === "trades"
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <ListFilter className="w-3 h-3 text-plt-orange" />
                  <span>Trades</span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-white/[0.10] text-white/80">
                    {trades.length}
                  </span>
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export Trades to CSV"
                className="p-1.5 rounded-md border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.08] rounded-md transition"
                title="Close report (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY CONTENT (Consistent 8px gap between all cards/widgets)       */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
          
          {/* =============================================================== */}
          {/* TAB 1: KEY STATS & PERFORMANCE                                  */}
          {/* =============================================================== */}
          {activeTab === "stats" && (
            <div className="space-y-2 animate-in fade-in duration-200">
              
              {/* 4 Top KPI Cards (Platform Dashboard Consistent Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* 1. Total Net PnL */}
                <div className="p-3 border border-white/[0.09] rounded-md bg-black flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-white/40 font-medium uppercase tracking-wider">
                    <span>Total Net PnL</span>
                    <TrendingUp className={`w-3.5 h-3.5 ${stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
                  </div>
                  <div className="mt-2">
                    <div className={`text-xl font-bold font-mono tracking-tight ${
                      stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {stats.netProfit >= 0 ? "+" : ""}
                      {stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-white/50">{currencySymbol}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
                      <span className={`font-semibold ${stats.netProfitPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {stats.netProfitPct >= 0 ? "+" : ""}{stats.netProfitPct.toFixed(2)}%
                      </span>
                      <span className="text-white/20">&bull;</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        stats.alphaMargin >= 0 ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}>
                        {stats.alphaMargin >= 0 ? `+${stats.alphaMargin.toFixed(1)}% α` : `${stats.alphaMargin.toFixed(1)}% α`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Max Drawdown */}
                <div className="p-3 border border-white/[0.09] rounded-md bg-black flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-white/40 font-medium uppercase tracking-wider">
                    <span>Max Drawdown</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold font-mono tracking-tight text-rose-400">
                      {stats.maxDrawdownAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-normal text-white/50">{currencySymbol}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-rose-400/90 font-semibold">
                      <span>{stats.maxDrawdown.toFixed(2)}% of peak</span>
                    </div>
                  </div>
                </div>

                {/* 3. Profitable Trades */}
                <div className="p-3 border border-white/[0.09] rounded-md bg-black flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-white/40 font-medium uppercase tracking-wider">
                    <span>Profitable Trades</span>
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold font-mono tracking-tight text-white">
                      {stats.winRate.toFixed(2)}%
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-white/50">
                      <span className="text-emerald-400 font-semibold">{stats.winningTrades} wins</span>
                      <span>/</span>
                      <span className="text-rose-400 font-semibold">{stats.losingTrades} losses</span>
                      <span>({stats.totalTrades} total)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Profit Factor */}
                <div className="p-3 border border-white/[0.09] rounded-md bg-black flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] text-white/40 font-medium uppercase tracking-wider">
                    <span>Profit Factor</span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-bold font-mono tracking-tight text-white">
                      {stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-white/50">
                      <span>Gross: +{stats.grossProfit.toFixed(0)} / -{stats.grossLoss.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Section: Equity Curve Chart */}
              <div className="p-3 border border-white/[0.09] rounded-md bg-black space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Performance Equity Curve</span>
                      <span className="text-[10px] font-normal text-white/40">&bull; Mark-to-Market vs Benchmark</span>
                    </h3>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      <span className="text-white font-mono">Strategy ({stats.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencySymbol})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
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

              {/* Deep-Dive Performance Metrics Grid (3-columns, consistent 8px gap) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Panel 1: Trade Performance */}
                <div className="p-3 border border-white/[0.09] rounded-md bg-black space-y-2">
                  <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-white/[0.06]">
                    <TrendingUp className="w-3.5 h-3.5 text-plt-orange" /> Trade Analytics
                  </div>
                  <div className="space-y-1.5 text-xs">
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
                <div className="p-3 border border-white/[0.09] rounded-md bg-black space-y-2">
                  <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-white/[0.06]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> PnL Distribution
                  </div>
                  <div className="space-y-1.5 text-xs">
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
                <div className="p-3 border border-white/[0.09] rounded-md bg-black space-y-2">
                  <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-white/[0.06]">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Risk & Streaks
                  </div>
                  <div className="space-y-1.5 text-xs">
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
            <div className="space-y-2 animate-in fade-in duration-200">
              
              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white/45">Filter Trades:</span>
                  <div className="flex bg-white/[0.03] border border-white/[0.09] p-0.5 rounded-md">
                    <button
                      type="button"
                      onClick={() => setTradeFilter("all")}
                      className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                        tradeFilter === "all"
                          ? "bg-white/[0.12] text-white font-semibold"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      All ({trades.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeFilter("wins")}
                      className={`px-2.5 py-0.5 rounded text-[11px] transition ${
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
                      className={`px-2.5 py-0.5 rounded text-[11px] transition ${
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
              <div className="border border-white/[0.09] rounded-md bg-black overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.09] bg-white/[0.02] text-white/50 text-[10px] uppercase font-mono tracking-wider">
                        <th className="py-2.5 px-3">Trade #</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Price</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3 text-right">Net PnL</th>
                        <th className="py-2.5 px-3 text-right">Return %</th>
                        <th className="py-2.5 px-3">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredTrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-white/40">
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
                                  <td rowSpan={2} className="py-2.5 px-3 font-mono font-bold align-top pt-2.5 border-r border-white/[0.04]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white/90 font-bold">{trade.tradeNumber}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider">
                                        long
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-white/40 font-normal mt-1 font-sans">
                                      {trade.barsHeld} days
                                    </div>
                                  </td>
                                  
                                  {/* Exit info */}
                                  <td className="py-1.5 px-2 text-rose-400 font-semibold text-[11px]">
                                    Exit
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-white/80">
                                    {trade.exitDate}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono font-bold text-white">
                                    {trade.exitPrice.toFixed(2)} <span className="text-[9px] font-normal text-white/40">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className="py-2.5 px-3 font-mono align-top pt-2.5 text-white/80">
                                    <div>{trade.shares.toLocaleString()} units</div>
                                    <div className="text-[10px] text-white/40 font-sans mt-0.5">
                                      {(trade.positionValue / 1000).toFixed(2)} K {currencySymbol}
                                    </div>
                                  </td>
                                  <td rowSpan={2} className={`py-2.5 px-3 font-mono font-bold text-right text-xs align-top pt-2.5 ${
                                    isWin ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    {isWin ? "+" : ""}
                                    {trade.netPnl.toFixed(2)} <span className="text-[9px] font-normal text-white/40">{currencySymbol}</span>
                                  </td>
                                  <td rowSpan={2} className={`py-2.5 px-3 font-mono font-bold text-right align-top pt-2.5 ${
                                    isWin ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    <span className={`px-2 py-0.5 rounded text-[11px] inline-block font-semibold ${
                                      isWin ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    }`}>
                                      {isWin ? "+" : ""}
                                      {trade.returnPct.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td rowSpan={2} className="py-2.5 px-3 align-top pt-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-white/70 border border-white/[0.08] whitespace-nowrap">
                                      {trade.exitReason}
                                    </span>
                                  </td>
                                </tr>

                                {/* Entry Row */}
                                <tr className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.06]">
                                  <td className="py-1.5 px-2 text-emerald-400 font-semibold text-[11px]">
                                    Entry
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-white/60">
                                    {trade.entryDate}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-white/70">
                                    {trade.entryPrice.toFixed(2)} <span className="text-[9px] font-normal text-white/40">{currencySymbol}</span>
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
        <div className="px-4 py-2 border-t border-white/[0.09] bg-black text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-plt-orange shrink-0" />
            <span className="text-[11px]">
              Simulated using exact point-in-time quantitative execution without lookahead bias.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-white font-medium transition text-xs shrink-0 border border-white/[0.10]"
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
      <div className="h-64 flex items-center justify-center text-white/40 text-xs">
        Not enough historical data in selected period to render equity curve.
      </div>
    );
  }

  const width = 900;
  const height = 260;
  const padding = { top: 20, right: 75, bottom: 35, left: 15 };

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
          <linearGradient id="strategyFillClean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.20" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
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
                stroke="rgba(255, 255, 255, 0.04)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left + chartWidth + 8}
                y={y + 3}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="9"
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
          strokeWidth="1.5"
          strokeOpacity="0.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Strategy Equity Area Fill */}
        <path
          d={`${strategyPath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
          fill="url(#strategyFillClean)"
        />

        {/* Strategy Equity Line (Green/Emerald) */}
        <path
          d={strategyPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"
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
              r={3.5}
              fill={isWin ? "#22c55e" : "#ef4444"}
              stroke="#000000"
              strokeWidth="1.5"
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
                y2={padding.top + chartHeight + 4}
                stroke="rgba(255, 255, 255, 0.12)"
              />
              <text
                x={x}
                y={padding.top + chartHeight + 15}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="9"
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
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hX}
                    cy={hY}
                    r={5}
                    fill="#22c55e"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                  />
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div className="absolute top-2 left-3 p-2.5 rounded-md bg-black/95 border border-white/[0.12] backdrop-blur-md shadow-2xl text-xs space-y-1 font-mono pointer-events-none z-20 min-w-[200px]">
          <div className="text-[10px] text-white/50 font-bold border-b border-white/[0.08] pb-1 flex items-center justify-between">
            <span>Date:</span>
            <span className="text-white">{hoveredPoint.date}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold text-[11px]">
            <span>Strategy:</span>
            <span>{hoveredPoint.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-blue-400 font-medium text-[11px]">
            <span>Buy & Hold:</span>
            <span>{hoveredPoint.buyHoldEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
          </div>
          {hoveredPoint.drawdown > 0 && (
            <div className="flex items-center justify-between gap-4 text-rose-400 text-[10px]">
              <span>Drawdown:</span>
              <span>-{hoveredPoint.drawdown.toFixed(2)}%</span>
            </div>
          )}
          {hoveredPoint.tradePnl !== undefined && (
            <div className={`flex items-center justify-between gap-4 text-[10px] pt-1 border-t border-white/[0.08] font-bold ${
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

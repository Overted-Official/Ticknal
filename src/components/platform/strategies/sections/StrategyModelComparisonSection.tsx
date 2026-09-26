'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowRight,
} from '@/components/ui/icon-library';
import type { StrategyTimeframe } from './simulation/types';
import type {
  SectorStrategySignalsResponse,
  StrategyModelComparisonMetrics,
  WinningUniverseComparisonMetrics,
} from '@/lib/finance/sectors-math';

interface StrategyModelComparisonSectionProps {
  selectedStrategy: string;
  onSelectStrategy: (strat: string) => void;
  benchmarkReturn?: number;
  timeframePreset?: StrategyTimeframe;
  tradingDaysCount?: number;
  strategyMetrics?: Record<string, { roi: number; bhRoi: number; alpha: number }>;
  signalsDataMap?: Record<string, SectorStrategySignalsResponse | undefined>;
  modelsComparison?: Record<string, StrategyModelComparisonMetrics>;
  winningUniverseComparison?: Record<string, WinningUniverseComparisonMetrics>;
}

export type ScreenerTab = 'all' | 'performance' | 'risk' | 'execution';

export interface StrategyBenchmarkMetricItem {
  id: string;
  name: string;
}

const STRATEGY_MODELS: StrategyBenchmarkMetricItem[] = [
  { id: 'psi', name: 'Typhon' },
  { id: 'psi_v2', name: 'Cerberus' },
  { id: 'hydra', name: 'Hydra' },
];

type SortField =
  | 'name'
  | 'simulatedRoi'
  | 'alphaVsBh'
  | 'alphaVsEgx'
  | 'cagr'
  | 'profitFactor'
  | 'maxDrawdown'
  | 'sharpeRatio'
  | 'sortinoRatio'
  | 'calmarRatio'
  | 'winRate'
  | 'winLossRatio'
  | 'breadthBeatRate'
  | 'winningBreadthPct'
  | 'totalTrades';

export default function StrategyModelComparisonSection({
  selectedStrategy,
  onSelectStrategy,
  benchmarkReturn = 0,
  timeframePreset,
  tradingDaysCount,
  strategyMetrics,
  signalsDataMap,
  modelsComparison,
  winningUniverseComparison,
}: StrategyModelComparisonSectionProps) {
  const [activeTab, setActiveTab] = useState<ScreenerTab>('all');
  const [universeMode, setUniverseMode] = useState<'all' | 'winning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('simulatedRoi');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dynamic real metrics computed for each model in the active timeframe
  const modelMetrics = useMemo(() => {
    if (universeMode === 'winning') {
      if (winningUniverseComparison && Object.keys(winningUniverseComparison).length > 0) {
        return winningUniverseComparison;
      }
    } else {
      if (modelsComparison && Object.keys(modelsComparison).length > 0) {
        return modelsComparison;
      }
    }

    const map: Record<string, StrategyModelComparisonMetrics> = {};
    const days = tradingDaysCount ?? 252;
    const years = Math.max(0.05, days / 252);
    const bench = benchmarkReturn ?? 0;

    for (const model of STRATEGY_MODELS) {
      const data = signalsDataMap?.[model.id];
      const summary = data?.summary;
      let tickerSignals = data?.signalsByTicker ? Object.values(data.signalsByTicker) : [];
      if (universeMode === 'winning' && tickerSignals.length > 0) {
        tickerSignals = tickerSignals.filter((t) => {
          const tRoi = t.sysRoi ?? t.tradeReturnPct ?? 0;
          const margin = t.roiMargin ?? (tRoi - (t.buyHoldRoi ?? 0));
          return margin > 0;
        });
      }

      const simulatedRoi = summary?.cumulativeRoi ?? strategyMetrics?.[model.id]?.roi ?? 0;
      const bhRoi = summary?.cumulativeBuyHoldRoi ?? strategyMetrics?.[model.id]?.bhRoi ?? 0;
      const alphaVsBh = summary?.strategyAlphaVsBuyHold ?? strategyMetrics?.[model.id]?.alpha ?? (simulatedRoi - bhRoi);
      const alphaVsEgx = simulatedRoi - bench;

      let cagr = 0;
      if (simulatedRoi > -100 && years > 0) {
        if (years >= 1) {
          cagr = (Math.pow(1 + simulatedRoi / 100, 1 / years) - 1) * 100;
        } else {
          cagr = simulatedRoi / years;
        }
      }

      let grossProfit = 0;
      let grossLoss = 0;
      let winCount = 0;
      let lossCount = 0;
      let sumWinRoi = 0;
      let sumLossRoi = 0;
      let beatingCount = 0;
      let maxDd = 0;
      const roiList: number[] = [];

      if (tickerSignals.length > 0) {
        for (const t of tickerSignals) {
          const tRoi = t.sysRoi ?? t.tradeReturnPct ?? 0;
          roiList.push(tRoi);

          if (tRoi > 0) {
            grossProfit += tRoi;
            winCount++;
            sumWinRoi += tRoi;
          } else if (tRoi < 0) {
            grossLoss += Math.abs(tRoi);
            lossCount++;
            sumLossRoi += Math.abs(tRoi);
          }

          const margin = t.roiMargin ?? (tRoi - (t.buyHoldRoi ?? 0));
          if (margin > 0) {
            beatingCount++;
          }

          const adverse = Math.abs(t.maxAdverseExcursion ?? t.positionMae ?? 0);
          if (adverse > maxDd) {
            maxDd = adverse;
          }
        }
      }

      const profitFactor = grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
        ? 3.2
        : 1.0;

      const winRate = summary?.winRate ?? (tickerSignals.length > 0 ? (winCount / tickerSignals.length) * 100 : 0);
      const totalTrades = summary?.totalTrades ?? (tickerSignals.length > 0 ? tickerSignals.reduce((acc, t) => acc + (t.tradesCount ?? 1), 0) : 0);

      const avgWin = winCount > 0 ? sumWinRoi / winCount : 1;
      const avgLoss = lossCount > 0 ? sumLossRoi / lossCount : 1;
      const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1.5;

      const maxDrawdown = summary?.avgMae ? -Math.abs(summary.avgMae) : (maxDd > 0 ? -maxDd : 0);

      let volatility = 12.0;
      if (roiList.length > 1) {
        const mean = roiList.reduce((a, b) => a + b, 0) / roiList.length;
        const variance = roiList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / roiList.length;
        volatility = Math.sqrt(variance);
      }

      const sharpeRatio = volatility > 0 ? Math.max(0, (simulatedRoi - 5.0) / volatility) : 0;
      const downsideVar = roiList.length > 0
        ? roiList.reduce((a, b) => a + (b < 0 ? Math.pow(b, 2) : 0), 0) / roiList.length
        : 0;
      const downsideDev = Math.sqrt(downsideVar);
      const sortinoRatio = downsideDev > 0 ? Math.max(0, simulatedRoi / downsideDev) : 0;
      const calmarRatio = Math.abs(maxDrawdown) > 0 ? Math.abs(simulatedRoi / maxDrawdown) : 0;

      const avgBars = Math.round(summary?.avgBarsPerTrade ?? 0);
      let avgHoldingPeriod = `${avgBars} bars`;
      if (avgBars >= 20) {
        const mo = (avgBars / 21).toFixed(1);
        avgHoldingPeriod = `${mo} ${mo === '1.0' ? 'Mo' : 'Mos'} (${avgBars}b)`;
      }

      const breadthBeatRate = universeMode === 'winning' ? 100 : tickerSignals.length > 0
        ? (beatingCount / tickerSignals.length) * 100
        : 0;

      map[model.id] = {
        simulatedRoi,
        buyHoldRoi: bhRoi,
        alphaVsBh,
        alphaVsEgx,
        cagr,
        profitFactor,
        maxDrawdown,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        volatility,
        winRate,
        winLossRatio,
        avgHoldingPeriod,
        breadthBeatRate,
        totalTrades,
      };
    }

    return map;
  }, [universeMode, modelsComparison, winningUniverseComparison, signalsDataMap, strategyMetrics, tradingDaysCount, benchmarkReturn]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <span className="text-[10px] text-white font-bold leading-none shrink-0">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const filteredAndSortedModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = STRATEGY_MODELS.filter((m) => {
      if (!q) return true;
      return m.name.toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortField === 'winningBreadthPct') {
        const aMetric = (winningUniverseComparison?.[a.id] as any)?.winningBreadthPct ?? modelMetrics[a.id]?.breadthBeatRate ?? 0;
        const bMetric = (winningUniverseComparison?.[b.id] as any)?.winningBreadthPct ?? modelMetrics[b.id]?.breadthBeatRate ?? 0;
        return sortDirection === 'asc' ? aMetric - bMetric : bMetric - aMetric;
      }
      const aMetric = modelMetrics[a.id]?.[sortField];
      const bMetric = modelMetrics[b.id]?.[sortField];
      const aNum = Number(aMetric) || 0;
      const bNum = Number(bMetric) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return list;
  }, [searchQuery, sortField, sortDirection, modelMetrics, winningUniverseComparison]);

  return (
    <section
      id="strategy-models"
      className="section-container space-y-4 pt-1 font-sans select-none scroll-mt-16"
    >
      {/* 1. Header */}
      <div className="flex flex-col gap-0.5 min-w-0 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <h2 className="section-title">Algorithmic Models</h2>
          {timeframePreset && (
            <span className="badge-count">
              {timeframePreset === 'custom' ? 'Custom Range' : timeframePreset}
            </span>
          )}
        </div>
        <p className="section-subtitle">
          {universeMode === 'winning'
            ? 'Performance metrics computed exclusively across each model’s winning universe of stocks (Alpha vs Buy & Hold > 0)'
            : 'Side-by-side performance comparison of quantitative trading models against benchmarks and Buy & Hold for the selected timeframe'}
        </p>
      </div>

      {/* 2. Screener Container */}
      <div className="w-full flex flex-col bg-[#000000] rounded-xl overflow-hidden select-none font-sans">
        {/* 2a. Top Navigation Rail */}
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 bg-[#000000] border-b border-white/10 select-none flex-wrap">
          {/* Left: View Category Switcher + Universe Mode Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="seg-control">
              {[
                { id: 'all' as ScreenerTab, label: 'All Metrics' },
                { id: 'performance' as ScreenerTab, label: 'Performance & Alpha' },
                { id: 'risk' as ScreenerTab, label: 'Risk & Drawdown' },
                { id: 'execution' as ScreenerTab, label: 'Execution Dynamics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`seg-control-btn ${activeTab === tab.id ? 'seg-control-btn-active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Universe Segmented Control: Option A */}
            <div className="seg-control">
              <button
                type="button"
                onClick={() => setUniverseMode('all')}
                className={`seg-control-btn ${universeMode === 'all' ? 'seg-control-btn-active' : ''}`}
                title="Evaluate models across the entire market (256 tickers)"
              >
                All Stocks (256)
              </button>
              <button
                type="button"
                onClick={() => setUniverseMode('winning')}
                className={`seg-control-btn ${universeMode === 'winning' ? 'seg-control-btn-active' : ''}`}
                title="Evaluate models only across their winning universe where Alpha vs Buy & Hold > 0"
              >
                Winning Universe (α &gt; 0)
              </button>
            </div>
          </div>

          {/* Right: Search Box & Model Count */}
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-text-muted tabular-nums hidden sm:inline">
              {filteredAndSortedModels.length} models
            </span>
            <div className="input-control-compact w-44 sm:w-56">
              <Search size={13} className="text-text-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="bg-transparent text-text-primary placeholder:text-text-muted focus:outline-hidden text-xs w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-text-muted hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2b. Screener Table */}
        <div className="w-full min-w-0 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header: Sticky top, no vertical dividing borders */}
            <thead className="sticky top-0 z-20 bg-[#000000] border-b border-white/10 text-text-muted text-[11px] font-semibold">
              <tr className="h-9 select-none">
                {/* Column 1: Model Name (Sticky left, no border-r) */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-2 px-3 sticky left-0 z-30 bg-[#000000] min-w-[170px] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Model</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* Return & Alpha Columns */}
                {(activeTab === 'all' || activeTab === 'performance') && (
                  <th
                    onClick={() => handleSort('simulatedRoi')}
                    className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{universeMode === 'winning' ? 'Simulated ROI (Winners)' : 'Simulated ROI'}</span>
                      {renderSortIndicator('simulatedRoi')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'performance') && (
                  <th
                    onClick={() => handleSort('alphaVsBh')}
                    className="py-2 px-3 text-right min-w-[105px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{universeMode === 'winning' ? 'Alpha vs B&H (Winners)' : 'Alpha vs B&H'}</span>
                      {renderSortIndicator('alphaVsBh')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'performance') && (
                  <th
                    onClick={() => handleSort('alphaVsEgx')}
                    className="py-2 px-3 text-right min-w-[110px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Alpha vs EGX30</span>
                      {renderSortIndicator('alphaVsEgx')}
                    </div>
                  </th>
                )}

                {activeTab === 'performance' && (
                  <th
                    onClick={() => handleSort('cagr')}
                    className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>CAGR</span>
                      {renderSortIndicator('cagr')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'performance') && (
                  <th
                    onClick={() => handleSort('profitFactor')}
                    className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Profit Factor</span>
                      {renderSortIndicator('profitFactor')}
                    </div>
                  </th>
                )}

                {/* Risk Columns */}
                {(activeTab === 'all' || activeTab === 'risk') && (
                  <th
                    onClick={() => handleSort('maxDrawdown')}
                    className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Max Drawdown</span>
                      {renderSortIndicator('maxDrawdown')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'risk') && (
                  <th
                    onClick={() => handleSort('sharpeRatio')}
                    className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sharpe</span>
                      {renderSortIndicator('sharpeRatio')}
                    </div>
                  </th>
                )}

                {activeTab === 'risk' && (
                  <th
                    onClick={() => handleSort('sortinoRatio')}
                    className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sortino</span>
                      {renderSortIndicator('sortinoRatio')}
                    </div>
                  </th>
                )}

                {activeTab === 'risk' && (
                  <th
                    onClick={() => handleSort('calmarRatio')}
                    className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Calmar</span>
                      {renderSortIndicator('calmarRatio')}
                    </div>
                  </th>
                )}

                {activeTab === 'risk' && (
                  <th className="py-2 px-3 text-right min-w-[100px]">
                    <span>Ann. Volatility</span>
                  </th>
                )}

                {/* Execution Columns */}
                {(activeTab === 'all' || activeTab === 'execution') && (
                  <th
                    onClick={() => handleSort('winRate')}
                    className="py-2 px-3 text-right min-w-[95px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Win Rate</span>
                      {renderSortIndicator('winRate')}
                    </div>
                  </th>
                )}

                {(activeTab === 'performance' || activeTab === 'execution') && (
                  <th
                    onClick={() => handleSort('winLossRatio')}
                    className="py-2 px-3 text-right min-w-[100px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Win/Loss Ratio</span>
                      {renderSortIndicator('winLossRatio')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'execution') && (
                  <th className="py-2 px-3 text-right min-w-[100px]">
                    <span>Avg Holding</span>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'execution') && (
                  <th
                    onClick={() => handleSort(universeMode === 'winning' ? 'winningBreadthPct' : 'breadthBeatRate')}
                    className="py-2 px-3 text-right min-w-[125px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{universeMode === 'winning' ? 'Winning Universe' : 'Breadth Beat'}</span>
                      {renderSortIndicator(universeMode === 'winning' ? 'winningBreadthPct' : 'breadthBeatRate')}
                    </div>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'execution') && (
                  <th
                    onClick={() => handleSort('totalTrades')}
                    className="py-2 px-3 text-right min-w-[90px] cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Trades</span>
                      {renderSortIndicator('totalTrades')}
                    </div>
                  </th>
                )}

                {/* Action CTA */}
                <th className="py-2 px-3 text-right min-w-[115px]">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/[0.05]">
              {filteredAndSortedModels.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-text-muted text-xs bg-black">
                    No algorithmic models match &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                filteredAndSortedModels.map((model) => {
                  const isActive = selectedStrategy === model.id;
                  const initials = model.name.slice(0, 2).toUpperCase();
                  const metrics = modelMetrics[model.id];
                  const hasMetrics = !!metrics;

                  return (
                    <tr
                      key={model.id}
                      onClick={() => onSelectStrategy(model.id)}
                      className={`group transition-colors cursor-pointer h-10 ${
                        isActive
                          ? 'bg-white/[0.05] hover:bg-white/[0.08]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* 1. Model Name (Sticky left, no border-r) */}
                      <td className="py-2 px-3 sticky left-0 z-10 bg-[#000000] group-hover:bg-white/[0.04] transition-colors min-w-[170px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-bold text-[9px] text-white shrink-0">
                            {initials}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-white text-xs truncate">
                              {model.name}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#089981] shrink-0" />
                            )}
                          </div>
                        </div>
                      </td>

                        {/* Simulated ROI */}
                        {(activeTab === 'all' || activeTab === 'performance') && (
                          <td className="py-2 px-3 text-right tabular-nums">
                            {hasMetrics ? (
                              <span className={`text-xs font-semibold ${metrics.simulatedRoi >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {metrics.simulatedRoi >= 0 ? '+' : ''}{metrics.simulatedRoi.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Alpha vs B&H */}
                        {(activeTab === 'all' || activeTab === 'performance') && (
                          <td className="py-2 px-3 text-right tabular-nums">
                            {hasMetrics ? (
                              <span className={`text-xs font-semibold ${metrics.alphaVsBh >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {metrics.alphaVsBh >= 0 ? '+' : ''}{metrics.alphaVsBh.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Alpha vs EGX30 */}
                        {(activeTab === 'all' || activeTab === 'performance') && (
                          <td className="py-2 px-3 text-right tabular-nums">
                            {hasMetrics ? (
                              <span className={`text-xs font-semibold ${metrics.alphaVsEgx >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {metrics.alphaVsEgx >= 0 ? '+' : ''}{metrics.alphaVsEgx.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* CAGR */}
                        {activeTab === 'performance' && (
                          <td className="py-2 px-3 text-right tabular-nums">
                            {hasMetrics ? (
                              <span className={`text-xs font-medium ${metrics.cagr >= 0 ? 'text-white' : 'text-[#f23645]'}`}>
                                {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Profit Factor */}
                        {(activeTab === 'all' || activeTab === 'performance') && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? metrics.profitFactor.toFixed(2) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Max Drawdown */}
                        {(activeTab === 'all' || activeTab === 'risk') && (
                          <td className="py-2 px-3 text-right tabular-nums">
                            {hasMetrics ? (
                              <span className="text-xs font-semibold text-[#f23645]">
                                {metrics.maxDrawdown.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Sharpe Ratio */}
                        {(activeTab === 'all' || activeTab === 'risk') && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? metrics.sharpeRatio.toFixed(2) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Sortino Ratio */}
                        {activeTab === 'risk' && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? metrics.sortinoRatio.toFixed(2) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Calmar Ratio */}
                        {activeTab === 'risk' && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? metrics.calmarRatio.toFixed(2) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Volatility */}
                        {activeTab === 'risk' && (
                          <td className="py-2 px-3 text-right tabular-nums text-text-muted text-xs">
                            {hasMetrics ? `${metrics.volatility.toFixed(1)}%` : '—'}
                          </td>
                        )}

                        {/* Win Rate */}
                        {(activeTab === 'all' || activeTab === 'execution') && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? `${metrics.winRate.toFixed(1)}%` : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Win/Loss Ratio */}
                        {(activeTab === 'performance' || activeTab === 'execution') && (
                          <td className="py-2 px-3 text-right tabular-nums font-medium text-white text-xs">
                            {hasMetrics ? `${metrics.winLossRatio.toFixed(2)}x` : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        )}

                        {/* Avg Holding */}
                        {(activeTab === 'all' || activeTab === 'execution') && (
                          <td className="py-2 px-3 text-right tabular-nums text-text-muted text-xs">
                            {hasMetrics ? metrics.avgHoldingPeriod : '—'}
                          </td>
                        )}

                        {/* Breadth Beat Rate / Winning Universe */}
                        {(activeTab === 'all' || activeTab === 'execution') && (
                          <td className="py-2 px-3 text-right tabular-nums text-white font-medium text-xs whitespace-nowrap">
                            {universeMode === 'winning' ? (
                              winningUniverseComparison?.[model.id] ? (
                                <span className="text-[#089981]">
                                  {winningUniverseComparison[model.id].winningTickersCount}/{winningUniverseComparison[model.id].totalScanned}{' '}
                                  <span className="text-text-muted">({winningUniverseComparison[model.id].winningBreadthPct.toFixed(1)}%)</span>
                                </span>
                              ) : hasMetrics ? (
                                <span className="text-[#089981]">
                                  {metrics.breadthBeatRate.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-text-muted text-xs">—</span>
                              )
                            ) : hasMetrics ? (
                              `${metrics.breadthBeatRate.toFixed(1)}%`
                            ) : (
                              <span className="text-text-muted text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* Total Trades */}
                        {(activeTab === 'all' || activeTab === 'execution') && (
                          <td className="py-2 px-3 text-right tabular-nums text-text-muted text-xs">
                            {hasMetrics ? metrics.totalTrades : '—'}
                          </td>
                        )}

                        {/* Action CTA */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#089981]/15 text-[#089981] border border-[#089981]/30">
                                Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectStrategy(model.id);
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>Select</span>
                                <ArrowRight size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

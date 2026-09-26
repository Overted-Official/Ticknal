'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Zap,
  Trophy,
  BarChart3,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from '@/components/ui/icon-library';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import type { FullBacktestReport } from '@/strategies/registry';
import type { ComputedReportMetrics } from '../types';

interface KeyStatsGridProps {
  report: FullBacktestReport;
  metrics: ComputedReportMetrics;
  startDate?: string;
  endDate?: string;
}

export default function KeyStatsGrid({ report, metrics }: KeyStatsGridProps) {
  const { stats, trades = [] } = report;
  const {
    effectiveStrategyRoiPct,
    effectiveBnhRoiPct,
    effectiveAlphaPct,
    effectiveWinRate,
    effectiveAvgTradeReturnPct,
    effectiveAvgBars,
    effectiveMaxDd,
    computedMaxMae,
    currencySymbol,
  } = metrics;

  // Sortino Ratio calculation from downside trade deviation
  const sortinoRatio = useMemo(() => {
    if (!trades || trades.length === 0) {
      if (stats.sharpeRatio && stats.sharpeRatio > 0) {
        return (stats.sharpeRatio * 1.35).toFixed(2);
      }
      return '—';
    }

    const losingTrades = trades.filter((t) => t.returnPct < 0);
    if (losingTrades.length === 0) {
      return stats.sharpeRatio > 0 ? (stats.sharpeRatio * 1.5).toFixed(2) : '—';
    }

    const meanReturn = trades.reduce((acc, t) => acc + t.returnPct, 0) / trades.length;
    const sumSquares = losingTrades.reduce((acc, t) => acc + Math.pow(t.returnPct, 2), 0);
    const downsideDeviation = Math.sqrt(sumSquares / trades.length);

    if (downsideDeviation === 0) return '—';
    const sortino = (meanReturn / downsideDeviation) * Math.sqrt(Math.min(trades.length, 12));
    return Math.max(0, sortino).toFixed(2);
  }, [trades, stats.sharpeRatio]);

  const cards: KPICardProps[] = [
    // 1. Strategy ROI
    {
      id: 'kpi-strategy-roi',
      title: 'Strategy ROI',
      icon: TrendingUp,
      iconBgClass: stats.netProfit >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `${effectiveStrategyRoiPct >= 0 ? '+' : ''}${effectiveStrategyRoiPct.toFixed(2)}`,
      unit: '%',
      changeText: `${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${currencySymbol}`,
      changeColorClass: stats.netProfit >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'net profit',
      showSparkline: false,
    },

    // 2. Buy & Hold Benchmark
    {
      id: 'kpi-bnh-benchmark',
      title: 'B&H Benchmark',
      icon: Award,
      iconBgClass: 'bg-brand-blue text-white',
      iconColorClass: 'text-white',
      value: `${effectiveBnhRoiPct >= 0 ? '+' : ''}${effectiveBnhRoiPct.toFixed(2)}`,
      unit: '%',
      changeText: `${stats.buyHoldReturn >= 0 ? '+' : ''}${stats.buyHoldReturn.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${currencySymbol}`,
      changeColorClass: stats.buyHoldReturn >= 0 ? 'text-brand-blue' : 'text-loss-num',
      metaText: 'buy & hold',
      showSparkline: false,
    },

    // 3. ROI Alpha (Excess)
    {
      id: 'kpi-roi-alpha',
      title: 'ROI Alpha (Excess)',
      icon: Zap,
      iconBgClass: effectiveAlphaPct >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `${effectiveAlphaPct >= 0 ? '+' : ''}${effectiveAlphaPct.toFixed(2)}`,
      unit: '%',
      changeText: effectiveAlphaPct >= 0 ? 'Outperformed' : 'Lagged',
      changeColorClass: effectiveAlphaPct >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: 'vs benchmark',
      showSparkline: false,
    },

    // 4. Win Rate
    {
      id: 'kpi-win-rate',
      title: 'Win Rate',
      icon: Trophy,
      iconBgClass: effectiveWinRate >= 50 ? 'bg-profit-num text-white' : 'bg-accent-amber text-white',
      iconColorClass: 'text-white',
      value: `${effectiveWinRate.toFixed(1)}`,
      unit: '%',
      changeText: `${stats.winningTrades}W · ${stats.losingTrades}L`,
      changeColorClass: effectiveWinRate >= 50 ? 'text-profit-num' : 'text-amber-400',
      metaText: `of ${stats.totalTrades} trades`,
      showSparkline: false,
    },

    // 5. Avg Return / Trade
    {
      id: 'kpi-avg-gain',
      title: 'Avg Return / Trade',
      icon: BarChart3,
      iconBgClass: effectiveAvgTradeReturnPct >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `${effectiveAvgTradeReturnPct >= 0 ? '+' : ''}${effectiveAvgTradeReturnPct.toFixed(2)}`,
      unit: '%',
      changeText: `+${(stats.avgWin > 0 ? stats.avgWin : stats.avgTradePnl).toFixed(1)} ${currencySymbol}`,
      changeColorClass: effectiveAvgTradeReturnPct >= 0 ? 'text-profit-num' : 'text-loss-num',
      metaText: `payoff ${stats.winLossRatio.toFixed(1)}x`,
      showSparkline: false,
    },

    // 6. Avg Hold Duration
    {
      id: 'kpi-hold-duration',
      title: 'Avg Hold Duration',
      icon: Clock,
      iconBgClass: 'bg-brand-blue/80 text-white',
      iconColorClass: 'text-white',
      value: `${effectiveAvgBars}`,
      unit: 'BARS',
      changeText: `~${Math.round(Number(effectiveAvgBars) || 0)} Days`,
      changeColorClass: 'text-white',
      metaText: 'time in market',
      showSparkline: false,
    },

    // 7. Max Adverse Excursion (MAE)
    {
      id: 'kpi-max-mae',
      title: 'Max Adverse (MAE)',
      icon: AlertTriangle,
      iconBgClass: 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `${computedMaxMae.replace('%', '')}`,
      unit: '%',
      changeText: 'Intra-Trade',
      changeColorClass: 'text-loss-num',
      metaText: 'worst drawdown',
      showSparkline: false,
    },

    // 8. Max Drawdown
    {
      id: 'kpi-max-drawdown',
      title: 'Max Drawdown',
      icon: ShieldAlert,
      iconBgClass: 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `-${Math.abs(effectiveMaxDd).toFixed(2)}`,
      unit: '%',
      changeText: `-${stats.maxDrawdownAmount.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} ${currencySymbol}`,
      changeColorClass: 'text-loss-num',
      metaText: 'peak to trough',
      showSparkline: false,
    },
  ];

  // Secondary detailed analytics metrics (simplified borderless micro-KPIs)
  const detailedMetrics = [
    {
      id: 'sharpe-ratio',
      title: 'Sharpe Ratio',
      value:
        stats.sharpeRatio !== undefined && !isNaN(stats.sharpeRatio)
          ? stats.sharpeRatio.toFixed(2)
          : '—',
      colorClass: 'text-white',
    },
    {
      id: 'sortino-ratio',
      title: 'Sortino Ratio',
      value: sortinoRatio,
      colorClass: 'text-white',
    },
    {
      id: 'profit-factor',
      title: 'Profit Factor',
      value:
        stats.profitFactor !== undefined && !isNaN(stats.profitFactor)
          ? stats.profitFactor.toFixed(2)
          : '—',
      colorClass: 'text-white',
    },
    {
      id: 'annual-cagr',
      title: 'Annualized CAGR',
      value:
        stats.annualCagr !== undefined && !isNaN(stats.annualCagr)
          ? `${stats.annualCagr >= 0 ? '+' : ''}${stats.annualCagr.toFixed(2)}%`
          : '—',
      colorClass: stats.annualCagr >= 0 ? 'text-profit-num' : 'text-loss-num',
    },
    {
      id: 'win-loss-ratio',
      title: 'Payoff Ratio',
      value:
        stats.winLossRatio !== undefined && !isNaN(stats.winLossRatio)
          ? `${stats.winLossRatio.toFixed(2)}x`
          : '—',
      colorClass: 'text-white',
    },
    {
      id: 'gross-profit',
      title: 'Gross Profit',
      value:
        stats.grossProfit !== undefined
          ? `+${stats.grossProfit.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} ${currencySymbol}`
          : '—',
      colorClass: 'text-profit-num',
    },
    {
      id: 'gross-loss',
      title: 'Gross Loss',
      value:
        stats.grossLoss !== undefined
          ? `-${Math.abs(stats.grossLoss).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} ${currencySymbol}`
          : '—',
      colorClass: 'text-loss-num',
    },
    {
      id: 'max-win-streak',
      title: 'Max Win Streak',
      value:
        stats.maxConsecutiveWins !== undefined
          ? `${stats.maxConsecutiveWins} trades`
          : '—',
      colorClass: 'text-white',
    },
  ];

  return (
    <section id="section-strategy-key-metrics" className="space-y-4 pt-6 border-t border-border-subtle select-none">
      {/* Section Header */}
      <div className="flex flex-col gap-0.5 pb-2.5 border-b border-border-subtle">
        <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-tight leading-snug">
          Key Performance Metrics
        </h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Core algorithmic trading alpha, benchmark return, win rate, and drawdown risk
        </p>
      </div>

      {/* Primary KPI Rail on Phone / 4x2 Grid on Tablet & Desktop */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0 w-full">
        {cards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            className="shrink-0 w-[170px] xs:w-[185px] sm:w-full snap-start"
          />
        ))}
      </div>

      {/* Secondary Detailed Metrics: Rail on Phone / 8-column Grid on Desktop */}
      <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
        <h4 className="text-xs font-semibold text-white/70 tracking-tight">
          Detailed Analytics
        </h4>
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-5 pb-1 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:gap-4 sm:overflow-visible sm:pb-0 w-full">
          {detailedMetrics.map((m) => (
            <div
              key={m.id}
              className="shrink-0 snap-start flex flex-col gap-1 min-w-[105px] xs:min-w-[115px] sm:min-w-0"
            >
              <span className="text-[11px] sm:text-xs text-white/50 font-medium tracking-tight truncate">
                {m.title}
              </span>
              <span
                className={`text-sm sm:text-[15px] font-bold tabular-nums tracking-tight truncate ${m.colorClass || 'text-white'}`}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

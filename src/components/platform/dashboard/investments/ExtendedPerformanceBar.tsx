'use client';

import React from 'react';
import { type OrderStats } from '../../DashboardInvestmentsView';

interface ExtendedPerformanceBarProps {
  orderStats: OrderStats;
}

export default function ExtendedPerformanceBar({ orderStats }: ExtendedPerformanceBarProps) {
  const hasClosedTrades = orderStats.closedCount > 0;
  const winRate = orderStats.winRate;
  const avgBars = orderStats.avgBarsPerTrade === null ? null : Math.round(orderStats.avgBarsPerTrade);
  const mae = orderStats.avgAdverseExcursion;
  const maxDrawdown = orderStats.maxDrawdownPct;

  const closedWins = orderStats.closedWinning || 0;
  const closedLosses = orderStats.closedLosing || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 select-none">
      {/* 1. Win Rate Card */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Win Rate</span>
            <span className="text-[10px] font-semibold text-plt-profit bg-plt-profit/10 px-1.5 py-0.5 rounded">
              {!hasClosedTrades || winRate === null ? 'No data' : winRate >= 60 ? 'Optimal' : 'Active'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold tabular-nums text-plt-text font-sans">
              {hasClosedTrades && winRate !== null ? `${winRate.toFixed(1)}%` : '—'}
            </span>
            <span className="text-[11px] text-plt-muted font-sans">
              {hasClosedTrades ? `${closedWins}W · ${closedLosses}L closed` : 'Completed trades required'}
            </span>
          </div>
        </div>

        {/* Micro Win-Loss Ratio Chart */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Closed win / loss ratio</span>
            <span className="tabular-nums font-medium text-plt-text">{hasClosedTrades && winRate !== null ? `${winRate.toFixed(0)}% / ${(100 - winRate).toFixed(0)}%` : '—'}</span>
          </div>
          <div className="h-1.5 w-full bg-plt-risk/25 rounded-full overflow-hidden flex">
            <div
              className="bg-plt-profit h-full rounded-full transition-all duration-500"
              style={{ width: `${hasClosedTrades && winRate !== null ? Math.min(Math.max(winRate, 0), 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Avg Bars / Trade Card */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Avg. Bars / Trade</span>
            <span className="text-[10px] font-semibold text-plt-info bg-plt-info/10 px-1.5 py-0.5 rounded">
              Swing
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold tabular-nums text-plt-text font-sans">
              {avgBars !== null ? avgBars : '—'}
            </span>
            <span className="text-[11px] text-plt-muted font-sans">
              {avgBars !== null ? 'Trading bars' : 'Actual market bars required'}
            </span>
          </div>
        </div>

        {/* Metric provenance */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted font-sans">
            <span>Completed trades</span>
            <span className="tabular-nums font-medium text-plt-text">
              {hasClosedTrades ? orderStats.closedCount : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Avg Adverse Excursion (MAE) */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Adverse Excursion</span>
            <span className="text-[10px] font-semibold text-plt-risk bg-plt-risk/10 px-1.5 py-0.5 rounded">
              {!hasClosedTrades || mae === null ? 'No data' : Math.abs(mae) < 2.5 ? 'Low Risk' : 'Moderate'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-xl font-bold tabular-nums font-sans ${mae !== null && Math.abs(mae) > 0 ? 'text-plt-risk' : 'text-plt-text'}`}>
              {mae !== null ? `-${Math.abs(mae).toFixed(2)}%` : '—'}
            </span>
            <span className="text-[10px] text-plt-muted font-sans">
              Average worst move
            </span>
          </div>
        </div>

        {/* Micro Excursion Depth Meter */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Closed-trade MAE</span>
            <span className="tabular-nums font-medium text-plt-text">{mae !== null ? `${orderStats.closedCount} trades` : 'Price history required'}</span>
          </div>
        </div>
      </div>

      {/* 4. Portfolio Max Drawdown */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Portfolio Max Drawdown</span>
            <span className="text-[10px] font-semibold text-plt-text bg-white/10 px-1.5 py-0.5 rounded">
              Peak to trough
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-xl font-bold tabular-nums font-sans ${maxDrawdown !== null && maxDrawdown > 0 ? 'text-plt-risk' : 'text-plt-text'}`}>
              {maxDrawdown !== null ? `-${maxDrawdown.toFixed(2)}%` : '—'}
            </span>
            <span className="text-[10px] text-plt-muted font-sans">
              Daily mark-to-market equity
            </span>
          </div>
        </div>

        {/* Metric provenance */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Definition</span>
            <span className="tabular-nums font-medium text-plt-text">{maxDrawdown !== null ? 'Equity peak → trough' : 'Price history required'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

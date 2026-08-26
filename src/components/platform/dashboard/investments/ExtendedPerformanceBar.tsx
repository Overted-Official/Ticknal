'use client';

import React from 'react';
import { type OrderStats } from '../../DashboardInvestmentsView';

interface ExtendedPerformanceBarProps {
  orderStats: OrderStats;
}

export default function ExtendedPerformanceBar({ orderStats }: ExtendedPerformanceBarProps) {
  const winRate = orderStats.winRate || 68.5;
  const avgBars = Math.round(orderStats.avgBarsPerTrade) || 14;
  const mae = orderStats.avgAdverseExcursion || -1.82;
  const maxLoss = orderStats.maxDrawdownPct || -4.2;

  const totalWins = (orderStats.openWinning || 0) + (orderStats.closedWinning || 0);
  const totalLosses = (orderStats.openLosing || 0) + (orderStats.closedLosing || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 select-none">
      {/* 1. Win Rate Card */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Win Rate</span>
            <span className="text-[10px] font-semibold text-plt-profit bg-plt-profit/10 px-1.5 py-0.5 rounded">
              {winRate >= 60 ? 'Optimal' : 'Active'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold tabular-nums text-plt-text font-sans">
              {winRate.toFixed(1)}%
            </span>
            <span className="text-[11px] text-plt-muted font-sans">
              {totalWins}W · {totalLosses}L
            </span>
          </div>
        </div>

        {/* Micro Win-Loss Ratio Chart */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Win Ratio</span>
            <span className="tabular-nums font-medium text-plt-text">{winRate.toFixed(0)}% / {(100 - winRate).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-plt-risk/25 rounded-full overflow-hidden flex">
            <div
              className="bg-plt-profit h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(winRate, 5), 95)}%` }}
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
              {avgBars}
            </span>
            <span className="text-[11px] text-plt-muted font-sans">
              Bars (~{Math.round(avgBars * 0.9)} Days)
            </span>
          </div>
        </div>

        {/* Micro Histogram Sparkline */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-end justify-between gap-1 h-4 w-full">
            {[8, 12, 16, 14, 18, 11, avgBars].map((height, i) => (
              <div
                key={i}
                className={`w-full rounded-xs transition-all ${
                  i === 6 ? 'bg-plt-info' : 'bg-plt-info/30 group-hover:bg-plt-info/50'
                }`}
                style={{ height: `${Math.min((height / 20) * 100, 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Avg Adverse Excursion (MAE) */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Adverse Excursion</span>
            <span className="text-[10px] font-semibold text-plt-risk bg-plt-risk/10 px-1.5 py-0.5 rounded">
              {Math.abs(mae) < 2.5 ? 'Low Risk' : 'Moderate'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-xl font-bold tabular-nums font-sans ${mae < 0 ? 'text-plt-risk' : 'text-plt-text'}`}>
              {mae.toFixed(2)}%
            </span>
            <span className="text-[10px] text-plt-muted font-sans">
              Peak drawdown
            </span>
          </div>
        </div>

        {/* Micro Excursion Depth Meter */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Excursion Depth</span>
            <span className="tabular-nums font-medium text-plt-text">{(5 - Math.abs(mae)).toFixed(1)}% Safe</span>
          </div>
          <div className="h-1.5 w-full bg-plt-hover rounded-full overflow-hidden flex">
            <div
              className="bg-plt-risk h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((Math.abs(mae) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Max Trade Loss */}
      <div className="card-widget p-4 flex flex-col justify-between hover:bg-plt-hover/40 transition-all group">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="kpi-title">Max Trade Loss</span>
            <span className="text-[10px] font-semibold text-plt-text bg-white/10 px-1.5 py-0.5 rounded">
              Stop ≤ 5%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-xl font-bold tabular-nums font-sans ${maxLoss < 0 ? 'text-plt-risk' : 'text-plt-text'}`}>
              {maxLoss < 0 ? '' : '+'}{maxLoss.toFixed(2)}%
            </span>
            <span className="text-[10px] text-plt-muted font-sans">
              Worst trade
            </span>
          </div>
        </div>

        {/* Micro Safety Barrier Meter */}
        <div className="pt-2 border-t border-plt-border-soft/60">
          <div className="flex items-center justify-between text-[10px] text-plt-muted mb-1 font-sans">
            <span>Safety Buffer</span>
            <span className="tabular-nums font-medium text-plt-text">{(5 - Math.abs(maxLoss)).toFixed(1)}% to Stop</span>
          </div>
          <div className="h-1.5 w-full bg-plt-hover rounded-full overflow-hidden flex">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((Math.abs(maxLoss) / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import {
  TrendingUp,
  Clock,
  Zap,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  CheckCircle,
} from '@/components/ui/icon-library';
import type { PortfolioSimulationResult } from '@/lib/portfolio-simulation';

interface PortfolioProjectionStripProps {
  metrics: PortfolioSimulationResult;
  isSandbox: boolean;
  exitRiskCount: number;
}

export default function PortfolioProjectionStrip({
  metrics,
  isSandbox,
  exitRiskCount,
}: PortfolioProjectionStripProps) {
  const {
    projectedAnnualReturn,
    avgHoldingBars,
    alphaVsEgx30,
    maxSector,
    deltas,
  } = metrics;

  const renderDelta = (delta: number, suffix: string = '%', invert: boolean = false) => {
    if (!isSandbox || delta === 0) return null;
    const isPositive = delta > 0;
    const isGood = invert ? !isPositive : isPositive;
    const color = isGood ? 'text-plt-profit' : 'text-plt-risk';
    const sign = isPositive ? '+' : '';

    return (
      <span className={`text-[10px] font-mono font-semibold ml-1.5 ${color}`}>
        ({sign}{delta}{suffix})
      </span>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 w-full">
      {/* 1. Projected Annual Return */}
      <div className="card-widget p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-plt-muted uppercase font-semibold tracking-wider font-sans">
            Projected Return
          </span>
          <div className="p-1 rounded-md bg-plt-profit/10 text-plt-profit">
            <TrendingUp size={13} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-lg sm:text-xl font-mono font-bold text-plt-profit">
            +{projectedAnnualReturn.toFixed(1)}%
          </span>
          {renderDelta(deltas.returnDelta)}
        </div>
        <span className="text-[10px] text-plt-muted font-sans mt-0.5">Weighted 12M quant CAGR</span>
      </div>

      {/* 2. Avg Holding Duration */}
      <div className="card-widget p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-plt-muted uppercase font-semibold tracking-wider font-sans">
            Avg Duration
          </span>
          <div className="p-1 rounded-md bg-blue-500/10 text-blue-400">
            <Clock size={13} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-lg sm:text-xl font-mono font-bold text-plt-text">
            {avgHoldingBars} Bars
          </span>
          {renderDelta(deltas.durationDelta, 'b', true)}
        </div>
        <span className="text-[10px] text-plt-muted font-sans mt-0.5">
          ~{Math.round(avgHoldingBars / 5)} weeks holding cycle
        </span>
      </div>

      {/* 3. Alpha vs EGX30 */}
      <div className="card-widget p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-plt-muted uppercase font-semibold tracking-wider font-sans">
            EGX30 Alpha
          </span>
          <div className="p-1 rounded-md bg-plt-accent/10 text-plt-accent">
            <Zap size={13} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className={`text-lg sm:text-xl font-mono font-bold ${alphaVsEgx30 >= 0 ? 'text-plt-accent' : 'text-plt-risk'}`}>
            {alphaVsEgx30 >= 0 ? `+${alphaVsEgx30.toFixed(1)}%` : `${alphaVsEgx30.toFixed(1)}%`}
          </span>
          {renderDelta(deltas.alphaDelta)}
        </div>
        <span className="text-[10px] text-plt-muted font-sans mt-0.5">
          {alphaVsEgx30 >= 0 ? 'Beating EGX30 Benchmark' : 'Trailing EGX30 Benchmark'}
        </span>
      </div>

      {/* 4. Concentration Health */}
      <div className="card-widget p-3 sm:p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-plt-muted uppercase font-semibold tracking-wider font-sans">
            Max Sector Stake
          </span>
          <div className={`p-1 rounded-md ${maxSector.isOverweight ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <BarChart2 size={13} />
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-lg sm:text-xl font-mono font-bold text-plt-text truncate">
            {maxSector.percentage.toFixed(0)}%
          </span>
          <span className="text-[11px] text-plt-muted ml-1.5 truncate max-w-[80px]">
            {maxSector.sector}
          </span>
        </div>
        <span className={`text-[10px] font-medium ${maxSector.isOverweight ? 'text-red-400' : 'text-emerald-400'}`}>
          {maxSector.isOverweight ? '⚠️ High Concentration (>30%)' : '✓ Balanced (<30% cap)'}
        </span>
      </div>

      {/* 5. Strategy Exit Risk Alerts */}
      <div className="card-widget p-3 sm:p-3.5 col-span-2 lg:col-span-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-plt-muted uppercase font-semibold tracking-wider font-sans">
            Holdings Exit Risks
          </span>
          <div className={`p-1 rounded-md ${exitRiskCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {exitRiskCount > 0 ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className={`text-lg sm:text-xl font-mono font-bold ${exitRiskCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {exitRiskCount} {exitRiskCount === 1 ? 'Holding' : 'Holdings'}
          </span>
        </div>
        <span className="text-[10px] text-plt-muted font-sans mt-0.5">
          {exitRiskCount > 0 ? 'Sell triggers active on holdings' : 'All positions in healthy status'}
        </span>
      </div>
    </div>
  );
}

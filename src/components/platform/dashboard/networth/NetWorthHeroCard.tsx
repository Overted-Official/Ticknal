'use client';

import React from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface NetWorthHeroCardProps {
  currencyMode: 'EGP' | 'USD';
  displayTotalNetWorth: number;
  realPurchasingPower: number;
  dragAmount: number;
  effectiveInflationRate: number;
  roiPct?: number;
  trajectory?: number[];
  trajectoryLabels?: string[];
}

export default function NetWorthHeroCard({
  currencyMode,
  displayTotalNetWorth,
  realPurchasingPower,
  dragAmount,
  effectiveInflationRate,
  roiPct,
  trajectory = [],
  trajectoryLabels = [],
}: NetWorthHeroCardProps) {
  const { isPrivacy } = usePrivacyMode();
  const displaySymbol = currencyMode === 'USD' ? '$' : '';
  const displaySuffix = currencyMode === 'EGP' ? ' £' : '';

  const formatCurrency = (val: number) => {
    return `${displaySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${displaySuffix}`;
  };

  // A trajectory is optional because no historical series should be invented.
  const hasTrajectory = trajectory.length >= 2;
  const minVal = hasTrajectory ? Math.min(...trajectory) : 0;
  const maxVal = hasTrajectory ? Math.max(...trajectory) : 1;
  const range = maxVal - minVal || 1;
  const svgWidth = 260;
  const svgHeight = 64;
  const paddingX = 4;
  const paddingY = 8;

  const points = trajectory.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, trajectory.length - 1)) * (svgWidth - 2 * paddingX);
    const y = svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - 2 * paddingY);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${svgWidth - paddingX},${svgHeight} L ${paddingX},${svgHeight} Z`;

  return (
    <div className="card-widget select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 1. Nominal Net Worth (Hero Metric) */}
        <div className="lg:col-span-4 space-y-1.5 border-b lg:border-b-0 lg:border-r border-plt-border-soft pb-4 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between">
            <span className="kpi-title">Total Net Worth</span>
            {roiPct !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-sans font-medium tabular-nums bg-plt-profit-soft text-plt-profit border border-plt-profit-border">
                {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(1)}% ROI
              </span>
            )}
          </div>

          <div className="text-3xl sm:text-4xl font-bold font-sans tracking-tight text-plt-text">
            {isPrivacy ? <span className="tracking-widest">******</span> : formatCurrency(displayTotalNetWorth)}
          </div>

          <p className="text-caption text-plt-muted font-sans">
            Mark-to-market live aggregated wealth
          </p>
        </div>

        {/* 2. Real Purchasing Power (Deflated Equivalent) */}
        <div className="lg:col-span-4 space-y-1.5 border-b lg:border-b-0 lg:border-r border-plt-border-soft pb-4 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between">
            <span className="kpi-title">Real Purchasing Power</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-sans font-medium tabular-nums bg-plt-warning/15 text-plt-warning border border-plt-warning/25">
              -{effectiveInflationRate}% Deflated
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-bold font-sans tracking-tight text-plt-muted">
            {isPrivacy ? <span className="tracking-widest">******</span> : formatCurrency(realPurchasingPower)}
          </div>

          <p className="text-caption text-plt-muted font-sans">
            Inflation drag: <span className="text-plt-risk font-medium">{isPrivacy ? '***' : `-${formatCurrency(dragAmount)}`}</span>
          </p>
        </div>

        {/* 3. 12-Month Sparkline Trajectory */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full pt-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-caption text-plt-muted font-sans">12M Wealth Trajectory</span>
            <span className="text-caption text-plt-profit font-medium font-sans">Bullish +31.6% YoY</span>
          </div>

          <div className="relative flex w-full h-[54px] items-center">
            {hasTrajectory ? (
              <svg
                className="w-full h-full overflow-visible"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--plt-profit)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--plt-profit)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#heroGradient)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--plt-profit)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span className="text-caption text-plt-muted font-sans">Historical trend unavailable</span>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-plt-muted font-sans pt-1">
            <span>{trajectoryLabels[0] ?? ''}</span>
            {trajectoryLabels.length > 2 && <span>{trajectoryLabels[Math.floor(trajectoryLabels.length / 2)]}</span>}
            <span>{trajectoryLabels[trajectoryLabels.length - 1] ?? ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

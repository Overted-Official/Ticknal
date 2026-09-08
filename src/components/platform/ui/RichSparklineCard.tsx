'use client';

import React from 'react';
import { LucideIcon } from '@/components/ui/icon-library';

export interface SparklinePoint {
  label: string;
  value: number;
}

export interface RichSparklineCardProps {
  title: string;
  value: string | React.ReactNode;
  icon?: LucideIcon;
  changeBadge?: {
    text: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  meta?: string;
  sparklineTitle?: string;
  sparklineData?: Array<number | null | undefined>;
  sparklineLabels?: string[];
  colorVariant?: 'profit' | 'risk' | 'orange' | 'info' | 'violet' | 'neutral';
  isPrivacy?: boolean;
}

export default function RichSparklineCard({
  title,
  value,
  icon: Icon,
  changeBadge,
  meta,
  sparklineTitle = 'Historical Trend',
  sparklineData = [],
  sparklineLabels = ['Jan', 'Jul'],
  colorVariant = 'orange',
  isPrivacy = false,
}: RichSparklineCardProps) {
  // A missing history is different from a zero-valued history. Do not draw a
  // fabricated trend when the source has no observations for this metric.
  const trend = sparklineData.filter((value): value is number => Number.isFinite(value));
  const hasTrend = trend.length >= 2;
  const minVal = Math.min(...trend);
  const maxVal = Math.max(...trend);
  const range = maxVal - minVal || 1;

  const svgWidth = 240;
  const svgHeight = 54;
  const paddingX = 4;
  const paddingY = 6;

  const points = trend.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (svgWidth - 2 * paddingX);
    const y = svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - 2 * paddingY);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${svgWidth - paddingX},${svgHeight} L ${paddingX},${svgHeight} Z`;

  const colorConfig = {
    profit: {
      stroke: 'var(--plt-profit)',
      fillStart: 'color-mix(in srgb, var(--plt-profit) 50%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-profit) 4%, transparent)',
      pillBg: 'bg-plt-profit-soft text-plt-profit border-plt-profit-border',
      iconColor: 'text-plt-profit',
    },
    risk: {
      stroke: 'var(--plt-risk)',
      fillStart: 'color-mix(in srgb, var(--plt-risk) 50%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-risk) 4%, transparent)',
      pillBg: 'bg-plt-risk-soft text-plt-risk border-plt-risk-border',
      iconColor: 'text-plt-risk',
    },
    orange: {
      stroke: 'var(--plt-text-primary)',
      fillStart: 'color-mix(in srgb, var(--plt-text-primary) 30%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-text-primary) 4%, transparent)',
      pillBg: 'bg-white/[0.08] text-white border-white/[0.15]',
      iconColor: 'text-white',
    },
    info: {
      stroke: 'var(--plt-info)',
      fillStart: 'color-mix(in srgb, var(--plt-info) 50%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-info) 4%, transparent)',
      pillBg: 'bg-plt-info-soft text-plt-info border-plt-info-border',
      iconColor: 'text-plt-info',
    },
    violet: {
      stroke: 'var(--plt-violet)',
      fillStart: 'color-mix(in srgb, var(--plt-violet) 50%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-violet) 4%, transparent)',
      pillBg: 'bg-plt-violet-soft text-plt-violet border-plt-violet-border',
      iconColor: 'text-plt-violet',
    },
    neutral: {
      stroke: 'var(--plt-text-muted)',
      fillStart: 'color-mix(in srgb, var(--plt-text-muted) 35%, transparent)',
      fillEnd: 'color-mix(in srgb, var(--plt-text-muted) 2%, transparent)',
      pillBg: 'bg-plt-hover text-plt-muted border-plt-border-soft',
      iconColor: 'text-plt-muted',
    },
  }[colorVariant];

  const gradientId = `grad_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${colorVariant}`;

  return (
    <div className="card-widget card-widget-hover flex flex-col justify-between select-none group">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="kpi-title">
          {title}
        </span>
        {Icon && <Icon size={15} className={colorConfig.iconColor} />}
      </div>

      {/* 2. Main Value */}
      <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-plt-text mt-1">
        {isPrivacy ? <span className="tracking-widest">******</span> : value}
      </div>

      {/* 3. Badge + Meta Line */}
      <div className="flex items-center gap-2 mt-2 flex-wrap min-w-0">
        {changeBadge && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-sans font-semibold border flex items-center gap-1 shrink-0 ${
              changeBadge.isNeutral
                ? 'bg-plt-hover text-plt-muted border-plt-border-soft'
                : changeBadge.isPositive
                ? 'bg-plt-profit-soft text-plt-profit border-plt-profit-border'
                : 'bg-plt-risk-soft text-plt-risk border-plt-risk-border'
            }`}
          >
            <span>{changeBadge.text}</span>
            {changeBadge.isPositive && <span>↗</span>}
            {!changeBadge.isPositive && !changeBadge.isNeutral && <span>↘</span>}
          </span>
        )}
        {meta && (
          <span className="text-[11px] text-plt-muted font-sans truncate">
            {meta}
          </span>
        )}
      </div>

      {/* 4. Sparkline Area Chart */}
      <div className="mt-3 pt-2 border-t border-plt-border-soft/60">
        <div className="flex items-center justify-between text-[10px] font-sans text-plt-muted font-medium mb-1">
          <span>{sparklineTitle}</span>
        </div>

        <div className="w-full h-12 relative overflow-hidden">
          {hasTrend ? (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colorConfig.fillStart} />
                  <stop offset="100%" stopColor={colorConfig.fillEnd} />
                </linearGradient>
              </defs>

              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path
                d={linePath}
                fill="none"
                stroke={colorConfig.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="flex h-full items-center text-[10px] text-plt-muted/70 font-sans">
              Trend unavailable
            </div>
          )}
        </div>

        {/* Month labels at bottom */}
        {sparklineLabels.length >= 2 && (
          <div className="flex justify-between text-[9px] font-sans text-plt-muted/70 pt-1">
            <span>{sparklineLabels[0]}</span>
            {sparklineLabels.length > 2 && <span>{sparklineLabels[1]}</span>}
            <span>{sparklineLabels[sparklineLabels.length - 1]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

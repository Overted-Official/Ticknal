'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type LucideIcon } from '@/components/ui/icon-library';

export interface KPICardProps {
  id: string;
  title: string;
  shortTitle?: string;
  icon: LucideIcon;
  logoUrl?: string | null;
  iconBgClass?: string;
  iconColorClass?: string;
  value: string;
  unit?: string;
  badgeText?: string;
  badgeClass?: string;
  changeText?: string;
  changeColorClass?: string;
  metaText?: string;
  metaClass?: string;
  sparklinePoints?: number[];
  sparklineTrend?: 'up' | 'down' | 'neutral';
  showSparkline?: boolean;
  targetId?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function KPICard({
  id,
  title,
  shortTitle,
  icon: Icon,
  logoUrl,
  iconBgClass = 'bg-brand-blue text-white',
  iconColorClass = 'text-white',
  value,
  unit,
  badgeText,
  badgeClass = 'text-zinc-500 font-medium text-[9px]',
  changeText,
  changeColorClass = 'text-profit-num',
  metaText,
  metaClass = 'text-zinc-500',
  sparklinePoints,
  sparklineTrend = 'up',
  showSparkline = true,
  targetId,
  href,
  onClick,
  className = '',
}: KPICardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      router.push(href);
      return;
    }
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Generate edge-to-edge sparkline path coordinates strictly confined below text
  const sparklineData = useMemo(() => {
    const pts = sparklinePoints;
    if (!pts || pts.length < 2) {
      return null;
    }

    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const width = 95;
    const height = 32;
    const paddingTop = 6;
    const paddingBottom = 4;
    const innerHeight = height - paddingTop - paddingBottom;

    // Line starts at x=0, ends precisely at x=95 (the exact center of the endpoint dot)
    const coords = pts.map((val, idx) => {
      const x = (idx / (pts!.length - 1)) * width;
      const normalizedY = max === min ? 0.5 : (val - min) / range;
      const y = paddingTop + (1 - normalizedY) * innerHeight;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const linePath = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
    const firstPt = coords[0];
    const lastPt = coords[coords.length - 1];
    // Fill drops straight down from line endpoint to bottom corners
    const areaPath = `${linePath} L ${lastPt.x} ${height} L 0 ${height} Z`;

    const strokeColor =
      sparklineTrend === 'up'
        ? 'var(--color-profit-num)'
        : sparklineTrend === 'down'
        ? 'var(--color-loss-num)'
        : 'var(--color-accent-cyan)';

    return {
      linePath,
      areaPath,
      lastPt,
      strokeColor,
    };
  }, [sparklinePoints, sparklineTrend]);

  return (
    <div
      id={`kpi-${id}`}
      onClick={handleClick}
      className={`kpi-card-root ${!showSparkline ? '!h-auto min-h-[108px] sm:min-h-[114px] justify-between pb-3.5' : ''} ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* 1. Top row: Solid Circle Icon + Full Title */}
      <div className="flex items-center justify-between gap-1.5 w-full z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBgClass} overflow-hidden`}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className={`w-3 h-3 ${iconColorClass}`} strokeWidth={2.4} />
            )}
          </div>
          <span
            className="text-[13px] font-semibold text-white tracking-tight truncate"
            title={title}
          >
            {shortTitle ? (
              <>
                <span className="sm:hidden">{shortTitle}</span>
                <span className="hidden sm:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </span>
        </div>

        {badgeText && (
          <span
            className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold leading-none ${badgeClass}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* 2. Middle row: Value (bold large) + Unit (e.g. £, %, BARS) - Positioned directly under header in upper card */}
      <div className="flex flex-col mt-2.5 z-10">
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-[20px] font-bold text-white tabular-nums tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
              {unit}
            </span>
          )}
        </div>

        {/* 3. Change row: Single clean line directly under value */}
        <div className="flex items-baseline gap-1.5 mt-1.5 leading-none">
          {changeText && (
            <span className={`text-[12px] font-medium tabular-nums ${changeColorClass}`}>
              {changeText}
            </span>
          )}
          {metaText && (
            <span className={`text-[11px] truncate text-zinc-400 font-normal ${metaClass}`}>
              {metaText}
            </span>
          )}
        </div>
      </div>

      {/* 4. Bottom Edge-to-Edge Sparkline Area Graph (Dedicated 48px height, 0 side/bottom padding, zero text overlap) */}
      {showSparkline && sparklineData && (
        <div className="absolute inset-x-0 bottom-0 h-12 w-full overflow-hidden rounded-b-2xl pointer-events-none">
          <svg viewBox="0 0 100 32" className="w-full h-full block" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`kpi-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineData.strokeColor} stopOpacity={0.32} />
                <stop offset="100%" stopColor={sparklineData.strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <path d={sparklineData.areaPath} fill={`url(#kpi-grad-${id})`} />
            <path
              d={sparklineData.linePath}
              fill="none"
              stroke={sparklineData.strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Endpoint glowing dot - True 1:1 circle, centered precisely on the sparkline line endpoint */}
          <div
            className="absolute w-[7px] h-[7px] rounded-full pointer-events-none"
            style={{
              left: `${sparklineData.lastPt.x}%`,
              top: `${(sparklineData.lastPt.y / 32) * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: sparklineData.strokeColor,
              boxShadow: `0 0 5px ${sparklineData.strokeColor}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

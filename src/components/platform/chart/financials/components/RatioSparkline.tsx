'use client';

import React from 'react';

export interface RatioSparklineProps {
  values: (number | null | undefined)[];
  width?: number;
  height?: number;
  isInverseTrend?: boolean; // if true, decreasing values are considered positive (e.g. Debt ratios)
  className?: string;
}

export default function RatioSparkline({
  values = [],
  width = 56,
  height = 18,
  isInverseTrend = false,
  className = '',
}: RatioSparklineProps) {
  // Filter valid numbers in chronological sequence
  const validPoints = values.filter(
    (v): v is number => v != null && !Number.isNaN(v)
  );

  if (validPoints.length < 2) {
    return (
      <div
        data-testid="ratio-sparkline-empty"
        className={`flex items-center justify-center text-plt-muted text-[10px] select-none ${className}`}
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;

  const padX = 3;
  const padY = 3;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const stepX = usableWidth / (validPoints.length - 1);

  const coordinates = validPoints.map((val, idx) => {
    const x = padX + idx * stepX;
    const y = padY + usableHeight - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  const pointsString = coordinates
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');

  const firstVal = validPoints[0];
  const lastVal = validPoints[validPoints.length - 1];
  const delta = lastVal - firstVal;

  let strokeColor = 'var(--plt-muted, #71717a)';
  if (Math.abs(delta) > 0.001) {
    const isImproving = isInverseTrend ? delta < 0 : delta > 0;
    strokeColor = isImproving ? 'var(--plt-profit, #10b981)' : 'var(--plt-risk, #ef4444)';
  }

  const lastCoord = coordinates[coordinates.length - 1];

  return (
    <div
      data-testid="ratio-sparkline"
      className={`inline-flex items-center shrink-0 ${className}`}
      style={{ width, height }}
      title={`Trend: ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsString}
        />
        <circle
          cx={lastCoord.x}
          cy={lastCoord.y}
          r="2"
          fill={strokeColor}
        />
      </svg>
    </div>
  );
}

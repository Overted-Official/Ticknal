'use client';

import React, { useId } from 'react';

export interface SparklineProps {
  data: number[];
  height?: number;
  width?: number | string;
  color?: string;
  showGradient?: boolean;
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  height = 28,
  width = '100%',
  color = '#0099ff',
  showGradient = true,
  strokeWidth = 1.75,
  className = '',
}: SparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2; // pixel padding inside the SVG bounds
  const svgWidth = 120;
  const svgHeight = height;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * svgWidth;
    const y = svgHeight - padding - ((val - min) / range) * (svgHeight - padding * 2);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  // Construct line path
  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Construct closed area path for subtle gradient fill
  const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  return (
    <div
      className={`inline-block overflow-hidden pointer-events-none select-none ${className}`}
      style={{ width, height: `${height}px` }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {showGradient && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        )}

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current / latest point dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={strokeWidth + 0.5}
            fill={color}
          />
        )}
      </svg>
    </div>
  );
}

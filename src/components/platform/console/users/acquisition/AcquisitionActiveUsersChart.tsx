'use client';

import React, { useState, useMemo } from 'react';
import { Activity, TrendingUp, Calendar, Zap } from '@/components/ui/icon-library';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';

interface ActiveUsersChartProps {
  trendData: ConsoleAcquisitionStats['activeUsersTrend'];
}

export default function AcquisitionActiveUsersChart({ trendData }: ActiveUsersChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    label: string;
    activeUsers: number;
    sessions: number;
    x: number;
    y: number;
  } | null>(null);

  const { points, maxUsers, totalSessionsSum, avgDau } = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return { points: [], maxUsers: 1, totalSessionsSum: 0, avgDau: 0 };
    }

    const max = Math.max(...trendData.map((d) => d.activeUsers), 4);
    const totalSess = trendData.reduce((acc, d) => acc + d.sessions, 0);
    const avg = Math.round(trendData.reduce((acc, d) => acc + d.activeUsers, 0) / trendData.length);

    // SVG coordinate space: 500w x 200h (with padding: left 30, right 20, top 20, bottom 30)
    const chartW = 450;
    const chartH = 150;
    const padL = 35;
    const padT = 20;

    const pts = trendData.map((d, idx) => {
      const x = padL + (idx / Math.max(1, trendData.length - 1)) * chartW;
      const y = padT + chartH - (d.activeUsers / max) * chartH;
      return { ...d, x, y };
    });

    return { points: pts, maxUsers: max, totalSessionsSum: totalSess, avgDau: avg };
  }, [trendData]);

  // Construct SVG path string for the line and the gradient area
  const { pathD, areaD } = useMemo(() => {
    if (points.length === 0) return { pathD: '', areaD: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        pathD: `M ${p.x},${p.y} L ${p.x + 10},${p.y}`,
        areaD: `M ${p.x},170 L ${p.x},${p.y} L ${p.x + 10},${p.y} L ${p.x + 10},170 Z`,
      };
    }

    let line = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier spline
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      line += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L ${last.x},170 L ${first.x},170 Z`;

    return { pathD: line, areaD: area };
  }, [points]);

  return (
    <div className="w-full h-full bg-surface-base border border-border-default rounded-none overflow-hidden font-sans select-none flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between gap-3 bg-surface-base shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-profit-num" />
          <h4 className="text-xs font-semibold text-text-primary tracking-tight">
            Active Traders (DAU Engagement)
          </h4>
        </div>
        <span className="text-[10px] text-text-muted">Daily Active Sessions</span>
      </div>

      {/* Body: SVG Chart Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="relative w-full aspect-[16/7] max-h-[190px]">
          <svg viewBox="0 0 500 200" className="w-full h-full block overflow-visible">
            <defs>
              <linearGradient id="dauAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Hairline Grid Lines */}
            <g stroke="#222225" strokeWidth="1" strokeDasharray="2,2">
              <line x1="35" y1="20" x2="485" y2="20" />
              <line x1="35" y1="95" x2="485" y2="95" />
              <line x1="35" y1="170" x2="485" y2="170" />
            </g>

            {/* Y-axis Labels */}
            <text x="28" y="24" textAnchor="end" fill="#787b86" fontSize="9" className="tabular-nums">
              {maxUsers}
            </text>
            <text x="28" y="99" textAnchor="end" fill="#787b86" fontSize="9" className="tabular-nums">
              {Math.round(maxUsers / 2)}
            </text>
            <text x="28" y="174" textAnchor="end" fill="#787b86" fontSize="9" className="tabular-nums">
              0
            </text>

            {/* Shaded Area */}
            {areaD && <path d={areaD} fill="url(#dauAreaGrad)" />}

            {/* Spline Path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((pt, idx) => (
              <g
                key={`pt-${idx}`}
                className="cursor-pointer group"
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: pt.date,
                    label: pt.label,
                    activeUsers: pt.activeUsers,
                    sessions: pt.sessions,
                    x: pt.x,
                    y: pt.y,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="10"
                  fill="transparent"
                  className="hover:stroke-brand-blue/30 hover:stroke-[4]"
                />
              </g>
            ))}
          </svg>

          {/* Interactive Point Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                left: `${(hoveredPoint.x / 500) * 100}%`,
                top: `${(hoveredPoint.y / 200) * 100}%`,
              }}
              className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-full mb-2 bg-surface-raised/95 backdrop-blur-md border border-border-hover px-2.5 py-1.5 rounded-md shadow-2xl text-[11px] font-sans text-text-primary whitespace-nowrap"
            >
              <div className="font-semibold text-text-primary text-xs">{hoveredPoint.label}</div>
              <div className="text-brand-blue font-medium tabular-nums mt-0.5">
                {hoveredPoint.activeUsers} Active Traders · {hoveredPoint.sessions} sessions
              </div>
            </div>
          )}
        </div>

        {/* Micro-Metrics Rail */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle/50 mt-2">
          <div className="p-2 rounded bg-surface-input border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Average DAU</div>
            <div className="text-xs font-semibold text-text-primary tabular-nums mt-0.5">
              {avgDau} Traders / day
            </div>
          </div>
          <div className="p-2 rounded bg-surface-input border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Total Dwell Volume</div>
            <div className="text-xs font-semibold text-text-primary tabular-nums mt-0.5">
              {totalSessionsSum} Sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

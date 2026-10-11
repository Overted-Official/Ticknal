'use client';

import React, { useState, useMemo } from 'react';

export interface PlatformActivityDataPoint {
  key: string;
  label: string;
  sublabel?: string;
  sessions: number;
  users: number;
}

interface PlatformActivitySvgChartProps {
  dataset: PlatformActivityDataPoint[];
  granularity: 'daily' | 'monthly' | 'hourly';
  maxVal: number;
}

export default function PlatformActivitySvgChart({
  dataset,
  granularity,
  maxVal,
}: PlatformActivitySvgChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    sublabel?: string;
    sessions: number;
    users: number;
    x: number;
    y: number;
  } | null>(null);

  // End-to-end coordinate space: 1000 width, 180 height
  const totalW = 1000;
  const padT = 20;
  const chartH = 135;
  const baseY = 155;

  const points = useMemo(() => {
    if (!dataset || dataset.length === 0) return [];
    return dataset.map((d, idx) => {
      // Extends strictly from 0 to totalW (end to end)
      const x = (idx / Math.max(1, dataset.length - 1)) * totalW;
      const y = padT + chartH - (d.sessions / maxVal) * chartH;
      return { ...d, x, y };
    });
  }, [dataset, maxVal]);

  const { pathD, areaD } = useMemo(() => {
    if (points.length === 0) return { pathD: '', areaD: '' };

    if (points.length === 1) {
      const p = points[0];
      return {
        pathD: `M 0,${p.y} L ${totalW},${p.y}`,
        areaD: `M 0,${baseY} L 0,${p.y} L ${totalW},${p.y} L ${totalW},${baseY} Z`,
      };
    }

    let line = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
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
    const area = `${line} L ${last.x},${baseY} L ${first.x},${baseY} Z`;

    return { pathD: line, areaD: area };
  }, [points]);

  return (
    <div className="relative w-full aspect-[24/5] min-h-[175px] max-h-[220px]">
      <svg viewBox="0 0 1000 180" className="w-full h-full block overflow-visible">
        <defs>
          <linearGradient id="platformActivityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-blue)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-blue)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Hairline Gridlines running end to end */}
        <g className="stroke-border-default" strokeWidth="1" strokeDasharray="2,2">
          <line x1="0" y1="20" x2="1000" y2="20" />
          <line x1="0" y1="87" x2="1000" y2="87" />
          <line x1="0" y1="155" x2="1000" y2="155" />
        </g>

        {/* Y-axis Numeric Labels floating above gridlines on the left */}
        <g className="fill-text-muted text-[10px] tabular-nums" textAnchor="start">
          <text x="20" y="16">
            {maxVal}
          </text>
          <text x="20" y="83">
            {Math.round(maxVal / 2)}
          </text>
          <text x="20" y="151">
            0
          </text>
        </g>

        {/* Shaded Area extending end to end */}
        {areaD && <path d={areaD} fill="url(#platformActivityGrad)" />}

        {/* Spline Line extending end to end */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            className="stroke-brand-blue"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Interactive Data Nodes */}
        {points.map((pt, idx) => {
          // Clamp center circle slightly so edge nodes stay fully within viewport
          const cx = Math.max(4, Math.min(996, pt.x));
          return (
            <g
              key={`pt-${pt.key || idx}`}
              className="cursor-pointer"
              onMouseEnter={() =>
                setHoveredPoint({
                  label: pt.label,
                  sublabel: pt.sublabel,
                  sessions: pt.sessions,
                  users: pt.users,
                  x: pt.x,
                  y: pt.y,
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={cx}
                cy={pt.y}
                r={points.length > 30 ? (pt.sessions > 0 ? 2.5 : 1.5) : 3.5}
                className={
                  pt.sessions > 0
                    ? 'fill-white stroke-brand-blue'
                    : 'fill-brand-blue stroke-brand-blue'
                }
                strokeWidth="1.5"
              />
              <circle
                cx={cx}
                cy={pt.y}
                r="14"
                fill="transparent"
                className="hover:stroke-brand-blue/30 hover:stroke-[4]"
              />
            </g>
          );
        })}

        {/* X-axis Ticks extending end to end */}
        {granularity === 'hourly' && (
          <g className="fill-text-muted text-[9.5px] tabular-nums">
            <text x="20" y="172" textAnchor="start">12 AM</text>
            <text x="175" y="172" textAnchor="middle">4 AM</text>
            <text x="335" y="172" textAnchor="middle">8 AM</text>
            <text x="500" y="172" textAnchor="middle">12 PM</text>
            <text x="665" y="172" textAnchor="middle">4 PM</text>
            <text x="825" y="172" textAnchor="middle">8 PM</text>
            <text x="980" y="172" textAnchor="end">11 PM</text>
          </g>
        )}

        {granularity === 'monthly' && points.length > 0 && (
          <g className="fill-text-muted text-[9.5px] tabular-nums">
            {points.map((p, idx) => {
              const anchor =
                idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle';
              const xPos =
                idx === 0 ? 20 : idx === points.length - 1 ? 980 : p.x;
              return (
                <text key={p.key} x={xPos} y="172" textAnchor={anchor}>
                  {p.label}
                </text>
              );
            })}
          </g>
        )}

        {granularity === 'daily' && points.length > 0 && (
          <g className="fill-text-muted text-[9.5px] tabular-nums">
            <text x="20" y="172" textAnchor="start">
              {points[0].label}
            </text>
            {points.length > 1 && (
              <text x="500" y="172" textAnchor="middle">
                {points[Math.floor(points.length / 2)].label}
              </text>
            )}
            {points.length > 2 && (
              <text x="980" y="172" textAnchor="end">
                {points[points.length - 1].label}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Hover Tooltip Popover with boundary-aware position */}
      {hoveredPoint && (
        <div
          style={{
            left: `${Math.max(2, Math.min(98, (hoveredPoint.x / 1000) * 100))}%`,
            top: `${(hoveredPoint.y / 180) * 100}%`,
          }}
          className={`absolute pointer-events-none z-30 -translate-y-full mb-2 bg-black/95 backdrop-blur-md border border-border-subtle px-3 py-2 rounded-lg shadow-2xl text-[11px] font-sans text-text-primary whitespace-nowrap ${
            hoveredPoint.x < 150
              ? 'translate-x-0'
              : hoveredPoint.x > 850
              ? '-translate-x-full'
              : '-translate-x-1/2'
          }`}
        >
          <div className="font-semibold text-text-primary text-xs">
            {hoveredPoint.sublabel || hoveredPoint.label}
          </div>
          <div className="text-text-muted text-[11px] tabular-nums mt-0.5 flex items-center gap-2">
            <span className="text-brand-blue font-medium">
              {hoveredPoint.sessions} {hoveredPoint.sessions === 1 ? 'session' : 'sessions'}
            </span>
            <span>·</span>
            <span className="text-text-secondary">
              {hoveredPoint.users} {hoveredPoint.users === 1 ? 'active user' : 'active users'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

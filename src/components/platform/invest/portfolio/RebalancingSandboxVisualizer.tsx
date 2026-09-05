'use client';

import React from 'react';
import {
  PieChart as PieChartIcon,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from '@/components/ui/icon-library';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PortfolioSectorStake } from '@/lib/portfolio-simulation';

const SECTOR_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#84cc16', // Lime
];

interface RebalancingSandboxVisualizerProps {
  liveSectors: PortfolioSectorStake[];
  simulatedSectors: PortfolioSectorStake[];
  isSandbox: boolean;
}

export default function RebalancingSandboxVisualizer({
  liveSectors,
  simulatedSectors,
  isSandbox,
}: RebalancingSandboxVisualizerProps) {
  const displayedSectors = isSandbox ? simulatedSectors : liveSectors;

  // Build comparison map
  const liveMap = new Map(liveSectors.map((s) => [s.sector, s.percentage]));
  const simMap = new Map(simulatedSectors.map((s) => [s.sector, s.percentage]));
  const allSectors = Array.from(new Set([...liveMap.keys(), ...simMap.keys()]));

  const comparison = allSectors.map((sector) => {
    const livePct = liveMap.get(sector) ?? 0;
    const simPct = simMap.get(sector) ?? 0;
    const delta = simPct - livePct;

    return {
      sector,
      livePct,
      simPct,
      delta: Number(delta.toFixed(1)),
      isOverweight: (isSandbox ? simPct : livePct) >= 30,
    };
  }).sort((a, b) => (isSandbox ? b.simPct - a.simPct : b.livePct - a.livePct));

  const overweightCount = comparison.filter((c) => c.isOverweight).length;

  return (
    <div className="card-widget p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-plt-border-soft pb-3">
        <div>
          <h3 className="widget-title flex items-center gap-2">
            <PieChartIcon size={16} className="text-plt-accent" />
            <span>Capital Allocation & Concentration Diagnostics</span>
            {isSandbox && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-plt-accent/15 text-plt-accent font-semibold flex items-center gap-1">
                <Sparkles size={11} />
                <span>Simulated Morph</span>
              </span>
            )}
          </h3>
          <p className="widget-subtitle mt-0.5">
            {isSandbox
              ? 'Real-time allocation shifts across sectors based on your staged changes'
              : 'Current portfolio weight distribution across market sectors'}
          </p>
        </div>

        {/* Health status badge */}
        <div>
          {overweightCount > 0 ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>{overweightCount} Overweight Sector (&gt;30% cap)</span>
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck size={13} />
              <span>Healthy Sector Diversification</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid: Donut + Progress Comparison Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 h-[220px] flex items-center justify-center relative">
          {displayedSectors.length === 0 ? (
            <div className="text-xs text-plt-muted">No allocation data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayedSectors}
                  dataKey="value"
                  nameKey="sector"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {displayedSectors.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.sector}`}
                      fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1.5}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as PortfolioSectorStake;
                    return (
                      <div className="p-2 rounded-xl bg-plt-card border border-plt-border-soft shadow-xl text-xs font-mono">
                        <div className="font-bold text-plt-text font-sans">{d.sector}</div>
                        <div className="text-plt-profit font-semibold mt-0.5">{d.percentage.toFixed(1)}%</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-plt-muted font-sans uppercase">
              {isSandbox ? 'Simulated' : 'Live'}
            </span>
            <span className="text-base font-bold font-mono text-plt-text">
              {displayedSectors.length} Sectors
            </span>
          </div>
        </div>

        {/* Before vs. After Bars (7 Cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-plt-muted uppercase tracking-wider px-1">
            <span>Sector Exposure</span>
            <span>{isSandbox ? 'Live → Staged Shift' : 'Current Allocation'}</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
            {comparison.map((item, idx) => {
              const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
              const displayPct = isSandbox ? item.simPct : item.livePct;

              return (
                <div
                  key={item.sector}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    item.isOverweight
                      ? 'bg-red-500/5 border-red-500/25'
                      : 'bg-plt-card border-plt-border-soft hover:border-plt-border'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-bold text-plt-text font-sans truncate">{item.sector}</span>
                      {item.isOverweight && (
                        <span className="text-[9px] text-red-400 font-semibold px-1 rounded bg-red-500/10 border border-red-500/20">
                          OVERWEIGHT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSandbox ? (
                        <>
                          <span className="text-plt-muted">{item.livePct.toFixed(1)}%</span>
                          <ArrowRight size={11} className="text-plt-muted" />
                          <span className="font-bold text-plt-text">{item.simPct.toFixed(1)}%</span>
                          {item.delta !== 0 && (
                            <span
                              className={`text-[10px] font-bold ${
                                item.delta > 0 ? 'text-plt-profit' : 'text-plt-risk'
                              }`}
                            >
                              ({item.delta > 0 ? '+' : ''}{item.delta}%)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-plt-text">{item.livePct.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-1.5 rounded-full bg-plt-border-soft overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.isOverweight ? 'bg-red-500' : ''
                      }`}
                      style={{
                        width: `${Math.min(100, displayPct)}%`,
                        backgroundColor: item.isOverweight ? undefined : color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

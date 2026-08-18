"use client";

import React, { useState } from 'react';
import type { SectorPerformanceItem } from '@/lib/sectors-handlers';
import { TrendingUp, Zap, AlertTriangle, TrendingDown, Info } from 'lucide-react';

interface SectorRotationMatrixProps {
  sectors: SectorPerformanceItem[];
  selectedSector: string | null;
  onSelectSector: (sector: string) => void;
}

// Generate short 3-letter acronym for sector badges
function getSectorAcronym(name: string): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export default function SectorRotationMatrix({
  sectors,
  selectedSector,
  onSelectSector,
}: SectorRotationMatrixProps) {
  const [hoveredData, setHoveredData] = useState<{
    sector: SectorPerformanceItem;
    x: number;
    y: number;
    nodeSize: number;
  } | null>(null);

  // Filter out extreme outliers (like 'Other' with 600%+) from stretching the scale
  const validSectors = sectors.filter((s) => s.stockCount > 0);
  
  // Calculate relative alpha (X) and momentum spread (Y)
  // X = Relative Strength vs EGX30 Benchmark
  // Y = Momentum Spread (Turnover-Weighted Return - Equal-Weighted Return)
  const dataPoints = validSectors.map((s) => {
    const alpha = s.relativeStrengthVsBenchmark;
    // Calculate momentum spread
    const equalReturn = s.stocks.length > 0 
      ? s.stocks.reduce((sum, st) => sum + st.returnPct, 0) / s.stocks.length 
      : 0;
    const momentum = s.turnoverWeightedReturn - equalReturn;

    return {
      sector: s,
      alpha,
      momentum,
    };
  });

  // Calculate dynamic axis limits centered at 0
  const maxAbsAlpha = Math.max(
    ...dataPoints.map((d) => Math.min(Math.abs(d.alpha), 150)), // soft-clamp at 150%
    30
  );
  const maxAbsMomentum = Math.max(
    ...dataPoints.map((d) => Math.min(Math.abs(d.momentum), 100)), // soft-clamp at 100%
    20
  );

  return (
    <div className="relative w-full h-full min-h-[420px] bg-black/40 rounded-xl overflow-hidden border border-white/[0.08] p-4 flex flex-col justify-between select-none">
      {/* 4 Quadrants Ambient Background (Tinted per category) */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
        {/* Top-Left: Improving (Cyan) */}
        <div className="border-r border-b border-white/[0.08] bg-gradient-to-br from-cyan-500/[0.10] via-cyan-500/[0.03] to-transparent flex items-start p-3">
          <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
            <Zap size={12} className="text-cyan-400" /> Improving (Accumulate)
          </span>
        </div>

        {/* Top-Right: Leading (Emerald) */}
        <div className="border-b border-white/[0.08] bg-gradient-to-bl from-emerald-500/[0.10] via-emerald-500/[0.03] to-transparent flex items-start justify-end p-3">
          <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
            <TrendingUp size={12} className="text-emerald-400" /> Leading (Alpha Wave)
          </span>
        </div>

        {/* Bottom-Left: Lagging (Rose) */}
        <div className="border-r border-white/[0.08] bg-gradient-to-tr from-rose-500/[0.10] via-rose-500/[0.03] to-transparent flex items-end p-3">
          <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-rose-500/30 text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
            <TrendingDown size={12} className="text-rose-400" /> Lagging (Avoid)
          </span>
        </div>

        {/* Bottom-Right: Weakening (Amber) */}
        <div className="bg-gradient-to-tl from-amber-500/[0.10] via-amber-500/[0.03] to-transparent flex items-end justify-end p-3">
          <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
            <AlertTriangle size={12} className="text-amber-400" /> Weakening (Take Profit)
          </span>
        </div>
      </div>

      {/* Axis Crosshairs (Centered at Benchmark 0 Alpha / 0 Momentum) */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/15 pointer-events-none" />
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/15 pointer-events-none" />

      {/* Axis Center Benchmark Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-white/20 px-2 py-0.5 rounded-full text-[9px] font-mono text-white/50 pointer-events-none z-10">
        EGX 30 Benchmark
      </div>

      {/* Interactive Sector Nodes */}
      <div className="relative w-full h-full">
        {dataPoints.map(({ sector, alpha, momentum }) => {
          // X mapping: Center = 50%
          // alpha > 0 -> X in (50%, 92%)
          // alpha < 0 -> X in (8%, 50%)
          const clampedAlpha = Math.max(Math.min(alpha, maxAbsAlpha), -maxAbsAlpha);
          const normalizedX = 50 + (clampedAlpha / maxAbsAlpha) * 40;

          // Y mapping: Center = 50%
          // momentum > 0 (Up) -> Y in (8%, 50%)
          // momentum < 0 (Down) -> Y in (50%, 92%)
          const clampedMomentum = Math.max(Math.min(momentum, maxAbsMomentum), -maxAbsMomentum);
          const normalizedY = 50 - (clampedMomentum / maxAbsMomentum) * 40;

          const isSelected = selectedSector === sector.sector;
          const isHovered = hoveredData?.sector.sector === sector.sector;
          
          // Node size proportional to turnover share
          const nodeSize = Math.max(Math.min(sector.turnoverShare * 1.2 + 28, 54), 28);
          const acronym = getSectorAcronym(sector.sector);

          const regimeBg = {
            Leading: 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
            Improving: 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
            Weakening: 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
            Lagging: 'bg-rose-500/30 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
          }[sector.rotationRegime];

          return (
            <div
              key={sector.sector}
              style={{
                position: 'absolute',
                left: `${normalizedX}%`,
                top: `${normalizedY}%`,
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-plt-orange ring-offset-2 ring-offset-black z-30 scale-110'
                  : isHovered
                  ? 'scale-125 z-40 ring-1 ring-white/60'
                  : 'z-20 hover:scale-115'
              } ${regimeBg}`}
              onClick={() => onSelectSector(sector.sector)}
              onMouseEnter={() => setHoveredData({ sector, x: normalizedX, y: normalizedY, nodeSize })}
              onMouseLeave={() => setHoveredData(null)}
            >
              <span className="text-[10px] font-bold font-mono tracking-tight text-center leading-none">
                {acronym}
              </span>
            </div>
          );
        })}

        {/* Floating Tooltip positioned relative to hovered bubble */}
        {hoveredData && (
          <div
            style={{
              position: 'absolute',
              left: `${hoveredData.x}%`,
              top: hoveredData.y < 26
                ? `calc(${hoveredData.y}% + ${hoveredData.nodeSize / 2 + 10}px)`
                : `calc(${hoveredData.y}% - ${hoveredData.nodeSize / 2 + 10}px)`,
              transform: hoveredData.y < 26
                ? `translate(${hoveredData.x > 75 ? '-85%' : hoveredData.x < 25 ? '-15%' : '-50%'}, 0)`
                : `translate(${hoveredData.x > 75 ? '-85%' : hoveredData.x < 25 ? '-15%' : '-50%'}, -100%)`,
            }}
            className="z-50 bg-zinc-950/95 backdrop-blur-md border border-white/20 p-2.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-none whitespace-nowrap"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {hoveredData.sector.sector}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  ({hoveredData.sector.stockCount} stocks)
                </span>
              </div>
              <div className="text-[10px] font-mono text-white/60 mt-0.5">
                Turnover: {(hoveredData.sector.totalTurnover / 1_000_000).toFixed(1)}M EGP ({hoveredData.sector.turnoverShare.toFixed(1)}% of market)
              </div>
            </div>

            <div className="h-7 w-[1px] bg-white/10" />

            <div className="flex items-center gap-3 font-mono text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block">Alpha</span>
                <span className={`font-bold ${hoveredData.sector.relativeStrengthVsBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hoveredData.sector.relativeStrengthVsBenchmark > 0 ? '+' : ''}
                  {hoveredData.sector.relativeStrengthVsBenchmark.toFixed(1)}%
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block">ROI</span>
                <span className={`font-bold ${hoveredData.sector.turnoverWeightedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hoveredData.sector.turnoverWeightedReturn > 0 ? '+' : ''}
                  {hoveredData.sector.turnoverWeightedReturn.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Subtext Note */}
      <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-1">
          <Info size={11} />
          <span>Horizontal = Outperformance vs EGX 30 (Alpha) | Vertical = Capital Momentum</span>
        </div>
        <span>Click any sector bubble to inspect</span>
      </div>
    </div>
  );
}

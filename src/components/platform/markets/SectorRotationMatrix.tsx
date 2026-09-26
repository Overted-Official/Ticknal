"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { SectorPerformanceItem } from '@/lib/sectors-math';
import { TrendingUp, Zap, AlertTriangle, TrendingDown, Info, X } from '@/components/ui/icon-library';

interface SectorRotationMatrixProps {
  sectors: SectorPerformanceItem[];
  selectedSector: string | null;
  onSelectSector: (sector: string) => void;
}


export default function SectorRotationMatrix({
  sectors,
  selectedSector,
  onSelectSector,
}: SectorRotationMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });
  const [hoveredSector, setHoveredSector] = useState<SectorPerformanceItem | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeRegimeFilter, setActiveRegimeFilter] = useState<'Leading' | 'Improving' | 'Weakening' | 'Lagging' | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  // ResizeObserver for dynamic bounds
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(entry.contentRect.width, 300),
          height: Math.max(entry.contentRect.height, 350),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Strict pixel-bounded popover coordinates to eliminate cutoffs
  const tooltipStyle = useMemo(() => {
    const tooltipWidth = 320;
    const tooltipHeight = 220;
    let left = mousePos.x + 16;
    let top = mousePos.y + 16;

    if (left + tooltipWidth > dimensions.width - 12) {
      left = mousePos.x - tooltipWidth - 16;
    }
    if (top + tooltipHeight > dimensions.height - 12) {
      top = mousePos.y - tooltipHeight - 16;
    }
    left = Math.max(12, left);
    top = Math.max(12, top);

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [mousePos, dimensions]);

  // Filter out extreme outliers from stretching the scale
  const validSectors = sectors.filter((s) => s.stockCount > 0);

  // Calculate relative alpha (X) and momentum spread (Y)
  const dataPoints = useMemo(() => {
    // Market average across all constituent stocks for single-ticker baseline
    const allStocks = validSectors.flatMap((s) => s.stocks);
    const marketEqualReturn =
      allStocks.length > 0
        ? allStocks.reduce((sum, st) => sum + st.returnPct, 0) / allStocks.length
        : 0;

    return validSectors.map((s) => {
      const alpha = s.relativeStrengthVsBenchmark;
      const stockCount = s.stocks.length || s.stockCount || 1;
      const equalReturn =
        s.stocks.length > 0
          ? s.stocks.reduce((sum, st) => sum + st.returnPct, 0) / s.stocks.length
          : s.equalWeightedReturn;

      let momentum = 0;
      if (stockCount > 1) {
        // Option A: Breadth-Conditioned Momentum
        const netBreadth = (s.gainersCount - s.losersCount) / stockCount;
        const capitalSpread = Math.abs(s.turnoverWeightedReturn - equalReturn);
        const alphaAbs = Math.abs(alpha);
        const impactMagnitude = 10 + capitalSpread * 0.4 + alphaAbs * 0.2;
        momentum = netBreadth * impactMagnitude;
      } else {
        // For single ticker / 1-constituent groups: momentum relative to the broader market equal return
        momentum = (s.turnoverWeightedReturn - marketEqualReturn) * 0.75;
      }

      return {
        sector: s,
        alpha,
        momentum,
      };
    });
  }, [validSectors]);

  // Calculate dynamic axis limits using 85th percentile to prevent single outliers from crushing density
  const { maxAbsAlpha, maxAbsMomentum } = useMemo(() => {
    if (dataPoints.length === 0) return { maxAbsAlpha: 30, maxAbsMomentum: 20 };

    const sortedAbsAlpha = [...dataPoints.map((d) => Math.abs(d.alpha))].sort((a, b) => a - b);
    const p85Alpha = sortedAbsAlpha[Math.floor(sortedAbsAlpha.length * 0.85)] || 30;
    const maxAlpha = Math.max(p85Alpha, 25);

    const sortedAbsMomentum = [...dataPoints.map((d) => Math.abs(d.momentum))].sort((a, b) => a - b);
    const p85Momentum = sortedAbsMomentum[Math.floor(sortedAbsMomentum.length * 0.85)] || 15;
    const maxMom = Math.max(p85Momentum, 15);

    return { maxAbsAlpha: maxAlpha, maxAbsMomentum: maxMom };
  }, [dataPoints]);

  // Count of sectors per regime for labels and density awareness
  const regimeCounts = useMemo(() => {
    const counts = { Leading: 0, Improving: 0, Weakening: 0, Lagging: 0 };
    for (const d of dataPoints) {
      if (d.sector.rotationRegime in counts) {
        counts[d.sector.rotationRegime]++;
      }
    }
    return counts;
  }, [dataPoints]);

  // Dynamic Quadrant Origin based on point density
  // Expands congested quadrants by shifting crosshairs towards sparse areas
  const { originX, originY } = useMemo(() => {
    if (dataPoints.length === 0) return { originX: 50, originY: 50 };

    let rightCount = 0;
    let leftCount = 0;
    let topCount = 0;
    let bottomCount = 0;

    for (const d of dataPoints) {
      if (d.alpha >= 0) rightCount++;
      else leftCount++;

      if (d.momentum >= 0) topCount++;
      else bottomCount++;
    }

    const total = dataPoints.length;
    const xRatio = (rightCount - leftCount) / total;
    const yRatio = (topCount - bottomCount) / total;

    // Shift originX: if more on left, shift crosshair right (originX > 50) to expand left quadrants
    // Clamp between 32% and 68% so all 4 quadrants always remain visible and accessible
    const rawOriginX = 50 - xRatio * 18;
    const clampedOriginX = Math.max(32, Math.min(68, rawOriginX));

    // Shift originY: if more on bottom, shift crosshair up (originY < 50) to expand bottom quadrants
    const rawOriginY = 50 + yRatio * 18;
    const clampedOriginY = Math.max(32, Math.min(68, rawOriginY));

    return {
      originX: Math.round(clampedOriginX * 10) / 10,
      originY: Math.round(clampedOriginY * 10) / 10,
    };
  }, [dataPoints]);

  // Compute dynamically scaled positions with anti-overlap relaxation
  // Dynamically uses originX and originY to give crowded quadrants more physical area
  const positionedNodes = useMemo(() => {
    if (dataPoints.length === 0) return [];

    // 1. Initial mapping relative to dynamic origin (originX, originY)
    const initialNodes = dataPoints.map(({ sector, alpha, momentum }) => {
      const clampedAlpha = Math.max(Math.min(alpha, maxAbsAlpha * 1.5), -maxAbsAlpha * 1.5);
      const normAlpha =
        Math.sign(clampedAlpha) *
        Math.pow(Math.min(Math.abs(clampedAlpha) / (maxAbsAlpha * 1.25), 1), 0.65);

      let x: number;
      if (normAlpha >= 0) {
        // Right side: span is (100 - originX)
        x = originX + normAlpha * (100 - originX) * 0.82;
      } else {
        // Left side: span is originX (normAlpha is negative)
        x = originX + normAlpha * originX * 0.82;
      }

      const clampedMomentum = Math.max(
        Math.min(momentum, maxAbsMomentum * 1.5),
        -maxAbsMomentum * 1.5
      );
      const normMomentum =
        Math.sign(clampedMomentum) *
        Math.pow(Math.min(Math.abs(clampedMomentum) / (maxAbsMomentum * 1.25), 1), 0.65);

      let y: number;
      if (normMomentum >= 0) {
        // Top side: span is originY (positive momentum moves towards 0)
        y = originY - normMomentum * originY * 0.82;
      } else {
        // Bottom side: span is (100 - originY) (normMomentum is negative, so subtracting adds)
        y = originY - normMomentum * (100 - originY) * 0.82;
      }

      return {
        sector,
        alpha,
        momentum,
        x,
        y,
        isRight: alpha >= 0,
        isTop: momentum >= 0,
      };
    });

    // 2. Multi-pass deterministic relaxation to push overlapping pills apart
    // Without truncating names, this ensures tightly clustered pills repel each other cleanly
    const nodes = initialNodes.map((n) => ({ ...n }));
    const iterations = 8;
    const minDx = 14;
    const minDy = 5.2;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          // Only relax if in the same quadrant
          if (a.isRight !== b.isRight || a.isTop !== b.isTop) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDx < minDx && absDy < minDy) {
            // Overlapping! Push them apart primarily vertically, secondarily horizontally
            const overlapY = minDy - absDy;
            const overlapX = minDx - absDx;

            const pushY = overlapY * 0.45 * (dy === 0 ? (i < j ? -1 : 1) : Math.sign(dy));
            const pushX = overlapX * 0.25 * (dx === 0 ? (i < j ? -1 : 1) : Math.sign(dx));

            a.y += pushY;
            b.y -= pushY;
            a.x += pushX;
            b.x -= pushX;

            // Clamp strictly within quadrant and canvas boundaries
            if (a.isRight) {
              a.x = Math.min(95, Math.max(originX + 3.5, a.x));
            } else {
              a.x = Math.max(5, Math.min(originX - 3.5, a.x));
            }

            if (b.isRight) {
              b.x = Math.min(95, Math.max(originX + 3.5, b.x));
            } else {
              b.x = Math.max(5, Math.min(originX - 3.5, b.x));
            }

            if (a.isTop) {
              a.y = Math.max(6, Math.min(originY - 3, a.y));
            } else {
              a.y = Math.min(94, Math.max(originY + 3, a.y));
            }

            if (b.isTop) {
              b.y = Math.max(6, Math.min(originY - 3, b.y));
            } else {
              b.y = Math.min(94, Math.max(originY + 3, b.y));
            }
          }
        }
      }
    }

    return nodes;
  }, [dataPoints, originX, originY, maxAbsAlpha, maxAbsMomentum]);

  const toggleRegime = (regime: 'Leading' | 'Improving' | 'Weakening' | 'Lagging') => {
    setActiveRegimeFilter((prev) => (prev === regime ? null : regime));
  };

  // Ambient radial glow background with feathered edges to eliminate harsh boundaries
  const ambientGlowStyle = useMemo(() => {
    const isFiltered = activeRegimeFilter !== null;
    const op = (regime: 'Improving' | 'Leading' | 'Lagging' | 'Weakening') => {
      if (!isFiltered) return { max: 0.13, mid: 0.04 };
      return activeRegimeFilter === regime ? { max: 0.22, mid: 0.07 } : { max: 0.02, mid: 0.005 };
    };

    const imp = op('Improving');
    const lead = op('Leading');
    const lag = op('Lagging');
    const weak = op('Weakening');

    // Dynamically center each quadrant's radial glow ellipse based on dynamic origin
    const impCenter = `${Math.round(originX * 0.5)}% ${Math.round(originY * 0.5)}%`;
    const leadCenter = `${Math.round(originX + (100 - originX) * 0.5)}% ${Math.round(originY * 0.5)}%`;
    const lagCenter = `${Math.round(originX * 0.5)}% ${Math.round(originY + (100 - originY) * 0.5)}%`;
    const weakCenter = `${Math.round(originX + (100 - originX) * 0.5)}% ${Math.round(originY + (100 - originY) * 0.5)}%`;

    return {
      backgroundImage: [
        `radial-gradient(ellipse 65% 55% at ${impCenter}, rgba(14, 165, 233, ${imp.max}) 0%, rgba(14, 165, 233, ${imp.mid}) 45%, transparent 75%)`,
        `radial-gradient(ellipse 65% 55% at ${leadCenter}, rgba(16, 185, 129, ${lead.max}) 0%, rgba(16, 185, 129, ${lead.mid}) 45%, transparent 75%)`,
        `radial-gradient(ellipse 65% 55% at ${lagCenter}, rgba(244, 63, 94, ${lag.max}) 0%, rgba(244, 63, 94, ${lag.mid}) 45%, transparent 75%)`,
        `radial-gradient(ellipse 65% 55% at ${weakCenter}, rgba(245, 158, 11, ${weak.max}) 0%, rgba(245, 158, 11, ${weak.mid}) 45%, transparent 75%)`,
      ].join(', '),
      maskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 50%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 50%, transparent 100%)',
      transition: 'all 0.35s ease',
    };
  }, [activeRegimeFilter, originX, originY]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full min-h-[500px] sm:min-h-[580px] bg-black overflow-hidden flex flex-col justify-between select-none font-sans touch-pan-y border-0"
    >
      {/* 1. Main Matrix Canvas Area (Flex-1 Separated from Footer) */}
      <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
        {/* Soft Ambient Radial Glow Layer (Smoothly fades to 100% black at all edges) */}
        <div
          style={ambientGlowStyle}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* 4 Quadrants Interactive Corner Labels (Unboxed, clean text with live sector counts) */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 z-30 pointer-events-none">
          {/* Top-Left: Improving (Cyan / Sky) */}
          <div className="flex items-start p-3.5 sm:p-5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Improving');
              }}
              className={`pointer-events-auto flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeRegimeFilter === 'Improving'
                  ? 'text-sky-400 font-bold drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]'
                  : activeRegimeFilter
                  ? 'text-sky-400/30 opacity-40 hover:opacity-100'
                  : 'text-sky-400/90 hover:text-sky-300'
              }`}
            >
              <Zap size={14} className="text-sky-400" />
              <span>Improving</span>
              <span className="text-[10px] text-neutral-400 font-normal tabular-nums">({regimeCounts.Improving})</span>
              <span className="text-[10px] text-neutral-500 font-normal lowercase tracking-normal hidden md:inline">• accumulate</span>
              {activeRegimeFilter === 'Improving' && <X size={12} className="ml-0.5 text-sky-400" />}
            </button>
          </div>

          {/* Top-Right: Leading (Emerald Green) */}
          <div className="flex items-start justify-end p-3.5 sm:p-5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Leading');
              }}
              className={`pointer-events-auto flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeRegimeFilter === 'Leading'
                  ? 'text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                  : activeRegimeFilter
                  ? 'text-emerald-400/30 opacity-40 hover:opacity-100'
                  : 'text-emerald-400/90 hover:text-emerald-300'
              }`}
            >
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Leading</span>
              <span className="text-[10px] text-neutral-400 font-normal tabular-nums">({regimeCounts.Leading})</span>
              <span className="text-[10px] text-neutral-500 font-normal lowercase tracking-normal hidden md:inline">• alpha wave</span>
              {activeRegimeFilter === 'Leading' && <X size={12} className="ml-0.5 text-emerald-400" />}
            </button>
          </div>

          {/* Bottom-Left: Lagging (Rose Red) */}
          <div className="flex items-end p-3.5 sm:p-5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Lagging');
              }}
              className={`pointer-events-auto flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeRegimeFilter === 'Lagging'
                  ? 'text-rose-400 font-bold drop-shadow-[0_0_10px_rgba(251,113,133,0.7)]'
                  : activeRegimeFilter
                  ? 'text-rose-400/30 opacity-40 hover:opacity-100'
                  : 'text-rose-400/90 hover:text-rose-300'
              }`}
            >
              <TrendingDown size={14} className="text-rose-400" />
              <span>Lagging</span>
              <span className="text-[10px] text-neutral-400 font-normal tabular-nums">({regimeCounts.Lagging})</span>
              <span className="text-[10px] text-neutral-500 font-normal lowercase tracking-normal hidden md:inline">• avoid</span>
              {activeRegimeFilter === 'Lagging' && <X size={12} className="ml-0.5 text-rose-400" />}
            </button>
          </div>

          {/* Bottom-Right: Weakening (Amber) */}
          <div className="flex items-end justify-end p-3.5 sm:p-5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Weakening');
              }}
              className={`pointer-events-auto flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeRegimeFilter === 'Weakening'
                  ? 'text-amber-400 font-bold drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                  : activeRegimeFilter
                  ? 'text-amber-400/30 opacity-40 hover:opacity-100'
                  : 'text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Weakening</span>
              <span className="text-[10px] text-neutral-400 font-normal tabular-nums">({regimeCounts.Weakening})</span>
              <span className="text-[10px] text-neutral-500 font-normal lowercase tracking-normal hidden md:inline">• take profit</span>
              {activeRegimeFilter === 'Weakening' && <X size={12} className="ml-0.5 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* Soft Feathered Axis Crosshairs (Dynamic origin based on sector density) */}
        <div
          style={{ top: `${originY}%` }}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none z-10 transition-all duration-300"
        />
        <div
          style={{ left: `${originX}%` }}
          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.14] to-transparent pointer-events-none z-10 transition-all duration-300"
        />

        {/* Dynamic Benchmark Equilibrium Point */}
        <div
          style={{ left: `${originX}%`, top: `${originY}%` }}
          className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/60 pointer-events-none z-10 transition-all duration-300"
        />

        {/* Interactive Sector Nodes with Dynamic Positioning & Anti-Overlap Relaxation */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {positionedNodes.map(({ sector, x, y }) => {
            const isSelected = selectedSector === sector.sector;
            const isHovered = hoveredSector?.sector === sector.sector;

            const isRegimeMatch = activeRegimeFilter
              ? sector.rotationRegime === activeRegimeFilter
              : true;

            const regimeBg = {
              Leading: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30',
              Improving: 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/30',
              Weakening: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30',
              Lagging: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30',
            }[sector.rotationRegime] || 'bg-white/10 hover:bg-white/15 text-white border-white/20';

            return (
              <div
                key={sector.sector}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap flex items-center justify-center backdrop-blur-md shadow-lg cursor-pointer transition-all duration-200 pointer-events-auto border select-none ${
                  !isRegimeMatch
                    ? 'opacity-15 scale-90 pointer-events-none'
                    : isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black z-35 scale-110 shadow-2xl'
                    : isHovered
                    ? 'scale-115 z-40 ring-1 ring-white/90 shadow-2xl brightness-110'
                    : activeRegimeFilter && isRegimeMatch
                    ? 'ring-1 ring-white/50 scale-105 z-25'
                    : 'z-20 hover:scale-105'
                } ${regimeBg}`}
                onClick={() => onSelectSector(sector.sector)}
                onMouseEnter={() => setHoveredSector(sector)}
                onMouseLeave={() => setHoveredSector(null)}
              >
                <span className="font-sans font-semibold tracking-tight text-[11px] sm:text-xs">
                  {sector.sector}
                </span>
              </div>
            );
          })}
        </div>

        {/* Cursor-Following Hover Popover with Boundary Protection (Spacious, Unclipped #3D3D3D Surface) */}
        {hoveredSector && (() => {
          const regimeColors: Record<string, { dot: string; text: string }> = {
            Leading: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
            Improving: { dot: 'bg-sky-400', text: 'text-sky-300' },
            Weakening: { dot: 'bg-amber-400', text: 'text-amber-300' },
            Lagging: { dot: 'bg-rose-400', text: 'text-rose-300' },
          };
          const currentRegime = regimeColors[hoveredSector.rotationRegime] || {
            dot: 'bg-neutral-400',
            text: 'text-neutral-300',
          };

          return (
            <div
              style={tooltipStyle}
              className="hover-card absolute z-50 bg-[#3D3D3D] p-3.5 sm:p-4 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.65)] flex flex-col gap-3 w-80 max-w-[340px] animate-in fade-in duration-100 pointer-events-none font-sans select-none border-0"
            >
              {/* Header: Title, Regime Subtitle & Prominent Return Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white leading-snug tracking-tight break-words">
                    {hoveredSector.sector}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-300 font-sans">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentRegime.dot}`} />
                      <span className={currentRegime.text}>{hoveredSector.rotationRegime}</span>
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span className="text-neutral-300 tabular-nums">
                      {hoveredSector.stockCount} {hoveredSector.stockCount === 1 ? 'constituent' : 'constituents'}
                    </span>
                  </div>
                </div>

                <div
                  className={`px-2.5 py-1 rounded-lg shrink-0 font-sans text-xs font-bold tabular-nums text-right ${
                    hoveredSector.turnoverWeightedReturn >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {hoveredSector.turnoverWeightedReturn > 0 ? '+' : ''}
                  {hoveredSector.turnoverWeightedReturn.toFixed(2)}%
                </div>
              </div>

              {/* 2-Column Metrics Tiles */}
              <div className="grid grid-cols-2 gap-2">
                {/* Traded Turnover */}
                <div className="bg-black/25 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                    Turnover
                  </span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {hoveredSector.totalTurnover >= 1_000_000_000
                      ? `${(hoveredSector.totalTurnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`
                      : `${(hoveredSector.totalTurnover / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EGP`}
                  </span>
                  <span className="text-[10px] text-neutral-400 tabular-nums">
                    {hoveredSector.turnoverShare.toFixed(1)}% of market
                  </span>
                </div>

                {/* Alpha vs Benchmark */}
                <div className="bg-black/25 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                    Alpha vs EGX 30
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      hoveredSector.relativeStrengthVsBenchmark >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {hoveredSector.relativeStrengthVsBenchmark > 0 ? '+' : ''}
                    {hoveredSector.relativeStrengthVsBenchmark.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Relative momentum
                  </span>
                </div>
              </div>

              {/* Market Breadth Row */}
              <div className="bg-black/25 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                  Market Breadth
                </span>
                <div className="flex items-center gap-2 tabular-nums text-xs font-medium">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="text-[10px] text-emerald-400/70 font-normal">Gainers:</span>
                    {hoveredSector.gainersCount}
                  </span>
                  <span className="text-neutral-500">/</span>
                  <span className="text-rose-400 flex items-center gap-1 font-semibold">
                    <span className="text-[10px] text-rose-400/70 font-normal">Losers:</span>
                    {hoveredSector.losersCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Dedicated Bottom Footer Bar (Shrink-0 in Normal Flex Flow) */}
      <div className="h-8 px-4 flex items-center justify-between text-[11px] text-neutral-400 bg-black/90 border-t border-white/[0.06] shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-neutral-500" />
          <span>Horizontal = Alpha vs EGX30 | Vertical = Momentum Spread</span>
          <span className="text-neutral-600 hidden sm:inline">•</span>
          <span className="text-neutral-400 hidden sm:inline">Adaptive Dynamic Quadrants</span>
        </div>
        {activeRegimeFilter ? (
          <button
            type="button"
            onClick={() => setActiveRegimeFilter(null)}
            className="text-white hover:text-neutral-300 transition flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>Showing {activeRegimeFilter} only (Reset ✕)</span>
          </button>
        ) : (
          <span className="text-[10px] text-neutral-500">Click any quadrant badge to filter</span>
        )}
      </div>
    </div>
  );
}

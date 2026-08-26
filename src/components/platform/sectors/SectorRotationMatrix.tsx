"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { SectorPerformanceItem } from '@/lib/sectors-math';
import { TrendingUp, Zap, AlertTriangle, TrendingDown, Info, X } from '@/components/ui/icon-library';

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
    const tooltipWidth = 260;
    const tooltipHeight = 175;
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
    return validSectors.map((s) => {
      const alpha = s.relativeStrengthVsBenchmark;
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

  const toggleRegime = (regime: 'Leading' | 'Improving' | 'Weakening' | 'Lagging') => {
    setActiveRegimeFilter((prev) => (prev === regime ? null : regime));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="card-widget relative w-full h-full min-h-106 overflow-hidden flex flex-col justify-between select-none font-sans touch-pan-y"
    >
      {/* 1. Main Matrix Canvas Area (Flex-1 Separated from Footer) */}
      <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
        {/* 4 Quadrants Ambient Background with Interactive Click-to-Filter Badges */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 z-30 pointer-events-none">
          {/* Top-Left: Improving (Cyan) */}
          <div className="border-r border-b border-plt-border-soft bg-gradient-to-br from-plt-info/[0.08] via-plt-info/[0.02] to-transparent flex items-start p-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Improving');
              }}
              className={`pointer-events-auto px-2.5 py-1 rounded-xl border text-xs font-medium tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
                activeRegimeFilter === 'Improving'
                  ? 'bg-plt-info/25 border-plt-info ring-2 ring-white/90 text-white font-bold scale-105 shadow-lg'
                  : activeRegimeFilter
                  ? 'bg-plt-card/60 border-plt-info/20 text-plt-info/60 opacity-40 hover:opacity-100'
                  : 'bg-plt-card border-plt-info/30 text-plt-info hover:bg-plt-info/10'
              }`}
            >
              <Zap size={14} className="text-plt-info" />
              <span>Improving (Accumulate)</span>
              {activeRegimeFilter === 'Improving' && <X size={11} className="ml-0.5" />}
            </button>
          </div>

          {/* Top-Right: Leading (Emerald) */}
          <div className="border-b border-plt-border-soft bg-gradient-to-bl from-plt-profit/[0.08] via-plt-profit/[0.02] to-transparent flex items-start justify-end p-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Leading');
              }}
              className={`pointer-events-auto px-2.5 py-1 rounded-xl border text-xs font-medium tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
                activeRegimeFilter === 'Leading'
                  ? 'bg-plt-profit/25 border-plt-profit ring-2 ring-white/90 text-white font-bold scale-105 shadow-lg'
                  : activeRegimeFilter
                  ? 'bg-plt-card/60 border-plt-profit/20 text-plt-profit/60 opacity-40 hover:opacity-100'
                  : 'bg-plt-card border-plt-profit/30 text-plt-profit hover:bg-plt-profit/10'
              }`}
            >
              <TrendingUp size={14} className="text-plt-profit" />
              <span>Leading (Alpha Wave)</span>
              {activeRegimeFilter === 'Leading' && <X size={11} className="ml-0.5" />}
            </button>
          </div>

          {/* Bottom-Left: Lagging (Rose) */}
          <div className="border-r border-plt-border-soft bg-gradient-to-tr from-plt-risk/[0.08] via-plt-risk/[0.02] to-transparent flex items-end p-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Lagging');
              }}
              className={`pointer-events-auto px-2.5 py-1 rounded-xl border text-xs font-medium tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
                activeRegimeFilter === 'Lagging'
                  ? 'bg-plt-risk/25 border-plt-risk ring-2 ring-white/90 text-white font-bold scale-105 shadow-lg'
                  : activeRegimeFilter
                  ? 'bg-plt-card/60 border-plt-risk/20 text-plt-risk/60 opacity-40 hover:opacity-100'
                  : 'bg-plt-card border-plt-risk/30 text-plt-risk hover:bg-plt-risk/10'
              }`}
            >
              <TrendingDown size={14} className="text-plt-risk" />
              <span>Lagging (Avoid)</span>
              {activeRegimeFilter === 'Lagging' && <X size={11} className="ml-0.5" />}
            </button>
          </div>

          {/* Bottom-Right: Weakening (Amber) */}
          <div className="bg-gradient-to-tl from-plt-warning/[0.08] via-plt-warning/[0.02] to-transparent flex items-end justify-end p-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleRegime('Weakening');
              }}
              className={`pointer-events-auto px-2.5 py-1 rounded-xl border text-xs font-medium tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
                activeRegimeFilter === 'Weakening'
                  ? 'bg-plt-warning/25 border-plt-warning ring-2 ring-white/90 text-white font-bold scale-105 shadow-lg'
                  : activeRegimeFilter
                  ? 'bg-plt-card/60 border-plt-warning/20 text-plt-warning/60 opacity-40 hover:opacity-100'
                  : 'bg-plt-card border-plt-warning/30 text-plt-warning hover:bg-plt-warning/10'
              }`}
            >
              <AlertTriangle size={14} className="text-plt-warning" />
              <span>Weakening (Take Profit)</span>
              {activeRegimeFilter === 'Weakening' && <X size={11} className="ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Axis Crosshairs (Centered at Benchmark 0 Alpha / 0 Momentum) */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-plt-border-soft pointer-events-none z-10" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-plt-border-soft pointer-events-none z-10" />

        {/* Axis Center Benchmark Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-plt-card border border-plt-border-soft px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider tabular-nums text-plt-muted pointer-events-none z-15 font-mono">
          EGX 30 Benchmark
        </div>

        {/* Interactive Sector Nodes with Spacious Power Distribution */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {dataPoints.map(({ sector, alpha, momentum }) => {
            const clampedAlpha = Math.max(Math.min(alpha, maxAbsAlpha * 1.5), -maxAbsAlpha * 1.5);
            const normAlpha = Math.sign(clampedAlpha) * Math.pow(Math.min(Math.abs(clampedAlpha) / (maxAbsAlpha * 1.25), 1), 0.65);
            const normalizedX = 50 + normAlpha * 41;

            const clampedMomentum = Math.max(Math.min(momentum, maxAbsMomentum * 1.5), -maxAbsMomentum * 1.5);
            const normMomentum = Math.sign(clampedMomentum) * Math.pow(Math.min(Math.abs(clampedMomentum) / (maxAbsMomentum * 1.25), 1), 0.65);
            const normalizedY = 50 - normMomentum * 41;

            const isSelected = selectedSector === sector.sector;
            const isHovered = hoveredSector?.sector === sector.sector;

            const isRegimeMatch = activeRegimeFilter
              ? sector.rotationRegime === activeRegimeFilter
              : true;

            // Node size proportional to turnover share
            const nodeSize = Math.max(Math.min(sector.turnoverShare * 1.2 + 28, 54), 28);
            const acronym = getSectorAcronym(sector.sector);

            const regimeBg = {
              Leading: 'bg-plt-profit-soft border-plt-profit-border text-plt-profit shadow-panel',
              Improving: 'bg-plt-info-soft border-plt-info-border text-plt-info shadow-panel',
              Weakening: 'bg-plt-warning-soft border-plt-warning-border text-plt-warning shadow-panel',
              Lagging: 'bg-plt-risk-soft border-plt-risk-border text-plt-risk shadow-panel',
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
                className={`rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 pointer-events-auto ${
                  !isRegimeMatch
                    ? 'opacity-15 scale-90 pointer-events-none'
                    : isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black z-30 scale-110'
                    : isHovered
                    ? 'scale-125 z-40 ring-2 ring-white/90 shadow-2xl'
                    : activeRegimeFilter && isRegimeMatch
                    ? 'ring-1 ring-white/60 scale-105 z-25'
                    : 'z-20 hover:scale-115'
                } ${regimeBg}`}
                onClick={() => onSelectSector(sector.sector)}
                onMouseEnter={() => setHoveredSector(sector)}
                onMouseLeave={() => setHoveredSector(null)}
              >
                <span className="text-mini font-medium tabular-nums tracking-tight text-center leading-none">
                  {acronym}
                </span>
              </div>
            );
          })}
        </div>

        {/* Cursor-Following Hover Popover with Boundary Protection */}
        {hoveredSector && (
          <div
            style={tooltipStyle}
            className="absolute z-50 bg-plt-raised/98 backdrop-blur-2xl border border-plt-border-strong p-3 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex flex-col gap-2 min-w-56 max-w-64 animate-in fade-in duration-100 pointer-events-none font-sans select-none"
          >
            <div className="flex items-center justify-between gap-2 border-b border-plt-border/40 pb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {hoveredSector.sector}
                </span>
                <span className="text-[10px] tabular-nums text-plt-muted px-1.5 py-0.5 rounded bg-white/[0.06] shrink-0">
                  {hoveredSector.stockCount} {hoveredSector.stockCount === 1 ? 'stock' : 'stocks'}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full border shrink-0 ${
                  hoveredSector.turnoverWeightedReturn >= 0
                    ? 'bg-plt-profit/15 text-plt-profit border-plt-profit/30'
                    : 'bg-plt-risk/15 text-plt-risk border-plt-risk/30'
                }`}
              >
                {hoveredSector.turnoverWeightedReturn > 0 ? '+' : ''}
                {hoveredSector.turnoverWeightedReturn.toFixed(1)}%
              </span>
            </div>

            <div className="text-[11px] text-plt-muted tabular-nums">
              Turnover:{' '}
              <strong className="text-plt-text font-semibold">
                {hoveredSector.totalTurnover >= 1_000_000_000
                  ? `${(hoveredSector.totalTurnover / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`
                  : `${(hoveredSector.totalTurnover / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M EGP`}
              </strong>{' '}
              ({hoveredSector.turnoverShare.toFixed(1)}% of market)
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-plt-border/30 text-xs tabular-nums">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-plt-muted block">Alpha vs EGX30</span>
                <span
                  className={`font-semibold text-xs ${
                    hoveredSector.relativeStrengthVsBenchmark >= 0 ? 'text-plt-profit' : 'text-plt-risk'
                  }`}
                >
                  {hoveredSector.relativeStrengthVsBenchmark > 0 ? '+' : ''}
                  {hoveredSector.relativeStrengthVsBenchmark.toFixed(1)}%
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-plt-muted block">Breadth Ratio</span>
                <span className="font-semibold text-xs text-plt-text">
                  <span className="text-plt-profit">{hoveredSector.gainersCount}W</span> /{' '}
                  <span className="text-plt-risk">{hoveredSector.losersCount}L</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dedicated Bottom Footer Bar (Shrink-0 in Normal Flex Flow) */}
      <div className="h-7.5 px-3 flex items-center justify-between text-[11px] text-plt-muted bg-plt-surface/95 border-t border-plt-border-soft shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <Info size={13} className="text-plt-muted" />
          <span>Horizontal = Alpha vs EGX30 | Vertical = Momentum Spread</span>
        </div>
        {activeRegimeFilter ? (
          <button
            type="button"
            onClick={() => setActiveRegimeFilter(null)}
            className="text-plt-text hover:text-white transition flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>Showing {activeRegimeFilter} only (Reset ✕)</span>
          </button>
        ) : (
          <span className="text-[10px] text-plt-muted">Click any quadrant badge to filter</span>
        )}
      </div>
    </div>
  );
}

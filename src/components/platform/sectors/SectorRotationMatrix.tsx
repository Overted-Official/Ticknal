"use client";

import React from 'react';
import type { SectorPerformanceItem } from '@/app/api/sectors/performance/route';
import { TrendingUp, Zap, AlertTriangle, TrendingDown } from 'lucide-react';

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
  // Find min/max bounds for normalization
  const returns = sectors.map((s) => s.turnoverWeightedReturn);
  const maxReturn = Math.max(...returns, 15);
  const minReturn = Math.min(...returns, -15);
  const returnRange = Math.max(maxReturn - minReturn, 10);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-black/40 rounded-xl overflow-hidden border border-white/[0.08] p-6 flex flex-col justify-between">
      {/* 4 Quadrants Background */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-25">
        <div className="border-r border-b border-cyan-500/40 bg-cyan-500/5 flex items-start p-3">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} /> Improving (Accumulate)
          </span>
        </div>
        <div className="border-b border-emerald-500/40 bg-emerald-500/5 flex items-start justify-end p-3">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} /> Leading (Alpha Wave)
          </span>
        </div>
        <div className="border-r border-rose-500/40 bg-rose-500/5 flex items-end p-3">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown size={13} /> Lagging (Avoid)
          </span>
        </div>
        <div className="bg-amber-500/5 flex items-end justify-end p-3">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={13} /> Weakening (Take Profit)
          </span>
        </div>
      </div>

      {/* Axis Crosshairs */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 pointer-events-none" />
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10 pointer-events-none" />

      {/* Interactive Sector Nodes */}
      <div className="relative w-full h-full">
        {sectors.map((sector) => {
          // X-position based on return
          const normalizedX = ((sector.turnoverWeightedReturn - minReturn) / returnRange) * 80 + 10;
          // Y-position based on rotation regime
          let normalizedY = 50;
          if (sector.rotationRegime === 'Leading') normalizedY = 25;
          else if (sector.rotationRegime === 'Improving') normalizedY = 30;
          else if (sector.rotationRegime === 'Weakening') normalizedY = 70;
          else normalizedY = 75;

          const isSelected = selectedSector === sector.sector;
          const nodeSize = Math.max(Math.min(sector.turnoverShare * 1.5, 45), 24);

          return (
            <div
              key={sector.sector}
              style={{
                position: 'absolute',
                left: `${normalizedX}%`,
                top: `${normalizedY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onSelectSector(sector.sector)}
              className="cursor-pointer group flex flex-col items-center z-10 hover:z-30 transition-all duration-200"
            >
              <div
                style={{ width: nodeSize, height: nodeSize }}
                className={`rounded-full flex items-center justify-center font-bold text-[9px] font-mono shadow-xl transition-all group-hover:scale-125 ${
                  isSelected
                    ? 'ring-4 ring-plt-orange bg-plt-orange text-black font-extrabold'
                    : sector.turnoverWeightedReturn >= 0
                      ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-300'
                      : 'bg-rose-500/30 border border-rose-400 text-rose-300'
                }`}
              >
                {sector.sector.slice(0, 3).toUpperCase()}
              </div>
              <span className="text-[9px] font-mono font-semibold text-white/80 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 mt-1 whitespace-nowrap group-hover:text-white">
                {sector.sector}: {sector.turnoverWeightedReturn > 0 ? '+' : ''}{sector.turnoverWeightedReturn.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

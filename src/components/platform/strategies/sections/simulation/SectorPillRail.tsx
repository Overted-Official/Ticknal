'use client';

import React, { useRef } from 'react';
import type { GroupBy, SectorDifferentialItem } from './types';

interface SectorPillRailProps {
  groupBy: GroupBy;
  sectorDifferentialList: SectorDifferentialItem[];
  selectedSectorFilter: string | null;
  onSelectSector: (sector: string | null) => void;
  outperformingSectorsCount: number;
}

export default function SectorPillRail({
  groupBy,
  sectorDifferentialList,
  selectedSectorFilter,
  onSelectSector,
  outperformingSectorsCount,
}: SectorPillRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const groupLabel =
    groupBy === 'sector'
      ? 'Sectors'
      : groupBy === 'industryGroup'
      ? 'Groups'
      : 'Industries';

  return (
    <div
      ref={railRef}
      className="flex gap-2 overflow-x-auto no-scrollbar pb-1 select-none font-sans"
    >
      {/* "All" pill */}
      <button
        type="button"
        onClick={() => onSelectSector(null)}
        className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-full transition-all shrink-0 text-left cursor-pointer ${
          !selectedSectorFilter
            ? 'bg-white/10 border border-white/20 shadow-lg'
            : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
            !selectedSectorFilter
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/5 text-neutral-300 border border-white/10'
          }`}
        >
          ∑
        </div>
        <div className="flex flex-col justify-center">
          <span
            className={`text-[11px] font-medium whitespace-nowrap ${
              !selectedSectorFilter
                ? 'text-white'
                : 'text-neutral-300 group-hover:text-white'
            }`}
          >
            All {groupLabel}
          </span>
          <span className="text-[10px] text-neutral-400 tabular-nums mt-0.5">
            {outperformingSectorsCount}/{sectorDifferentialList.length} beating B&H
          </span>
        </div>
      </button>

      {/* Per-sector pills */}
      {sectorDifferentialList.map((sec) => {
        const isSelected = selectedSectorFilter === sec.sector;
        const hasAlpha = sec.alphaDelta > 0;
        const initials = sec.sector
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase();

        return (
          <button
            key={sec.sector}
            type="button"
            onClick={() => onSelectSector(isSelected ? null : sec.sector)}
            className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-full transition-all shrink-0 text-left cursor-pointer ${
              isSelected
                ? 'bg-white/10 border border-white/20 shadow-lg'
                : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                isSelected
                  ? 'bg-white/20 text-white border border-white/30'
                  : hasAlpha
                  ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/30'
                  : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/30'
              }`}
            >
              {initials}
            </div>
            <div className="flex flex-col justify-center">
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  isSelected
                    ? 'text-white'
                    : 'text-neutral-200 group-hover:text-white'
                }`}
              >
                {sec.sector}
              </span>
              <div className="flex items-center gap-1.5 mt-1 leading-none">
                <span
                  className={`text-[11px] font-bold tabular-nums ${
                    hasAlpha ? 'text-[#089981]' : 'text-[#f23645]'
                  }`}
                >
                  {hasAlpha ? '+' : ''}
                  {sec.alphaDelta.toFixed(1)}% α
                </span>
                <span className="text-[10px] text-neutral-400 tabular-nums">
                  {sec.strategyRoi > 0 ? '+' : ''}
                  {sec.strategyRoi.toFixed(1)}%
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

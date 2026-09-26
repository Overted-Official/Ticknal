'use client';

import React from 'react';

interface AlgorithmPillsProps {
  selectedStrategy: string;
  onSelectStrategy: (id: string) => void;
  strategyMetrics?: Record<string, { roi: number; bhRoi: number; alpha: number }>;
}

interface StrategyPillItem {
  id: string;
  name: string;
  badge: string;
}

const STRATEGY_PILLS: StrategyPillItem[] = [
  {
    id: 'psi',
    name: 'Typhon',
    badge: 'TY',
  },
  {
    id: 'psi_v2',
    name: 'Cerberus',
    badge: 'CE',
  },
  {
    id: 'hydra',
    name: 'Hydra',
    badge: 'HY',
  },
];

export default function AlgorithmPills({
  selectedStrategy,
  onSelectStrategy,
  strategyMetrics,
}: AlgorithmPillsProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 select-none font-sans">
      {STRATEGY_PILLS.map((st) => {
        const isSelected = selectedStrategy === st.id;
        const metrics = strategyMetrics?.[st.id];
        const hasMetrics = !!metrics;
        const isRoiPos = (metrics?.roi ?? 0) >= 0;
        const isBhPos = (metrics?.bhRoi ?? 0) >= 0;

        return (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStrategy(st.id)}
            className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-full transition-all shrink-0 text-left cursor-pointer ${
              isSelected
                ? 'bg-[#242426] border border-white/10 shadow-lg'
                : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
            }`}
          >
            {/* Left Circular Badge */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                isSelected
                  ? 'bg-[#38383a] text-white border border-neutral-600'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-700/80'
              }`}
            >
              {st.badge}
            </div>

            {/* Right Info Block */}
            <div className="flex flex-col justify-center">
              {/* Top Line: Algorithm Name */}
              <div className="flex items-center gap-1 leading-none">
                <span
                  className={`text-xs font-semibold tracking-tight whitespace-nowrap ${
                    isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                  }`}
                >
                  {st.name}
                </span>
              </div>

              {/* Bottom Line: Real dynamic ROI and B&H for the selected timeframe */}
              <div className="flex items-center gap-1.5 mt-1 leading-none">
                {hasMetrics ? (
                  <>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {isRoiPos ? '+' : ''}
                      {metrics.roi.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight">
                      ROI
                    </span>
                    <span className="text-neutral-500 text-[11px]">vs</span>
                    <span className="text-xs font-medium text-neutral-300 tabular-nums">
                      {isBhPos ? '+' : ''}
                      {metrics.bhRoi.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight">
                      B&H
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-neutral-500 tabular-nums">—</span>
                    <span className="text-[9px] font-medium text-neutral-500 uppercase tracking-tight">
                      ROI
                    </span>
                    <span className="text-neutral-600 text-[11px]">vs</span>
                    <span className="text-xs text-neutral-500 tabular-nums">—</span>
                    <span className="text-[9px] font-medium text-neutral-500 uppercase tracking-tight">
                      B&H
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

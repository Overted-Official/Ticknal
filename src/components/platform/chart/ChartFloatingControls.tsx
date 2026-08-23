'use client';

import type { ReactNode } from 'react';
import { RotateCcw, BarChart2, Briefcase, Plus } from '@/components/ui/icon-library';

interface ChartFloatingControlsProps {
  hasReplayRoom: boolean;
  onEnableReplay: () => void;
  predictButtonUI: ReactNode;
  activeIndicatorsCount: number;
  onToggleIndicators: () => void;
  openPositionsCount: number;
  onOpenPositionsDrawer: () => void;
  onOpenAddOrder: () => void;
}

export default function ChartFloatingControls({
  hasReplayRoom,
  onEnableReplay,
  predictButtonUI,
  activeIndicatorsCount,
  onToggleIndicators,
  openPositionsCount,
  onOpenPositionsDrawer,
  onOpenAddOrder,
}: ChartFloatingControlsProps) {
  return (
    <div className="absolute bottom-8 sm:bottom-10 left-2 sm:left-4 z-40 flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/[0.16] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all select-none">
      {/* 1. Bar Replay */}
      <button
        type="button"
        title="Bar Replay"
        aria-label="Bar Replay"
        disabled={!hasReplayRoom}
        onClick={onEnableReplay}
        className="h-8 rounded-full px-2.5 sm:px-3 text-xs font-medium text-plt-muted hover:text-plt-text bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
      >
        <RotateCcw size={13} className="text-plt-muted" />
        <span className="hidden sm:inline">Replay</span>
      </button>

      {/* 2. Predict N Days */}
      {predictButtonUI}

      {/* 3. Indicators */}
      <button
        type="button"
        title="Technical Indicators"
        onClick={onToggleIndicators}
        className={`h-8 rounded-full px-2.5 sm:px-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
          activeIndicatorsCount > 0
            ? 'bg-plt-active text-plt-text border border-plt-border-subtle font-semibold'
            : 'text-plt-muted hover:text-plt-text bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08]'
        }`}
      >
        <BarChart2 size={13} />
        <span className="hidden sm:inline">Indicators</span>
        {activeIndicatorsCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white font-bold">
            {activeIndicatorsCount}
          </span>
        )}
      </button>

      {/* 4. Positions Drawer Button */}
      <button
        type="button"
        title="View Positions & Orders"
        onClick={onOpenPositionsDrawer}
        className="h-8 rounded-full px-2.5 sm:px-3 text-xs font-medium text-plt-muted hover:text-plt-text bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
      >
        <Briefcase size={13} className="text-plt-muted" />
        <span className="hidden sm:inline">Positions</span>
        {openPositionsCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white font-bold">
            {openPositionsCount}
          </span>
        )}
      </button>

      {/* 5. Add Position CTA */}
      <button
        type="button"
        onClick={onOpenAddOrder}
        className="h-8 rounded-full bg-white hover:bg-white/90 text-black px-3 sm:px-3.5 text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
        title="Add Position"
        aria-label="Add Position"
      >
        <Plus size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">Add Position</span>
      </button>
    </div>
  );
}

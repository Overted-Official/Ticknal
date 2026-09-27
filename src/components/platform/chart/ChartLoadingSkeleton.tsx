'use client';

import { CometSpinner } from '@/components/ui/CometSpinner';

interface ChartLoadingSkeletonProps {
  isLoading: boolean;
  displaySymbol: string;
}

const CANDLE_HEIGHTS = [
  45, 62, 55, 78, 50, 70, 60, 88, 45, 74, 82, 60, 72, 54, 86, 64, 48, 76, 62, 94, 55, 70, 46, 80, 60, 84, 50, 68, 76, 58
];

export default function ChartLoadingSkeleton({ isLoading, displaySymbol }: ChartLoadingSkeletonProps) {
  if (!isLoading) return null;

  const label = `Loading ${displaySymbol}`;

  return (
    <div
      className="absolute inset-0 z-30 flex select-none items-center justify-center overflow-hidden bg-black/90"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div aria-hidden="true" className="absolute inset-x-6 top-12 bottom-12 flex flex-col justify-between opacity-50">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-px w-full bg-white/[0.08]" />
        ))}
      </div>

      <div aria-hidden="true" className="absolute bottom-12 left-10 right-10 flex h-3/5 items-end gap-1.5 px-4 opacity-30">
        {CANDLE_HEIGHTS.map((height, index) => (
          <div
            key={index}
            className="flex-1 bg-white/[0.18]"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <CometSpinner decorative className="h-9 w-9" />
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
      </div>
    </div>
  );
}

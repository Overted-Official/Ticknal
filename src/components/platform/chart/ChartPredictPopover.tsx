'use client';

import { Sparkles, X, Loader2 } from '@/components/ui/icon-library';

interface ChartPredictPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  predictDaysInput: string;
  onChangePredictDays: (days: string) => void;
  onRunPrediction: (days: number) => void;
  isPredicting: boolean;
}

export default function ChartPredictPopover({
  isOpen,
  onClose,
  predictDaysInput,
  onChangePredictDays,
  onRunPrediction,
  isPredicting,
}: ChartPredictPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-20 left-2 sm:left-4 z-50 w-72 p-3.5 text-xs text-plt-text shadow-popover backdrop-blur-2xl border border-white/[0.16] bg-plt-card/95 rounded-2xl animate-in fade-in zoom-in-95 duration-100 select-none">
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-plt-text">
          <Sparkles size={14} className="text-plt-text" />
          <span>AI Price Forecast</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-plt-muted hover:bg-white/[0.08] hover:text-plt-text transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-plt-muted font-sans block mb-1">
            Forecast Horizon (Days ahead)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={predictDaysInput}
              onChange={(e) => onChangePredictDays(e.target.value)}
              className="h-8 w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-2.5 text-xs font-mono font-semibold text-plt-text outline-none focus:border-plt-border-active"
            />
            <span className="text-xs text-plt-muted font-mono shrink-0">Days</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isPredicting}
          onClick={() => {
            const days = parseInt(predictDaysInput, 10) || 10;
            onRunPrediction(days);
            onClose();
          }}
          className="w-full h-8 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isPredicting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Forecasting...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

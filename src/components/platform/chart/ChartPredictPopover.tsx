'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, X, Loader2 } from '@/components/ui/icon-library';

interface ChartPredictPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  predictDaysInput: string;
  onChangePredictDays: (days: string) => void;
  onRunPrediction: (days: number) => void;
  isPredicting: boolean;
}

const PRESET_DAYS = [5, 10, 20, 30];

export default function ChartPredictPopover({
  isOpen,
  onClose,
  predictDaysInput,
  onChangePredictDays,
  onRunPrediction,
  isPredicting,
}: ChartPredictPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-2 left-2 sm:left-48 md:left-52 z-50 w-[270px] sm:w-[280px] max-w-[calc(100vw-16px)] bg-cold-gray-900 border border-white/[0.08] rounded-lg shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden text-xs font-sans"
    >
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
          <Sparkles size={13} className="text-white" />
          <span>AI Price Forecast</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-5 w-5 rounded flex items-center justify-center text-text-muted hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Popover Content */}
      <div className="p-3 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-text-muted font-medium uppercase tracking-wider">
            <span>Forecast Horizon</span>
            <span className="tabular-nums font-sans">{predictDaysInput || 10} Days</span>
          </div>

          {/* Quick Preset Pills */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {PRESET_DAYS.map((days) => {
              const isSelected = predictDaysInput === String(days);
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => onChangePredictDays(String(days))}
                  className={`h-6 rounded text-[10.5px] font-sans font-medium transition-colors cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-white text-black font-semibold'
                      : 'bg-white/[0.04] text-text-muted hover:text-white hover:bg-white/[0.08] border border-white/[0.04]'
                  }`}
                >
                  {days}D
                </button>
              );
            })}
          </div>

          {/* Custom Days Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={1}
                max={60}
                value={predictDaysInput}
                onChange={(e) => onChangePredictDays(e.target.value)}
                className="h-7 w-full rounded-md border border-white/[0.08] bg-white/[0.03] focus:bg-white/[0.06] px-2 text-xs font-sans tabular-nums text-white outline-none focus:border-white/20 transition-colors"
                placeholder="Custom days..."
              />
            </div>
            <span className="text-[11px] text-text-muted font-sans shrink-0">Days</span>
          </div>
        </div>

        {/* Generate Forecast CTA */}
        <button
          type="button"
          disabled={isPredicting}
          onClick={() => {
            const days = parseInt(predictDaysInput, 10) || 10;
            onRunPrediction(days);
            onClose();
          }}
          className="w-full h-7.5 rounded-md bg-white hover:bg-white/90 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 active:scale-98"
        >
          {isPredicting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Forecasting...</span>
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, X } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { useTranslation } from '@/lib/i18n';

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
  const { locale } = useTranslation();
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
      className="absolute top-2 left-2 sm:left-48 md:left-52 rtl:left-auto rtl:right-2 sm:rtl:right-48 md:rtl:right-52 z-50 w-[270px] sm:w-[280px] max-w-[calc(100vw-16px)] bg-plt-hovercard border border-plt-border rounded-lg shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden text-xs font-sans"
    >
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-plt-border-soft flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-plt-text">
          <Sparkles size={13} className="text-plt-text" />
          <span>{locale === 'ar' ? 'توقعات الأسعار بالذكاء الاصطناعي' : 'AI Price Forecast'}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-5 w-5 rounded flex items-center justify-center text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors cursor-pointer"
          aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X size={12} />
        </button>
      </div>

      {/* Popover Content */}
      <div className="p-3 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[10px] text-plt-muted font-medium uppercase tracking-wider">
            <span>{locale === 'ar' ? 'أفق التوقع' : 'Forecast Horizon'}</span>
            <span className="tabular-nums font-sans">
              {predictDaysInput || 10} {locale === 'ar' ? 'أيام' : 'Days'}
            </span>
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
                      : 'bg-plt-hover text-plt-muted hover:text-plt-text hover:bg-plt-active border border-plt-border-soft'
                  }`}
                >
                  {days}{locale === 'ar' ? 'يوم' : 'D'}
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
                className="h-7 w-full rounded-md border border-plt-border-soft bg-plt-hover focus:bg-plt-active px-2 text-xs font-sans tabular-nums text-plt-text outline-none focus:border-plt-border transition-colors"
                placeholder={locale === 'ar' ? 'أيام مخصصة...' : 'Custom days...'}
              />
            </div>
            <span className="text-[11px] text-plt-muted font-sans shrink-0">
              {locale === 'ar' ? 'يوم' : 'Days'}
            </span>
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
              <InlineSpinner className="h-3.5 w-3.5" label={locale === 'ar' ? 'جاري إنشاء التوقع' : 'Generating forecast'} />
              <span>{locale === 'ar' ? 'جاري التوقع...' : 'Forecasting...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>{locale === 'ar' ? 'إنشاء التوقع' : 'Generate Forecast'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

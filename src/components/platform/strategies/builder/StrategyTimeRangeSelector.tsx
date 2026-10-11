'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from '@/components/ui/icon-library';

export type TimeRangePreset = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

interface StrategyTimeRangeSelectorProps {
  readonly startDate: string;
  readonly endDate: string;
  readonly locale: 'en' | 'ar';
  readonly onChange: (startDate: string, endDate: string, preset: TimeRangePreset) => void;
}

const PRESETS: readonly { id: TimeRangePreset; labelEn: string; labelAr: string }[] = [
  { id: '1M', labelEn: '1M', labelAr: 'شهر' },
  { id: '3M', labelEn: '3M', labelAr: '٣ أشهر' },
  { id: '6M', labelEn: '6M', labelAr: '٦ أشهر' },
  { id: 'YTD', labelEn: 'YTD', labelAr: 'منذ البداية' },
  { id: '1Y', labelEn: '1Y', labelAr: 'سنة' },
  { id: 'ALL', labelEn: 'All', labelAr: 'الكل' },
];

const ANCHOR_END = '2025-12-28';

function getDatesForPreset(preset: TimeRangePreset): { start: string; end: string } {
  switch (preset) {
    case '1M':
      return { start: '2025-11-28', end: ANCHOR_END };
    case '3M':
      return { start: '2025-09-28', end: ANCHOR_END };
    case '6M':
      return { start: '2025-06-28', end: ANCHOR_END };
    case 'YTD':
      return { start: '2025-01-01', end: ANCHOR_END };
    case '1Y':
    case 'ALL':
    default:
      return { start: '2025-01-05', end: ANCHOR_END };
  }
}

export default function StrategyTimeRangeSelector({
  startDate,
  endDate,
  locale,
  onChange,
}: StrategyTimeRangeSelectorProps) {
  const isAr = locale === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<TimeRangePreset>('1Y');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectPreset = (preset: TimeRangePreset) => {
    setActivePreset(preset);
    const { start, end } = getDatesForPreset(preset);
    onChange(start, end, preset);
  };

  const handleStartChange = (val: string) => {
    setActivePreset('CUSTOM');
    onChange(val, endDate, 'CUSTOM');
  };

  const handleEndChange = (val: string) => {
    setActivePreset('CUSTOM');
    onChange(startDate, val, 'CUSTOM');
  };

  return (
    <div ref={containerRef} className="relative inline-block text-start">
      {/* Trigger Button: Exact height (h-9) and architecture matching .seg-control */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={isAr ? 'تحديد النطاق الزمني' : 'Select time range'}
        className={`filter-control-btn inline-flex items-center gap-2 cursor-pointer select-none transition-all ${
          isOpen ? 'filter-control-btn-active active border-white/30' : 'hover:border-white/20'
        }`}
      >
        <Calendar size={13} className="text-white/60 shrink-0" />
        <span className="inline-flex items-center gap-1.5 tabular-nums font-sans text-xs">
          {activePreset !== 'CUSTOM' && (
            <span className="rounded border border-white/10 bg-white/[0.06] px-1 py-0.2 text-[10px] font-semibold text-white/75">
              {activePreset}
            </span>
          )}
          <span className="text-white/90">{startDate}</span>
          <span className="text-white/35">→</span>
          <span className="text-white/90">{endDate}</span>
        </span>
        <ChevronDown
          size={12}
          className={`text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={isAr ? 'نطاق التاريخ' : 'Date range selector'}
          className="absolute top-full mt-2 end-0 z-50 w-72 sm:w-80 rounded-xl border border-white/10 bg-black p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="font-sans text-xs font-semibold text-white">
              {isAr ? 'النطاق الزمني للاختبار' : 'Backtest Time Range'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={13} />
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="mt-3">
            <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
              {isAr ? 'الفترات السريعة' : 'Quick Presets'}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`min-h-7.5 rounded-lg border px-2 font-sans text-[11px] font-semibold transition-all ${
                    activePreset === preset.id
                      ? 'border-white/30 bg-white/15 text-white shadow-xs'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {isAr ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="my-3 h-px bg-white/10" />

          {/* Custom Date Pickers */}
          <div>
            <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
              {isAr ? 'تاريخ مخصص' : 'Custom Dates'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-sans text-[10px] text-white/50">{isAr ? 'من' : 'From'}</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 font-sans text-[11px] tabular-nums text-white [color-scheme:dark] outline-none transition-colors hover:border-white/20 focus:border-white/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-[10px] text-white/50">{isAr ? 'إلى' : 'To'}</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 font-sans text-[11px] tabular-nums text-white [color-scheme:dark] outline-none transition-colors hover:border-white/20 focus:border-white/40"
                />
              </label>
            </div>
          </div>

          {/* Footer Done Action */}
          <div className="mt-3.5 pt-2.5 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex min-h-7.5 items-center justify-center rounded-lg bg-white/10 px-3 font-sans text-xs font-semibold text-white transition-colors hover:bg-white/20 cursor-pointer"
            >
              {isAr ? 'تطبيق' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

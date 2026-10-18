'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from '@/components/ui/icon-library';

export type TimeRangePreset = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

interface StrategyTimeRangeSelectorProps {
  readonly startDate: string;
  readonly endDate: string;
  readonly locale: 'en' | 'ar';
  readonly onChange: (startDate: string, endDate: string, preset: TimeRangePreset) => void;
  readonly purpose?: 'chart' | 'backtest';
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
const SAMPLE_START = '2025-01-05';

function getDatesForPreset(preset: TimeRangePreset, purpose: 'chart' | 'backtest'): { start: string; end: string } {
  if (purpose === 'backtest') {
    const end = new Date();
    const start = new Date(end);
    if (preset === 'ALL') return { start: '2000-01-01', end: end.toISOString().slice(0, 10) };
    if (preset === 'YTD') return { start: `${end.getUTCFullYear()}-01-01`, end: end.toISOString().slice(0, 10) };
    if (preset === '1M' || preset === '3M' || preset === '6M') start.setUTCMonth(start.getUTCMonth() - Number.parseInt(preset, 10));
    else start.setUTCFullYear(start.getUTCFullYear() - 1);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  switch (preset) {
    case '1M':
      return { start: '2025-11-28', end: ANCHOR_END };
    case '3M':
      return { start: '2025-09-28', end: ANCHOR_END };
    case '6M':
      return { start: '2025-06-28', end: ANCHOR_END };
    case 'YTD':
      return { start: SAMPLE_START, end: ANCHOR_END };
    case '1Y':
    case 'ALL':
    default:
      return { start: SAMPLE_START, end: ANCHOR_END };
  }
}

export default function StrategyTimeRangeSelector({
  startDate,
  endDate,
  locale,
  onChange,
  purpose = 'chart',
}: StrategyTimeRangeSelectorProps) {
  const isAr = locale === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<TimeRangePreset>('CUSTOM');
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
    const { start, end } = getDatesForPreset(preset, purpose);
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
        aria-label={purpose === 'backtest' ? (isAr ? 'فترة الاختبار الخلفي' : 'Backtest period') : (isAr ? 'نافذة الرسم البياني' : 'Chart window')}
        className={`filter-control-btn inline-flex items-center gap-2 cursor-pointer select-none transition-all ${
          isOpen ? 'filter-control-btn-active active border-plt-border' : 'hover:border-plt-border-soft'
        }`}
      >
        <Calendar size={13} className="text-plt-muted shrink-0" />
        <span className="inline-flex items-center gap-1.5 tabular-nums font-sans text-xs">
          {activePreset !== 'CUSTOM' && (
            <span className="rounded border border-plt-border bg-plt-hover px-1 py-0.2 text-[10px] font-semibold text-plt-subtle">
              {activePreset}
            </span>
          )}
          <span className="text-plt-text">{startDate}</span>
          <span className="text-plt-faint">→</span>
          <span className="text-plt-text">{endDate}</span>
        </span>
        <ChevronDown
          size={12}
          className={`text-plt-faint transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-plt-text' : ''}`}
        />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={isAr ? 'نطاق التاريخ' : 'Date range selector'}
          className="absolute top-full mt-2 end-0 z-50 w-72 sm:w-80 rounded-xl border border-plt-border bg-plt-base p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-plt-border pb-2.5">
            <span className="font-sans text-xs font-semibold text-plt-text">
              {purpose === 'backtest' ? (isAr ? 'فترة الاختبار الخلفي' : 'Backtest period') : (isAr ? 'نافذة الرسم البياني' : 'Chart window')}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-plt-faint hover:bg-plt-hover hover:text-plt-text transition-colors"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={13} />
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="mt-3">
            <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-plt-faint">
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
                      ? 'border-plt-border bg-plt-active text-plt-text shadow-xs'
                      : 'border-plt-border-soft bg-plt-hover text-plt-muted hover:border-plt-border hover:bg-plt-active hover:text-plt-text'
                  }`}
                >
                  {isAr ? preset.labelAr : preset.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="my-3 h-px bg-plt-border" />

          {/* Custom Date Pickers */}
          <div>
            <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-plt-faint">
              {isAr ? 'تاريخ مخصص' : 'Custom Dates'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-sans text-[10px] text-plt-muted">{isAr ? 'من' : 'From'}</span>
                <input
                  type="date"
                  value={startDate}
                  min={purpose === 'backtest' ? '2000-01-01' : SAMPLE_START}
                  max={endDate}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-plt-border bg-plt-hover px-2.5 font-sans text-[11px] tabular-nums text-plt-text outline-none transition-colors hover:border-plt-border-soft focus:border-plt-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-sans text-[10px] text-plt-muted">{isAr ? 'إلى' : 'To'}</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={purpose === 'backtest' ? undefined : ANCHOR_END}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-plt-border bg-plt-hover px-2.5 font-sans text-[11px] tabular-nums text-plt-text outline-none transition-colors hover:border-plt-border-soft focus:border-plt-border"
                />
              </label>
            </div>
          </div>

          {/* Footer Done Action */}
          <div className="mt-3.5 pt-2.5 border-t border-plt-border flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex min-h-7.5 items-center justify-center rounded-lg bg-plt-active px-3 font-sans text-xs font-semibold text-plt-text transition-colors hover:bg-plt-hover cursor-pointer"
            >
              {isAr ? 'تطبيق' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

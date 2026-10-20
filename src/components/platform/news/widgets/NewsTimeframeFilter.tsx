'use client';

import React from 'react';
import { Calendar, RotateCcw } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

export type TimeframePreset = 'today' | '1M' | '3M' | '6M' | 'YTD';

export interface NewsTimeframeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  activePreset: TimeframePreset | null;
  onSelectPreset: (preset: TimeframePreset | null) => void;
  onResetTimeframe: () => void;
  className?: string;
  showTitle?: boolean;
}

export const TIMEFRAME_PRESETS: Array<{
  id: TimeframePreset;
  labelEn: string;
  labelAr: string;
}> = [
  { id: 'today', labelEn: 'Today', labelAr: 'اليوم' },
  { id: '1M', labelEn: '1M', labelAr: '1M' },
  { id: '3M', labelEn: '3M', labelAr: '3M' },
  { id: '6M', labelEn: '6M', labelAr: '6M' },
  { id: 'YTD', labelEn: 'YTD', labelAr: 'YTD' },
];

export function formatYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeTimeframePreset(
  preset: TimeframePreset,
  refDate: Date = new Date()
): { from: string; to: string } {
  const to = formatYmd(refDate);
  const now = new Date(refDate);

  switch (preset) {
    case 'today':
      return { from: to, to };
    case '1M': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return { from: formatYmd(d), to };
    }
    case '3M': {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { from: formatYmd(d), to };
    }
    case '6M': {
      const d = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      return { from: formatYmd(d), to };
    }
    case 'YTD': {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: formatYmd(d), to };
    }
  }
}

export function detectMatchingPreset(
  from: string,
  to: string,
  refDate: Date = new Date()
): TimeframePreset | null {
  if (!from || !to) return null;
  for (const preset of TIMEFRAME_PRESETS) {
    const computed = computeTimeframePreset(preset.id, refDate);
    if (computed.from === from && computed.to === to) {
      return preset.id;
    }
  }
  return null;
}

export default function NewsTimeframeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  activePreset,
  onSelectPreset,
  onResetTimeframe,
  className = '',
  showTitle = true,
}: NewsTimeframeFilterProps) {
  const { locale } = useTranslation();
  const hasActiveFilter = Boolean(startDate || endDate || activePreset);

  const handlePresetClick = (presetId: TimeframePreset) => {
    if (activePreset === presetId) {
      // Toggle off when clicking already active preset
      onResetTimeframe();
      return;
    }
    const { from, to } = computeTimeframePreset(presetId);
    onStartDateChange(from);
    onEndDateChange(to);
    onSelectPreset(presetId);
  };

  const handleStartDateChange = (val: string) => {
    onStartDateChange(val);
    const matched = detectMatchingPreset(val, endDate);
    onSelectPreset(matched);
  };

  const handleEndDateChange = (val: string) => {
    onEndDateChange(val);
    const matched = detectMatchingPreset(startDate, val);
    onSelectPreset(matched);
  };

  return (
    <div
      data-tour="news-timeframe-filter"
      className={`w-full flex flex-col select-none font-sans ${className}`}
    >
      {/* Optional Title Header */}
      {showTitle && (
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-plt-border-soft">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-plt-muted" />
            <span className="font-semibold text-[10px] tracking-wider uppercase text-plt-muted">
              {locale === 'ar' ? 'الفترة الزمنية' : 'Timeframe'}
            </span>
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetTimeframe}
              className="text-[10px] text-plt-muted hover:text-plt-text flex items-center gap-1 cursor-pointer transition-colors"
              title={locale === 'ar' ? 'إعادة ضبط الفترة' : 'Reset timeframe'}
            >
              <span>{locale === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      )}

      {/* Line 1: Timeframe selector (from and to) on ONE line */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="flex flex-col min-w-0">
          <label className="text-[10px] text-plt-faint mb-1 truncate block">
            {locale === 'ar' ? 'من' : 'From'}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full h-7 px-2 text-[11px] rounded-lg bg-plt-hover border border-plt-border text-plt-text tabular-nums outline-none focus:border-[#1d9bf0] transition-colors [color-scheme:dark]"
            aria-label={locale === 'ar' ? 'تاريخ البداية' : 'Start date'}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <label className="text-[10px] text-plt-faint mb-1 truncate block">
            {locale === 'ar' ? 'إلى' : 'To'}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full h-7 px-2 text-[11px] rounded-lg bg-plt-hover border border-plt-border text-plt-text tabular-nums outline-none focus:border-[#1d9bf0] transition-colors [color-scheme:dark]"
            aria-label={locale === 'ar' ? 'تاريخ النهاية' : 'End date'}
          />
        </div>
      </div>

      {/* Line 2: 5 quick date selection buttons (today, 1M, 3M, 6M, YTD) */}
      <div className="grid grid-cols-5 gap-1">
        {TIMEFRAME_PRESETS.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.id)}
              className={`h-6.5 flex items-center justify-center rounded-md text-[10.5px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1d9bf0] text-black font-semibold shadow-xs'
                  : 'bg-plt-hover border border-plt-border-soft text-plt-muted hover:text-plt-text hover:border-plt-border hover:bg-plt-active'
              }`}
              title={p.labelEn}
            >
              {locale === 'ar' ? p.labelAr : p.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}

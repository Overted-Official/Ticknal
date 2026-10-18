'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  RotateCcw,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';

export type TimePreset = 'THIS_MONTH' | 'LAST_MONTH' | '3M' | '6M' | 'YTD' | 'ALL' | 'CUSTOM' | 'RANGE';

export interface DateRangeFilter {
  preset: TimePreset;
  selectedMonth: string; // 'YYYY-MM'
  startDate?: string;    // 'YYYY-MM-DD'
  endDate?: string;      // 'YYYY-MM-DD'
}

interface TransactionsDateRangeSelectorProps {
  currentFilter: DateRangeFilter;
  onChange: (filter: DateRangeFilter) => void;
  monthEntriesCount: Record<string, number>;
  totalEntriesCount: number;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function TransactionsDateRangeSelector({
  currentFilter,
  onChange,
  monthEntriesCount,
  totalEntriesCount,
}: TransactionsDateRangeSelectorProps) {
  const { locale, isRTL } = useTranslation();
  const isAr = locale === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentYearMonth = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  const prevMonthDate = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
  const lastYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Calendar year shown in month grid
  const initialYear = useMemo(() => {
    if (currentFilter.selectedMonth && currentFilter.selectedMonth.length >= 4) {
      const parsedYear = Number(currentFilter.selectedMonth.slice(0, 4));
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return currentYear;
  }, [currentFilter.selectedMonth, currentYear]);

  const [calendarYear, setCalendarYear] = useState<number>(initialYear);

  // Custom range input state
  const [customStart, setCustomStart] = useState<string>(currentFilter.startDate || '');
  const [customEnd, setCustomEnd] = useState<string>(currentFilter.endDate || '');
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState<boolean>(currentFilter.preset === 'RANGE');

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sync calendar year when filter month changes
  useEffect(() => {
    if (currentFilter.selectedMonth && currentFilter.selectedMonth.length >= 4) {
      const y = Number(currentFilter.selectedMonth.slice(0, 4));
      if (!isNaN(y)) setCalendarYear(y);
    }
  }, [currentFilter.selectedMonth]);

  const formatMonthName = (ym: string): string => {
    if (!ym || ym.length < 7) return ym;
    const [year, month] = ym.split('-');
    const idx = Number(month) - 1;
    const names = isAr ? MONTH_NAMES_AR : MONTH_NAMES_EN;
    return `${names[idx] || month} ${year}`;
  };

  const formatShortDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = parts[2];
        const m = Number(parts[1]) - 1;
        const shortMonths = isAr ? MONTH_NAMES_AR : MONTH_SHORT_EN;
        return `${d} ${shortMonths[m] || parts[1]}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Label displayed inside the trigger button
  const displayLabel = useMemo(() => {
    switch (currentFilter.preset) {
      case 'THIS_MONTH':
        return formatMonthName(currentYearMonth);
      case 'LAST_MONTH':
        return formatMonthName(lastYearMonth);
      case '3M':
        return isAr ? 'آخر 3 أشهر' : 'Trailing 3 Months';
      case '6M':
        return isAr ? 'آخر 6 أشهر' : 'Trailing 6 Months';
      case 'YTD':
        return isAr ? 'منذ بداية السنة' : 'Year to Date';
      case 'ALL':
        return isAr ? 'كافة الفترات' : 'All Time';
      case 'RANGE':
        if (currentFilter.startDate && currentFilter.endDate) {
          return `${formatShortDate(currentFilter.startDate)} → ${formatShortDate(currentFilter.endDate)}`;
        }
        return isAr ? 'نطاق مخصص' : 'Custom Range';
      case 'CUSTOM':
      default:
        return formatMonthName(currentFilter.selectedMonth);
    }
  }, [currentFilter, currentYearMonth, lastYearMonth, isAr]);

  // Step 1 month back
  const handlePrevMonth = () => {
    const activeYm = currentFilter.selectedMonth || currentYearMonth;
    const [y, m] = activeYm.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    onChange({
      preset: prevYm === currentYearMonth ? 'THIS_MONTH' : prevYm === lastYearMonth ? 'LAST_MONTH' : 'CUSTOM',
      selectedMonth: prevYm,
    });
  };

  // Step 1 month forward
  const handleNextMonth = () => {
    const activeYm = currentFilter.selectedMonth || currentYearMonth;
    const [y, m] = activeYm.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextYm = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    onChange({
      preset: nextYm === currentYearMonth ? 'THIS_MONTH' : nextYm === lastYearMonth ? 'LAST_MONTH' : 'CUSTOM',
      selectedMonth: nextYm,
    });
  };

  const handleSelectPreset = (preset: TimePreset) => {
    setShowCustomRangeInputs(false);
    if (preset === 'THIS_MONTH') {
      onChange({ preset: 'THIS_MONTH', selectedMonth: currentYearMonth });
    } else if (preset === 'LAST_MONTH') {
      onChange({ preset: 'LAST_MONTH', selectedMonth: lastYearMonth });
    } else {
      onChange({ preset, selectedMonth: currentFilter.selectedMonth || currentYearMonth });
    }
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIdx: number) => {
    const ym = `${calendarYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    let preset: TimePreset = 'CUSTOM';
    if (ym === currentYearMonth) preset = 'THIS_MONTH';
    else if (ym === lastYearMonth) preset = 'LAST_MONTH';

    onChange({ preset, selectedMonth: ym });
    setIsOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    onChange({
      preset: 'RANGE',
      selectedMonth: customStart.slice(0, 7),
      startDate: customStart,
      endDate: customEnd,
    });
    setIsOpen(false);
  };

  const handleResetToCurrent = () => {
    onChange({ preset: 'THIS_MONTH', selectedMonth: currentYearMonth });
    setCalendarYear(currentYear);
    setShowCustomRangeInputs(false);
    setIsOpen(false);
  };

  // Month grid entries counter for currently viewed calendar year
  const yearEntriesCount = useMemo(() => {
    let count = 0;
    for (const [ym, entries] of Object.entries(monthEntriesCount)) {
      if (ym.startsWith(`${calendarYear}-`)) {
        count += entries;
      }
    }
    return count;
  }, [monthEntriesCount, calendarYear]);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {/* Trigger: Unified TradingView-style segmented control */}
      <div className="inline-flex items-center rounded-xl border border-border-subtle bg-surface-raised h-9 p-0 text-xs overflow-hidden select-none">
        {/* Step Prev Month */}
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-full px-2.5 flex items-center justify-center hover:bg-plt-hover text-text-muted hover:text-text-primary transition-colors border-r border-plt-border rtl:border-r-0 rtl:border-l cursor-pointer"
          title={isAr ? 'الشهر السابق' : 'Previous Month'}
          aria-label={isAr ? 'الشهر السابق' : 'Previous Month'}
        >
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>

        {/* Center Trigger: Calendar Icon + Period Label + Chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-full px-3 flex items-center gap-2 hover:bg-plt-hover transition-colors cursor-pointer ${
            isOpen ? 'bg-plt-hover text-text-primary' : 'text-text-primary'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={isAr ? 'تحديد الفترة الزمنية' : 'Select Time Period'}
        >
          <Calendar className="w-3.5 h-3.5 text-brand-blue shrink-0" />
          <span className="tabular-nums font-semibold text-xs whitespace-nowrap">
            {displayLabel}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-text-muted shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Step Next Month */}
        <button
          type="button"
          onClick={handleNextMonth}
          className="h-full px-2.5 flex items-center justify-center hover:bg-plt-hover text-text-muted hover:text-text-primary transition-colors border-l border-plt-border rtl:border-l-0 rtl:border-r cursor-pointer"
          title={isAr ? 'الشهر التالي' : 'Next Month'}
          aria-label={isAr ? 'الشهر التالي' : 'Next Month'}
        >
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={isAr ? 'محدد الفترة الزمنية' : 'Time Period Selector'}
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-1.5 w-76 sm:w-80 rounded-xl bg-plt-base/95 backdrop-blur-xl border border-plt-border shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left rtl:text-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-plt-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-brand-blue" />
              <span className="text-xs font-semibold text-text-primary">
                {isAr ? 'الفترة الزمنية' : 'Time Period'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-plt-hover transition-colors cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="py-2.5 border-b border-plt-border">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              {isAr ? 'الفترات السريعة' : 'Quick Presets'}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'THIS_MONTH' as TimePreset, labelEn: 'This Month', labelAr: 'هذا الشهر' },
                { id: 'LAST_MONTH' as TimePreset, labelEn: 'Last Month', labelAr: 'الشهر الماضي' },
                { id: '3M' as TimePreset, labelEn: 'Trailing 3M', labelAr: 'آخر 3 أشهر' },
                { id: '6M' as TimePreset, labelEn: 'Trailing 6M', labelAr: 'آخر 6 أشهر' },
                { id: 'YTD' as TimePreset, labelEn: 'Year to Date', labelAr: 'منذ البداية' },
                { id: 'ALL' as TimePreset, labelEn: 'All Time', labelAr: 'كافة الفترات' },
              ].map((p) => {
                const isActive = currentFilter.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`h-7 px-2 text-[11px] font-medium rounded-lg border transition-all text-center truncate cursor-pointer ${
                      isActive
                        ? 'bg-brand-blue text-white border-brand-blue font-semibold shadow-sm'
                        : 'border-border-subtle bg-surface-raised hover:bg-white/[0.06] text-text-primary hover:border-border-default'
                    }`}
                  >
                    {isAr ? p.labelAr : p.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month & Year Matrix */}
          <div className="py-2.5 border-b border-plt-border">
            {/* Year Selector Navigation */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {isAr ? 'تصفح بالشهور' : 'Browse Months'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalendarYear((prev) => prev - 1)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-plt-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title={isAr ? 'السنة السابقة' : 'Previous Year'}
                >
                  <ChevronLeft className="w-3 h-3 rtl:rotate-180" />
                </button>
                <span className="text-xs font-bold text-text-primary tabular-nums px-1">
                  {calendarYear}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarYear((prev) => prev + 1)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-plt-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title={isAr ? 'السنة التالية' : 'Next Year'}
                >
                  <ChevronRight className="w-3 h-3 rtl:rotate-180" />
                </button>
              </div>
            </div>

            {/* 12-Month Matrix (4x3 Grid) */}
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }, (_, idx) => {
                const ym = `${calendarYear}-${String(idx + 1).padStart(2, '0')}`;
                const isSelected =
                  (currentFilter.preset === 'CUSTOM' ||
                    currentFilter.preset === 'THIS_MONTH' ||
                    currentFilter.preset === 'LAST_MONTH') &&
                  currentFilter.selectedMonth === ym;
                const isCurrentMonth = ym === currentYearMonth;
                const entriesCount = monthEntriesCount[ym] || 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    className={`h-9 px-1 rounded-lg border text-xs flex flex-col items-center justify-center transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-brand-blue text-white border-brand-blue font-semibold shadow-sm'
                        : isCurrentMonth
                        ? 'border-brand-blue/50 bg-plt-hover text-text-primary font-medium hover:border-brand-blue'
                        : 'border-border-subtle bg-surface-raised hover:bg-white/[0.06] text-text-primary hover:border-border-default'
                    }`}
                  >
                    <span className="leading-tight truncate">
                      {isAr ? MONTH_NAMES_AR[idx] : MONTH_SHORT_EN[idx]}
                    </span>
                    {entriesCount > 0 && (
                      <span
                        className={`text-[9px] tabular-nums leading-none mt-0.5 ${
                          isSelected ? 'text-plt-subtle' : 'text-text-muted'
                        }`}
                      >
                        {entriesCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Accordion / Inputs */}
          <div className="pt-2.5">
            <button
              type="button"
              onClick={() => setShowCustomRangeInputs(!showCustomRangeInputs)}
              className="w-full flex items-center justify-between text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors py-1 cursor-pointer"
            >
              <span>{isAr ? 'نطاق تواريخ مخصص' : 'Custom Date Range'}</span>
              <ChevronDown
                className={`w-3 h-3 text-text-muted transition-transform duration-200 ${
                  showCustomRangeInputs ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showCustomRangeInputs && (
              <form onSubmit={handleApplyCustomRange} className="mt-2 space-y-2 pt-1 border-t border-plt-border-soft">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">
                      {isAr ? 'من تاريخ' : 'Start Date'}
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-surface-raised text-text-primary text-xs outline-none focus:border-brand-blue tabular-nums"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-muted block">
                      {isAr ? 'إلى تاريخ' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-border-subtle bg-surface-raised text-text-primary text-xs outline-none focus:border-brand-blue tabular-nums"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 h-8 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {isAr ? 'تطبيق النطاق' : 'Apply Range'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToCurrent}
                    className="h-8 px-2.5 rounded-lg border border-border-subtle hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1 cursor-pointer"
                    title={isAr ? 'إعادة ضبط' : 'Reset'}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Check,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { localizeSectorName } from '@/lib/finance/sector-translations';

export type SectorStatusFilter =
  | 'ALL'
  | 'LEADING'
  | 'IMPROVING'
  | 'WEAKENING'
  | 'LAGGING'
  | 'ADVANCING'
  | 'DECLINING';

export interface WatchlistFilterConfig {
  isActive: boolean;
  // Strategy signals filter
  signalEnabled: boolean;
  strategies: string[]; // ['typhon', 'cerberus', 'hydra']
  signals: ('BUY' | 'SELL')[];
  lookbackDays: number; // 1, 3, 5, 7, 14, 30, or custom N
  // Sector filter
  sector: string; // 'ALL' or specific sector name
  // Sector status filter
  sectorStatus: SectorStatusFilter;
}

export type SignalFilterConfig = WatchlistFilterConfig;

export const DEFAULT_WATCHLIST_FILTER: WatchlistFilterConfig = {
  isActive: false,
  signalEnabled: true,
  strategies: ['typhon', 'cerberus', 'hydra'],
  signals: ['BUY'],
  lookbackDays: 5,
  sector: 'ALL',
  sectorStatus: 'ALL',
};

export const DEFAULT_SIGNAL_FILTER = DEFAULT_WATCHLIST_FILTER;

interface WatchlistSignalFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  filter: WatchlistFilterConfig;
  onChange: (newFilter: WatchlistFilterConfig) => void;
  matchingCount: number;
  totalCount: number;
  availableSectors?: string[];
}

const STRATEGY_OPTIONS = [
  {
    id: 'typhon',
    labelEn: 'Typhon Strategy',
    labelAr: 'استراتيجية تايفون',
    subEn: 'Consensus & Inflection',
    subAr: 'التوافق والانعطاف',
    badge: 'TYPHON',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    id: 'cerberus',
    labelEn: 'Cerberus Strategy',
    labelAr: 'استراتيجية سيربيروس',
    subEn: '3-Vector Momentum Architecture',
    subAr: 'هيكل الزخم ثلاثي المتجهات',
    badge: 'CERBERUS',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  {
    id: 'hydra',
    labelEn: 'Hydra Strategy',
    labelAr: 'استراتيجية هيدرا',
    subEn: 'Adaptive Volatility Synchronizer',
    subAr: 'مزامنة التقلبات التكيفية',
    badge: 'HYDRA',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
];

const LOOKBACK_OPTIONS = [
  { value: 1, label: '1D', descEn: 'Today', descAr: 'اليوم' },
  { value: 3, label: '3D', descEn: '3 Days', descAr: '3 أيام' },
  { value: 5, label: '5D', descEn: '5 Days', descAr: '5 أيام' },
  { value: 7, label: '7D', descEn: '1 Week', descAr: 'أسبوع' },
  { value: 14, label: '14D', descEn: '2 Weeks', descAr: 'أسبوعان' },
  { value: 30, label: '30D', descEn: '1 Month', descAr: 'شهر' },
];

const SECTOR_STATUS_OPTIONS: Array<{
  id: SectorStatusFilter;
  labelEn: string;
  labelAr: string;
  color?: string;
}> = [
  { id: 'ALL', labelEn: 'All Statuses', labelAr: 'جميع الحالات' },
  { id: 'LEADING', labelEn: 'Leading (RSI/Alpha)', labelAr: 'رائد ومتقدم', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  { id: 'IMPROVING', labelEn: 'Improving Momentum', labelAr: 'في تحسن', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'WEAKENING', labelEn: 'Weakening Momentum', labelAr: 'في ضعف', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'LAGGING', labelEn: 'Lagging Behind', labelAr: 'متراجع ومتأخر', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { id: 'ADVANCING', labelEn: 'Advancing Today (Green)', labelAr: 'صاعد اليوم (أخضر)', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'DECLINING', labelEn: 'Declining Today (Red)', labelAr: 'هابط اليوم (أحمر)', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
];

const FALLBACK_EGX_SECTORS = [
  'Banks',
  'Basic Resources',
  'Building Materials',
  'Contracting & Construction Services',
  'Education Services',
  'Energy',
  'Financial Services',
  'Food, Beverage and Tobacco',
  'Health Care & Pharmaceuticals',
  'Industrial Goods, Services and Automobiles',
  'Non-Bank Financial Services',
  'Real Estate',
  'Shipping & Transportation Services',
  'Telecommunications, Media and Technology (TMT)',
  'Tourism & Entertainment',
  'Trade & Distributors',
  'Utilities',
];

export default function WatchlistSignalFilterPopover({
  isOpen,
  onClose,
  filter,
  onChange,
  matchingCount,
  totalCount,
  availableSectors = [],
}: WatchlistSignalFilterPopoverProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const popoverRef = useRef<HTMLDivElement>(null);
  const [customDays, setCustomDays] = useState<string>(
    [1, 3, 5, 7, 14, 30].includes(filter.lookbackDays) ? '' : String(filter.lookbackDays)
  );

  // Close when clicking outside or pressing Escape
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
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleMasterActive = () => {
    onChange({
      ...filter,
      isActive: !filter.isActive,
    });
  };

  const handleReset = () => {
    setCustomDays('');
    onChange({
      ...DEFAULT_WATCHLIST_FILTER,
      isActive: false,
    });
  };

  // Toggle Strategy
  const toggleStrategy = (id: string) => {
    let next: string[];
    if (filter.strategies.includes(id)) {
      if (filter.strategies.length === 1) return; // Keep at least 1
      next = filter.strategies.filter((s) => s !== id);
    } else {
      next = [...filter.strategies, id];
    }
    onChange({
      ...filter,
      strategies: next,
      signalEnabled: true,
      isActive: true,
    });
  };

  // Toggle Signal Direction (BUY / SELL)
  const toggleSignal = (sig: 'BUY' | 'SELL') => {
    let next: ('BUY' | 'SELL')[];
    if (filter.signals.includes(sig)) {
      if (filter.signals.length === 1) return; // Keep at least 1
      next = filter.signals.filter((s) => s !== sig);
    } else {
      next = [...filter.signals, sig];
    }
    onChange({
      ...filter,
      signals: next,
      signalEnabled: true,
      isActive: true,
    });
  };

  // Lookback window
  const setLookback = (days: number) => {
    setCustomDays('');
    onChange({
      ...filter,
      lookbackDays: days,
      signalEnabled: true,
      isActive: true,
    });
  };

  const handleCustomDaysChange = (val: string) => {
    setCustomDays(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 120) {
      onChange({
        ...filter,
        lookbackDays: num,
        signalEnabled: true,
        isActive: true,
      });
    }
  };

  // Sector filter change
  const setSector = (sector: string) => {
    onChange({
      ...filter,
      sector,
      isActive: true,
    });
  };

  // Sector status filter change
  const setSectorStatus = (status: SectorStatusFilter) => {
    onChange({
      ...filter,
      sectorStatus: status,
      isActive: true,
    });
  };

  // Toggle Signal Filtering on/off specifically
  const toggleSignalFilterEnabled = () => {
    onChange({
      ...filter,
      signalEnabled: !filter.signalEnabled,
      isActive: true,
    });
  };

  const sectorList = availableSectors.length > 0 ? availableSectors : FALLBACK_EGX_SECTORS;

  return (
    <div
      ref={popoverRef}
      className="absolute top-11 ltr:right-0 rtl:left-0 z-50 w-80 max-w-[92vw] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-lg border border-plt-border bg-plt-base/95 backdrop-blur-md shadow-popover p-3 text-plt-text text-[11px] select-none animate-in fade-in zoom-in-95 duration-150 font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-plt-accent" />
          <span className="font-semibold text-[12px] text-white">
            {isAr ? 'تصفية الإشارات والقطاعات' : 'Signal & Sector Filter'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(filter.isActive || filter.sector !== 'ALL' || filter.sectorStatus !== 'ALL' || !filter.signalEnabled) && (
            <button
              type="button"
              onClick={handleReset}
              title={isAr ? 'إعادة ضبط للافتراضي' : 'Reset to default'}
              className="text-text-muted hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-[10px]"
            >
              <RotateCcw size={10} />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="text-text-muted hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Master Enable/Disable Bar */}
      <div className="flex items-center justify-between bg-black/40 border border-white/[0.08] rounded-md p-2 mb-3">
        <div className="flex flex-col">
          <span className="font-medium text-[11px] text-white">
            {isAr ? 'تفعيل التصفية الشاملة' : 'Enable Watchlist Filter'}
          </span>
          <span className="text-[10px] text-text-muted">
            {filter.isActive
              ? isAr
                ? `التصفية نشطة (${matchingCount} أوراق مطابقة)`
                : `Active (${matchingCount} of ${totalCount} matched)`
              : isAr
              ? 'عرض جميع الأوراق المالية'
              : 'Showing all tickers'}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMasterActive}
          aria-label={isAr ? 'تفعيل التصفية' : 'Toggle filter active'}
          className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            filter.isActive ? 'bg-plt-accent' : 'bg-white/20'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              filter.isActive ? (isAr ? '-translate-x-3.5' : 'translate-x-3.5') : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* SECTION 1: STRATEGY SIGNALS */}
      <div className="mb-3.5 border-b border-white/[0.06] pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">
              {isAr ? 'إشارات النماذج' : 'Strategy Signals'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSignalFilterEnabled}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
              filter.signalEnabled
                ? 'bg-plt-accent/15 border-plt-accent/40 text-plt-accent font-medium'
                : 'bg-white/[0.04] border-white/10 text-text-muted hover:text-white'
            }`}
          >
            {filter.signalEnabled ? (isAr ? 'مفعّلة' : 'Enabled') : (isAr ? 'تجاهل الإشارات' : 'Bypassed')}
          </button>
        </div>

        {filter.signalEnabled && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {/* Signal Direction (BUY / SELL) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => toggleSignal('BUY')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all ${
                  filter.signals.includes('BUY')
                    ? 'bg-plt-profit/15 border-plt-profit/50 text-plt-profit'
                    : 'bg-transparent border-white/10 text-text-muted hover:bg-white/[0.04]'
                }`}
              >
                <TrendingUp size={12} />
                <span>{isAr ? 'إشارات شراء' : 'Buy Signals'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleSignal('SELL')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all ${
                  filter.signals.includes('SELL')
                    ? 'bg-plt-risk/15 border-plt-risk/50 text-plt-risk'
                    : 'bg-transparent border-white/10 text-text-muted hover:bg-white/[0.04]'
                }`}
              >
                <TrendingDown size={12} />
                <span>{isAr ? 'إشارات بيع' : 'Sell Signals'}</span>
              </button>
            </div>

            {/* Toggled Strategies */}
            <div>
              <div className="text-[10px] font-medium text-text-muted mb-1 flex items-center justify-between">
                <span>{isAr ? 'النماذج الاستراتيجية المفعّلة' : 'Toggled Strategies'}</span>
                <span className="text-[9px] text-text-faint">{isAr ? 'اختر 1 أو أكثر' : 'select 1+'}</span>
              </div>
              <div className="space-y-1">
                {STRATEGY_OPTIONS.map((strat) => {
                  const isSelected = filter.strategies.includes(strat.id);
                  return (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => toggleStrategy(strat.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md border text-start transition-all ${
                        isSelected
                          ? 'bg-white/[0.06] border-white/20 text-white'
                          : 'bg-transparent border-white/[0.06] text-text-muted hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-plt-accent border-plt-accent text-black'
                              : 'border-white/20 bg-black/40'
                          }`}
                        >
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                        </div>
                        <div className="flex flex-col min-w-0 text-start">
                          <span className="font-medium truncate text-[11px] leading-tight">
                            {isAr ? strat.labelAr : strat.labelEn}
                          </span>
                          <span className="text-[9px] text-text-muted truncate leading-tight">
                            {isAr ? strat.subAr : strat.subEn}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-sans font-semibold px-1 py-0.5 rounded border shrink-0 ${strat.color}`}>
                        {strat.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lookback Window (N days) */}
            <div>
              <div className="text-[10px] font-medium text-text-muted mb-1 flex items-center justify-between">
                <span>{isAr ? 'المدى الزمني للإشارة' : 'Lookback Window (N days)'}</span>
                <span className="text-[9px] font-sans tabular-nums text-white">
                  {isAr ? `خلال آخر ${filter.lookbackDays} أيام` : `within last ${filter.lookbackDays} days`}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1 mb-1.5">
                {LOOKBACK_OPTIONS.map((opt) => {
                  const isSelected = filter.lookbackDays === opt.value && !customDays;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLookback(opt.value)}
                      title={isAr ? opt.descAr : opt.descEn}
                      className={`flex flex-col items-center justify-center py-1 rounded border text-[10px] font-sans tabular-nums transition-all ${
                        isSelected
                          ? 'bg-plt-accent/20 border-plt-accent text-plt-accent font-semibold shadow-xs'
                          : 'bg-transparent border-white/10 text-text-muted hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Custom N days input */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-text-muted shrink-0">
                  {isAr ? 'أو أدخل عدد الأيام (N):' : 'Or custom (N days):'}
                </span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDays}
                  placeholder={String(filter.lookbackDays)}
                  onChange={(e) => handleCustomDaysChange(e.target.value)}
                  className="w-16 h-6 px-2 rounded bg-black/50 border border-white/15 text-[11px] font-sans tabular-nums text-white placeholder:text-text-muted focus:border-plt-accent focus:outline-none text-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SECTOR SELECTION */}
      <div className="mb-3.5 border-b border-white/[0.06] pb-3">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-text-muted mb-1.5 flex items-center justify-between">
          <span>{isAr ? 'تصفية حسب القطاع' : 'Sector Filter'}</span>
          {filter.sector !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSector('ALL')}
              className="text-[9px] text-plt-accent hover:underline"
            >
              {isAr ? 'إلغاء تحديد القطاع' : 'Clear Sector'}
            </button>
          )}
        </div>
        <select
          value={filter.sector}
          onChange={(e) => setSector(e.target.value)}
          className="w-full h-8 px-2.5 rounded-md bg-black/60 border border-white/15 text-white text-[11px] font-sans focus:border-plt-accent focus:outline-none transition-colors"
        >
          <option value="ALL" className="bg-[#18181b] text-white">
            {isAr ? '— جميع القطاعات (الكل) —' : '— All Sectors (Entire Market) —'}
          </option>
          {sectorList.map((sec) => (
            <option key={sec} value={sec} className="bg-[#18181b] text-white">
              {localizeSectorName(sec, locale)}
            </option>
          ))}
        </select>
      </div>

      {/* SECTION 3: SECTOR STATUS & REGIME */}
      <div className="mb-3.5 pb-1">
        <div className="text-[10px] uppercase font-semibold tracking-wider text-text-muted mb-1.5 flex items-center justify-between">
          <span>{isAr ? 'حالة ونظام القطاع' : 'Sector Status & Regime'}</span>
          {filter.sectorStatus !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSectorStatus('ALL')}
              className="text-[9px] text-plt-accent hover:underline"
            >
              {isAr ? 'الكل' : 'All'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SECTOR_STATUS_OPTIONS.map((opt) => {
            const isSelected = filter.sectorStatus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSectorStatus(opt.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md border text-[10px] text-start transition-all ${
                  isSelected
                    ? 'bg-plt-accent/15 border-plt-accent text-white font-medium'
                    : 'bg-transparent border-white/[0.08] text-text-muted hover:bg-white/[0.04] hover:text-white'
                } ${opt.id === 'ALL' ? 'col-span-2 text-center justify-center font-medium' : ''}`}
              >
                <span className="truncate">{isAr ? opt.labelAr : opt.labelEn}</span>
                {isSelected && opt.id !== 'ALL' && (
                  <Check size={10} className="text-plt-accent shrink-0 ms-1 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: Live Count & Apply */}
      <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
        <div className="text-[10px] font-sans tabular-nums text-text-muted">
          {filter.isActive ? (
            <span className="text-plt-profit font-medium">
              {isAr ? `${matchingCount} من أصل ${totalCount} ورقة` : `${matchingCount} of ${totalCount} tickers`}
            </span>
          ) : (
            <span>{isAr ? `الإجمالي ${totalCount} ورقة` : `${totalCount} total tickers`}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!filter.isActive) {
              onChange({ ...filter, isActive: true });
            }
            onClose();
          }}
          className="px-3 py-1 rounded bg-plt-accent text-black font-semibold text-[10px] hover:opacity-90 transition-opacity cursor-pointer font-sans"
        >
          {isAr ? (filter.isActive ? 'تم' : 'تطبيق التصفية') : (filter.isActive ? 'Done' : 'Apply Filter')}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  ChevronDown,
  Check,
  Lock,
} from '@/components/ui/icon-library';
import type { ComputedReportMetrics, BacktestPreset } from './types';
import { useTranslation } from '@/lib/i18n';
import { normalizeStrategyId } from '@/strategies/registry';

interface StrategyReportHeaderProps {
  symbol: string;
  companyName?: string;
  logoUrl?: string | null;
  selectedStrategy: string;
  setSelectedStrategy?: (strategy: string) => void;
  strategyStartDate?: string;
  strategyEndDate?: string;
  onSelectPresetDate: (preset: BacktestPreset) => void;
  onSetCustomStartDate?: (date: string) => void;
  onSetCustomEndDate?: (date: string) => void;
  activePreset: BacktestPreset;
  metrics?: ComputedReportMetrics;
  hasTrades?: boolean;
  onExportCSV?: () => void;
  onClose: () => void;
  isStaff?: boolean;
  hasProprietaryAccess?: boolean;
  savedStrategies?: Array<{ id: string; name: string }>;
}

const PROPRIETARY_SWITCHERS = [
  { id: 'cerberus', name: 'Cerberus', nameAr: 'سيربيروس', champion: true },
  { id: 'typhon', name: 'Typhon', nameAr: 'تايفون', champion: false },
  { id: 'hydra', name: 'Hydra', nameAr: 'هيدرا', champion: false },
] as const;

const TIMEFRAME_PRESETS: { id: BacktestPreset; label: string }[] = [
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
];

export default function StrategyReportHeader({
  symbol,
  companyName,
  logoUrl,
  selectedStrategy,
  setSelectedStrategy,
  strategyStartDate,
  strategyEndDate,
  onSelectPresetDate,
  onSetCustomStartDate,
  onSetCustomEndDate,
  activePreset,
  onClose,
  isStaff = false,
  hasProprietaryAccess = false,
  savedStrategies = [],
}: StrategyReportHeaderProps) {
  const { locale, isRTL } = useTranslation();
  const isAr = locale === 'ar';
  const [imgError, setImgError] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [dropdownOpen]);

  const isPresetActive = (id: BacktestPreset) => {
    if (activePreset === id) return true;
    if (id === 'ytd' && (activePreset as string) === '2025') return true;
    return false;
  };

  // Resolve current active label
  const isCustomStrategy = selectedStrategy.startsWith('custom-');
  const matchedCustom = isCustomStrategy ? savedStrategies.find((s) => s.id === selectedStrategy) : null;
  const normalizedProp = normalizeStrategyId(selectedStrategy);

  let currentLabel = '';
  if (matchedCustom) {
    currentLabel = matchedCustom.name;
  } else if (isStaff) {
    const matchedProp = PROPRIETARY_SWITCHERS.find((s) => s.id === normalizedProp);
    currentLabel = matchedProp
      ? (isAr ? matchedProp.nameAr : matchedProp.name)
      : (isAr ? 'سيربيروس' : 'Cerberus');
  } else if (hasProprietaryAccess) {
    currentLabel = isAr ? 'الاستراتيجية المعتمدة' : 'Champion Strategy';
  } else {
    currentLabel = savedStrategies[0]?.name || (isAr ? 'اختر استراتيجية' : 'Select strategy');
  }

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="w-8 h-8 rounded-full bg-plt-hover hover:bg-plt-active active:bg-plt-active text-plt-subtle hover:text-plt-text transition-colors cursor-pointer flex items-center justify-center shrink-0"
      title={isAr ? 'إغلاق التقرير (Esc)' : 'Close Report (Esc)'}
      aria-label={isAr ? 'إغلاق تقرير الاستراتيجية' : 'Close Strategy Report Drawer'}
    >
      <X size={16} />
    </button>
  );

  return (
    <div className="min-h-14 sm:min-h-16 px-4 sm:px-6 py-2.5 xl:py-0 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 xl:gap-4 border-b border-plt-border shrink-0 bg-plt-base font-sans">
      {/* Top row on smaller screens / Left side on desktop: Company Info Lockup + Mobile Close */}
      <div className="flex items-center justify-between xl:justify-start gap-3 min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-plt-hover border border-plt-border overflow-hidden flex items-center justify-center shrink-0">
            {logoUrl && !imgError ? (
              <img
                src={logoUrl}
                alt={symbol}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-xs font-bold text-plt-text uppercase font-sans">
                {symbol.slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden leading-tight text-start">
            <span
              className="font-semibold text-xs sm:text-sm text-plt-text tracking-tight truncate block"
              title={companyName || symbol}
            >
              {companyName || symbol}
            </span>
            <span className="text-[10px] sm:text-[11px] text-plt-muted font-medium tabular-nums tracking-wide mt-0.5 truncate block">
              {symbol}
            </span>
          </div>
        </div>

        {/* Close button on viewports below xl */}
        <div className="xl:hidden shrink-0">
          {closeButton}
        </div>
      </div>

      {/* Bottom row on smaller screens / Right-aligned control cluster on desktop: Strategy Dropdown + Presets + Divider + Close Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar w-full xl:w-auto shrink-0 pb-0.5 xl:pb-0">
        {/* Strategy Selector Dropdown - Same design token as Strategies page (/strategies) */}
        {setSelectedStrategy && (
          <div ref={dropdownRef} className="relative min-w-36 sm:min-w-44 select-none shrink-0 font-sans">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-label={isAr ? 'اختر استراتيجية' : 'Select strategy'}
              className="flex h-8 sm:h-8.5 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-plt-border bg-plt-base px-3 font-sans text-xs font-semibold text-plt-text outline-none transition-all hover:border-plt-border-active focus:border-brand-blue"
            >
              <span className="truncate">{currentLabel}</span>
              <ChevronDown
                size={13}
                className={`shrink-0 text-plt-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180 text-plt-text' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="listbox"
                aria-label={isAr ? 'قائمة الاستراتيجيات' : 'Strategies list'}
                className="absolute start-0 z-50 min-w-[210px] w-max max-w-[280px] rounded-xl border border-white/15 bg-[#3D3D3D] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 top-full mt-1.5 font-sans"
              >
                {/* 1. STAFF ONLY: The 3 proprietary strategy models */}
                {isStaff && (
                  <>
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 select-none">
                      {isAr ? 'الاستراتيجيات المعتمدة' : 'Proprietary Models'}
                    </div>
                    {PROPRIETARY_SWITCHERS.map((strat) => {
                      const isSelected = normalizedProp === strat.id && !isCustomStrategy;
                      const name = isAr ? strat.nameAr : strat.name;
                      return (
                        <button
                          key={strat.id}
                          role="option"
                          type="button"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedStrategy(strat.id);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-white/10 font-semibold text-white'
                              : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{name}</span>
                            <Lock size={10} className="shrink-0 text-white/30" aria-label={isAr ? 'محمي' : 'Protected'} />
                          </div>
                          {isSelected && <Check size={12} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* 2. NON-STAFF WITH PROPRIETARY ACCESS: Single Champion Strategy option */}
                {!isStaff && hasProprietaryAccess && (
                  <button
                    key="champion-model"
                    role="option"
                    type="button"
                    aria-selected={!isCustomStrategy}
                    onClick={() => {
                      setSelectedStrategy('cerberus');
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium transition-colors ${
                      !isCustomStrategy
                        ? 'bg-white/10 font-semibold text-white'
                        : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{isAr ? 'الاستراتيجية المعتمدة' : 'Champion Strategy'}</span>
                      <Lock size={10} className="shrink-0 text-white/30" aria-label={isAr ? 'محمي' : 'Protected'} />
                    </div>
                    {!isCustomStrategy && <Check size={12} className="shrink-0 text-white" />}
                  </button>
                )}

                {/* 3. USER'S CUSTOM CREATED STRATEGIES */}
                {savedStrategies.length > 0 && (
                  <>
                    {(isStaff || hasProprietaryAccess) && (
                      <div className="my-1 border-t border-white/[0.08]" />
                    )}
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 select-none">
                      {isAr ? 'استراتيجياتي المخصصة' : 'My Custom Strategies'}
                    </div>
                    {savedStrategies.map((strat) => {
                      const isSelected = selectedStrategy === strat.id;
                      return (
                        <button
                          key={strat.id}
                          role="option"
                          type="button"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedStrategy(strat.id);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-white/10 font-semibold text-white'
                              : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{strat.name}</span>
                          {isSelected && <Check size={12} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Empty State when non-staff has no custom strategies */}
                {savedStrategies.length === 0 && !isStaff && !hasProprietaryAccess && (
                  <div className="px-2.5 py-2 text-xs text-white/60 text-start">
                    {isAr ? 'لا توجد استراتيجيات مخصصة' : 'No custom strategies created yet'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-plt-border shrink-0 hidden md:block" />

        {/* Timeframe Presets & Custom Trigger */}
        <div className="seg-control shrink-0">
          {TIMEFRAME_PRESETS.map((tf) => {
            const label =
              tf.id === '3m'
                ? isAr ? '3 أشهر' : '3M'
                : tf.id === '6m'
                ? isAr ? '6 أشهر' : '6M'
                : tf.id === 'ytd'
                ? isAr ? 'بداية العام' : 'YTD'
                : tf.id === '1y'
                ? isAr ? '1 سنة' : '1Y'
                : isAr ? 'الكل' : 'ALL';

            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => onSelectPresetDate(tf.id)}
                className={`seg-control-btn ${isPresetActive(tf.id) ? 'seg-control-btn-active' : ''}`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectPresetDate('custom')}
            className={`seg-control-btn flex items-center gap-1 ${
              activePreset === 'custom' ? 'seg-control-btn-active' : ''
            }`}
            title={isAr ? 'نطاق زمني مخصص' : 'Custom Date Range'}
          >
            <Calendar size={11} />
            <span>{isAr ? 'مخصص' : 'Custom'}</span>
          </button>
        </div>

        {/* Inline Custom Date Inputs */}
        {activePreset === 'custom' && (
          <div className="input-control-compact text-xs shrink-0 animate-in fade-in duration-150 font-sans">
            <Calendar className="w-3.5 h-3.5 text-plt-muted shrink-0" />
            <input
              type="date"
              value={strategyStartDate || '2025-01-01'}
              onChange={(e) => onSetCustomStartDate?.(e.target.value)}
              className="bg-transparent text-plt-text focus:outline-hidden text-xs cursor-pointer leading-none font-sans"
            />
            <span className="text-plt-muted select-none text-[11px] leading-none">{isRTL ? '←' : '→'}</span>
            <input
              type="date"
              value={strategyEndDate || ''}
              onChange={(e) => onSetCustomEndDate?.(e.target.value)}
              className="bg-transparent text-plt-text focus:outline-hidden text-xs cursor-pointer leading-none font-sans"
            />
          </div>
        )}

        {/* Desktop Close Button grouped tightly with the header controls */}
        <div className="hidden xl:flex items-center gap-2 sm:gap-2.5 shrink-0 ml-1">
          <div className="h-4 w-px bg-plt-border shrink-0" />
          {closeButton}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChevronRight, ChevronDown, Check } from '@/components/ui/icon-library';
import Skeleton from '@/components/ui/Skeleton';
import type { InvestorFlowsResponse } from '@/lib/handlers/investor-flow-handler';
import { useTranslation } from '@/lib/i18n';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_FLOWS } from '@/components/landing/hero-scenes/hero-scene-snapshot';

export type FlowHorizon = '1D' | '1M' | '3M' | '6M' | 'YTD' | '1Y';
export type FlowSegment = 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
export type FlowCategory = 'TOTAL' | 'INSTITUTIONS' | 'RETAIL';
export type FlowChartMode = 'stacked_share' | 'net_flow';
export type NetFlowFilter = 'all_hot_money' | 'foreign' | 'arab';
export type FlowScaleMode = 'balanced' | 'linear';
export type FlowCurrency = 'EGP' | 'USD';

const HORIZONS: FlowHorizon[] = ['1D', '1M', '3M', '6M', 'YTD', '1Y'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvestorFlowSectionProps {
  id?: string;
}

const SYMLOG_C_EGP = 100_000_000; // 100M EGP linear baseline
const SYMLOG_C_USD = 2_000_000;   // $2M USD linear baseline

function toSymLog(v: number, currency: FlowCurrency = 'EGP'): number {
  if (!v) return 0;
  const c = currency === 'USD' ? SYMLOG_C_USD : SYMLOG_C_EGP;
  const sign = v > 0 ? 1 : -1;
  return sign * Math.log1p(Math.abs(v) / c);
}

function fromSymLog(v: number, currency: FlowCurrency = 'EGP'): number {
  if (!v) return 0;
  const c = currency === 'USD' ? SYMLOG_C_USD : SYMLOG_C_EGP;
  const sign = v > 0 ? 1 : -1;
  return sign * c * Math.expm1(Math.abs(v));
}

function formatFlowVal(
  val: number,
  locale: string,
  currency: FlowCurrency = 'EGP',
  showSign = true
): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : showSign && val > 0 ? '+' : '';
  const prefix = currency === 'USD' && locale !== 'ar' ? '$' : '';
  const suffix = currency === 'USD' && locale === 'ar' ? ' $' : '';

  if (abs >= 1e9) {
    return `${sign}${prefix}${(abs / 1e9).toFixed(2)}${locale === 'ar' ? ' مليار' : 'B'}${suffix}`;
  }
  if (abs >= 1e6) {
    const decimals = currency === 'USD' && abs < 10e6 ? 2 : 1;
    return `${sign}${prefix}${(abs / 1e6).toFixed(decimals)}${locale === 'ar' ? 'م' : 'M'}${suffix}`;
  }
  if (abs >= 1e3) {
    return `${sign}${prefix}${(abs / 1e3).toFixed(0)}${locale === 'ar' ? ' ألف' : 'K'}${suffix}`;
  }
  return `${sign}${prefix}${abs.toFixed(0)}${suffix}`;
}

interface FlowDropdownOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  title?: string;
}

interface FlowDropdownProps<T extends string> {
  label: string;
  value: T;
  options: readonly FlowDropdownOption<T>[] | FlowDropdownOption<T>[];
  onChange: (value: T) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'start' | 'end';
}

function FlowDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
  onClose,
  align = 'start',
}: FlowDropdownProps<T>) {
  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const displayLabel = selectedOption?.shortLabel || selectedOption?.label || value;

  return (
    <div className="relative inline-block text-start">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-7.5 cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-2.5 font-sans text-[11px] outline-none transition-all select-none ${
          isOpen
            ? 'border-brand-blue/50 bg-white/10 text-white'
            : 'border-white/10 bg-black text-white/90 hover:border-white/20 hover:text-white active:bg-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-white/45 text-[10px] font-normal shrink-0">{label}:</span>
          <span className="font-semibold text-white truncate max-w-[120px]">{displayLabel}</span>
        </div>
        <ChevronDown
          size={11}
          className={`shrink-0 text-white/40 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className={`hover-card absolute top-full mt-1.5 z-50 min-w-[150px] max-w-[240px] rounded-xl border border-white/15 bg-[#3D3D3D] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                type="button"
                aria-selected={isSelected}
                title={opt.title}
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-start font-sans text-xs transition-colors ${
                  isSelected
                    ? 'bg-white/15 font-semibold text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="shrink-0 text-brand-blue" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InvestorFlowSection({
  id = 'investor-flows',
}: InvestorFlowSectionProps) {
  const { locale } = useTranslation();
  const isHeroScene = useHeroSceneMode();
  const [horizon, setHorizon] = useState<FlowHorizon>('1M');
  const [segment, setSegment] = useState<FlowSegment>('TOTAL');
  const [category, setCategory] = useState<FlowCategory>('TOTAL');
  const [chartMode, setChartMode] = useState<FlowChartMode>('net_flow');
  const [netFilter, setNetFilter] = useState<NetFlowFilter>('all_hot_money');
  const [scaleMode, setScaleMode] = useState<FlowScaleMode>('balanced');
  const [currency, setCurrency] = useState<FlowCurrency>('EGP');

  const { data: liveData, isLoading: liveIsLoading } = useSWR<InvestorFlowsResponse>(
    isHeroScene
      ? null
      : `/api/macro/investor-flows?horizon=${horizon}&segment=${segment}&category=${category}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const data = isHeroScene ? (HERO_SCENE_FLOWS.data as InvestorFlowsResponse) : liveData;
  const isLoading = !isHeroScene && liveIsLoading;

  const normalizedHistory = useMemo(() => {
    return (data?.history || []).map((h) => {
      const fxRate = Number(h.usdEgpRate || 52.5);
      const divisor = currency === 'USD' ? (fxRate > 0 ? fxRate : 52.5) : 1;

      const rawFNet = Number(h.foreignNet || 0);
      const rawANet = Number(h.arabNet || 0);
      const rawENet = Number(h.egyptianNet || 0);
      const rawHmNet = typeof h.hotMoneyNet === 'number' ? h.hotMoneyNet : rawFNet + rawANet;
      const rawHmBuy = typeof h.hotMoneyBuy === 'number' ? h.hotMoneyBuy : Number(h.foreignBuy || 0) + Number(h.arabBuy || 0);
      const rawHmSell = typeof h.hotMoneySell === 'number' ? h.hotMoneySell : Number(h.foreignSell || 0) + Number(h.arabSell || 0);
      const rawTurnover = Number(h.totalTurnover || 0);

      const fNet = rawFNet / divisor;
      const aNet = rawANet / divisor;
      const eNet = rawENet / divisor;
      const hmNet = rawHmNet / divisor;
      const hmBuy = rawHmBuy / divisor;
      const hmSell = rawHmSell / divisor;
      const totalTurnover = rawTurnover / divisor;

      // Defense-in-depth: clamp shares strictly >= 0 and normalize to exactly 100%
      const rawE = Math.max(0, Number(h.egyptianSharePct || 0));
      const rawA = Math.max(0, Number(h.arabSharePct || 0));
      const rawF = Math.max(0, Number(h.foreignSharePct || 0));
      const totalSum = rawE + rawA + rawF || 100;
      const eShare = Math.round((rawE / totalSum) * 1000) / 10;
      const aShare = Math.round((rawA / totalSum) * 1000) / 10;
      const fShare = Math.max(0, Math.round((100 - eShare - aShare) * 10) / 10);
      const hmShare = Math.round((fShare + aShare) * 10) / 10;

      return {
        ...h,
        usdEgpRate: fxRate,
        foreignNet: fNet,
        arabNet: aNet,
        egyptianNet: eNet,
        hotMoneyNet: hmNet,
        hotMoneyBuy: hmBuy,
        hotMoneySell: hmSell,
        totalTurnover,
        hotMoneySharePct: hmShare,
        egyptianSharePct: eShare,
        arabSharePct: aShare,
        foreignSharePct: fShare,
        foreignNetBalanced: toSymLog(fNet, currency),
        arabNetBalanced: toSymLog(aNet, currency),
        hotMoneyNetBalanced: toSymLog(hmNet, currency),
      };
    });
  }, [data?.history, currency]);

  const summary = data?.summary;
  const periodStats = useMemo(() => {
    if (!summary) return null;
    if (currency === 'EGP' || normalizedHistory.length === 0) {
      const hmNet = typeof summary.hotMoneyNetToday === 'number'
        ? summary.hotMoneyNetToday
        : (summary.foreignNetToday || 0) + (summary.arabNetToday || 0);
      return {
        foreignNet: summary.foreignNetToday || 0,
        arabNet: summary.arabNetToday || 0,
        egyptianNet: summary.egyptianNetToday || 0,
        hotMoneyNet: hmNet,
        totalTurnover: summary.totalTurnoverToday || 0,
        egyptianShare: summary.egyptianShareToday,
        foreignShare: summary.foreignShareToday,
        arabShare: summary.arabShareToday,
      };
    }

    // In USD mode, sum each day's USD-converted flow (using that day's exchange rate)
    let fNet = 0;
    let aNet = 0;
    let eNet = 0;
    let hmNet = 0;
    let turnover = 0;
    for (const d of normalizedHistory) {
      fNet += d.foreignNet;
      aNet += d.arabNet;
      eNet += d.egyptianNet;
      hmNet += d.hotMoneyNet;
      turnover += d.totalTurnover;
    }
    return {
      foreignNet: fNet,
      arabNet: aNet,
      egyptianNet: eNet,
      hotMoneyNet: hmNet,
      totalTurnover: turnover,
      egyptianShare: summary.egyptianShareToday,
      foreignShare: summary.foreignShareToday,
      arabShare: summary.arabShareToday,
    };
  }, [summary, currency, normalizedHistory]);

  const getBarValue = (entry: (typeof normalizedHistory)[0]) => {
    if (netFilter === 'foreign') return entry.foreignNet;
    if (netFilter === 'arab') return entry.arabNet;
    return entry.hotMoneyNet;
  };

  const getBarDataKey = () => {
    if (scaleMode === 'balanced') {
      if (netFilter === 'foreign') return 'foreignNetBalanced';
      if (netFilter === 'arab') return 'arabNetBalanced';
      return 'hotMoneyNetBalanced';
    }
    if (netFilter === 'foreign') return 'foreignNet';
    if (netFilter === 'arab') return 'arabNet';
    return 'hotMoneyNet';
  };

  const balancedTicks = useMemo(() => {
    if (scaleMode !== 'balanced' || normalizedHistory.length === 0) return undefined;
    const key = scaleMode === 'balanced'
      ? (netFilter === 'foreign' ? 'foreignNetBalanced' : netFilter === 'arab' ? 'arabNetBalanced' : 'hotMoneyNetBalanced')
      : (netFilter === 'foreign' ? 'foreignNet' : netFilter === 'arab' ? 'arabNet' : 'hotMoneyNet');

    let minVal = 0;
    let maxVal = 0;
    for (const d of normalizedHistory) {
      const v = Number((d as any)[key] || 0);
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    const candidateMoneyTicks = currency === 'USD'
      ? [
          -2e9, -1e9, -500e6, -250e6, -100e6, -50e6, -20e6, -10e6, -5e6, -2e6,
          0,
          2e6, 5e6, 10e6, 20e6, 50e6, 100e6, 250e6, 500e6, 1e9, 2e9
        ]
      : [
          -30e9, -20e9, -15e9, -10e9, -5e9, -2e9, -1e9, -500e6, -250e6, -100e6,
          0,
          100e6, 250e6, 500e6, 1e9, 2e9, 5e9, 10e9, 15e9, 20e9, 30e9
        ];

    const activeMoneyTicks = candidateMoneyTicks.filter((m) => {
      const sym = toSymLog(m, currency);
      return sym >= minVal * 1.05 && sym <= maxVal * 1.05;
    });

    if (!activeMoneyTicks.includes(0)) activeMoneyTicks.push(0);
    activeMoneyTicks.sort((a, b) => a - b);

    let finalMoneyTicks = activeMoneyTicks;
    if (finalMoneyTicks.length > 7) {
      const zeroIdx = finalMoneyTicks.indexOf(0);
      const neg = finalMoneyTicks.slice(0, zeroIdx);
      const pos = finalMoneyTicks.slice(zeroIdx + 1);
      const sampledNeg = neg.filter((_, i) => i === 0 || i === neg.length - 1 || i % 2 === 0);
      const sampledPos = pos.filter((_, i) => i === 0 || i === pos.length - 1 || i % 2 === 0);
      finalMoneyTicks = [...sampledNeg, 0, ...sampledPos];
    }

    return finalMoneyTicks.map((m) => toSymLog(m, currency));
  }, [scaleMode, normalizedHistory, netFilter, currency]);

  // Mobile Dropdown state & outside click handler (Space-saving phone controls)
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const mobileControlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMobileDropdown) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileControlsRef.current && !mobileControlsRef.current.contains(e.target as Node)) {
        setOpenMobileDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMobileDropdown(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMobileDropdown]);

  // Dropdown options configurations
  const segmentOptions = useMemo(() => [
    {
      value: 'TOTAL' as FlowSegment,
      label: locale === 'ar' ? 'الكل (أموال ساخنة)' : 'All (Hot Money)',
      shortLabel: locale === 'ar' ? 'الكل' : 'All',
      title: locale === 'ar' ? 'الأسهم والسندات والأذون (مقياس الأموال الساخنة الكلي)' : 'All Securities, Bonds & Bills (Total Macro Hot Money)',
    },
    {
      value: 'STOCKS' as FlowSegment,
      label: locale === 'ar' ? 'الأسهم فقط' : 'Stocks Only',
      shortLabel: locale === 'ar' ? 'الأسهم' : 'Stocks',
      title: locale === 'ar' ? 'تداولات الأسهم المقيدة داخل المقصورة فقط' : 'Listed Equities Only',
    },
    {
      value: 'BONDS' as FlowSegment,
      label: locale === 'ar' ? 'السندات' : 'Bonds',
      shortLabel: locale === 'ar' ? 'السندات' : 'Bonds',
      title: locale === 'ar' ? 'السندات الحكومية وسندات الشركات' : 'Bonds Only',
    },
    {
      value: 'BILLS' as FlowSegment,
      label: locale === 'ar' ? 'أذون الخزانة' : 'T-Bills',
      shortLabel: locale === 'ar' ? 'الأذون' : 'T-Bills',
      title: locale === 'ar' ? 'أذون الخزانة الحكومية' : 'Treasury Bills Only',
    },
  ], [locale]);

  const categoryOptions = useMemo(() => [
    {
      value: 'TOTAL' as FlowCategory,
      label: locale === 'ar' ? 'الإجمالي' : 'Total',
      shortLabel: locale === 'ar' ? 'الإجمالي' : 'Total',
    },
    {
      value: 'INSTITUTIONS' as FlowCategory,
      label: locale === 'ar' ? 'المؤسسات' : 'Institutions',
      shortLabel: locale === 'ar' ? 'المؤسسات' : 'Inst.',
    },
    {
      value: 'RETAIL' as FlowCategory,
      label: locale === 'ar' ? 'الأفراد' : 'Individuals',
      shortLabel: locale === 'ar' ? 'الأفراد' : 'Retail',
    },
  ], [locale]);

  const chartModeOptions = useMemo(() => [
    {
      value: 'net_flow' as FlowChartMode,
      label: locale === 'ar' ? 'صافي التدفقات' : 'Net Flow',
      shortLabel: locale === 'ar' ? 'صافي التدفق' : 'Net Flow',
    },
    {
      value: 'stacked_share' as FlowChartMode,
      label: locale === 'ar' ? 'حصة السيولة 100%' : '100% Share',
      shortLabel: locale === 'ar' ? 'حصة السيولة' : 'Share',
    },
  ], [locale]);

  const netFilterOptions = useMemo(() => [
    {
      value: 'all_hot_money' as NetFlowFilter,
      label: locale === 'ar' ? 'الساخنة (أجانب + عرب)' : 'Hot Money (Foreign + Arab)',
      shortLabel: locale === 'ar' ? 'الساخنة' : 'Hot Money',
      title: locale === 'ar' ? 'إجمالي صافي غير المصريين (أجانب + عرب)' : 'Total Non-Domestic Net (Foreigners + Arabs)',
    },
    {
      value: 'foreign' as NetFlowFilter,
      label: locale === 'ar' ? 'الأجانب فقط' : 'Foreigners',
      shortLabel: locale === 'ar' ? 'الأجانب' : 'Foreign',
      title: locale === 'ar' ? 'صافي تدفق المستثمرين الأجانب الدوليين' : 'International Foreign Investors Net',
    },
    {
      value: 'arab' as NetFlowFilter,
      label: locale === 'ar' ? 'العرب فقط' : 'Arabs',
      shortLabel: locale === 'ar' ? 'العرب' : 'Arabs',
      title: locale === 'ar' ? 'صافي تدفق المستثمرين العرب الإقليميين' : 'Regional Arab Investors Net',
    },
  ], [locale]);

  const scaleModeOptions = useMemo(() => [
    {
      value: 'balanced' as FlowScaleMode,
      label: locale === 'ar' ? 'متوازن (SymLog)' : 'Balanced (SymLog)',
      shortLabel: locale === 'ar' ? 'متوازن' : 'Balanced',
      title: locale === 'ar' ? 'مقياس متوازن (SymLog): يُظهر تفاصيل الأيام العادية بوضوح ويبرز القمم الكبيرة' : 'Balanced (SymLog) Scale: Keeps normal days visible while highlighting major outliers',
    },
    {
      value: 'linear' as FlowScaleMode,
      label: locale === 'ar' ? 'خطي (رياضي)' : 'Linear',
      shortLabel: locale === 'ar' ? 'خطي' : 'Linear',
      title: locale === 'ar' ? 'المقياس الخطي الرياضي المباشر' : 'Direct Mathematical Linear Scale',
    },
  ], [locale]);

  const horizonOptions = useMemo(() => [
    { value: '1D' as FlowHorizon, label: '1D', shortLabel: '1D' },
    { value: '1M' as FlowHorizon, label: '1M', shortLabel: '1M' },
    { value: '3M' as FlowHorizon, label: '3M', shortLabel: '3M' },
    { value: '6M' as FlowHorizon, label: '6M', shortLabel: '6M' },
    { value: 'YTD' as FlowHorizon, label: 'YTD', shortLabel: 'YTD' },
    { value: '1Y' as FlowHorizon, label: '1Y', shortLabel: '1Y' },
  ], []);

  const currencyOptions = useMemo(() => [
    {
      value: 'EGP' as FlowCurrency,
      label: locale === 'ar' ? 'جنيه مصري (EGP)' : 'EGP',
      shortLabel: 'EGP',
      title: locale === 'ar' ? 'عرض القيم بالجنيه المصري' : 'Display values in Egyptian Pounds (EGP)',
    },
    {
      value: 'USD' as FlowCurrency,
      label: locale === 'ar' ? 'دولار أمريكي (USD)' : 'USD',
      shortLabel: 'USD',
      title: locale === 'ar' ? 'عرض القيم بالدولار وفق سعر صرف كل يوم تداول' : 'Display values in US Dollars using each session’s daily exchange rate',
    },
  ], [locale]);

  return (
    <div id={id} className="w-full pt-3 select-none font-sans">
      <div className="w-full bg-transparent p-0 border-0">
        {/* 1. Top Bar: Title & Security Segment Switches (Hot Money / Stocks / Bonds / T-Bills) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1 cursor-pointer group w-fit">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-plt-text group-hover:text-plt-text transition-colors">
              {locale === 'ar'
                ? 'تدفقات المستثمرين والأموال الساخنة (EGX Hot Money & Investor Flows)'
                : 'Investor Flows & Macro Hot Money'}
            </h3>
            <ChevronRight
              size={16}
              className="text-plt-muted group-hover:text-plt-text transition-colors translate-y-[0.5px]"
            />
          </div>

          {/* Instrument / Market Segment Switches & Currency Switch - DESKTOP ONLY */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-plt-muted hidden sm:inline">
              {locale === 'ar' ? 'السوق:' : 'Market:'}
            </span>
            <div className="seg-control h-7.5 p-0.5">
              <button
                type="button"
                onClick={() => setSegment('TOTAL')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  segment === 'TOTAL' ? 'seg-control-btn-active' : ''
                }`}
                title={locale === 'ar' ? 'الأسهم والسندات والأذون (مقياس الأموال الساخنة الكلي)' : 'All Securities, Bonds & Bills (Total Macro Hot Money)'}
              >
                {locale === 'ar' ? 'الكل (أموال ساخنة)' : 'All (Hot Money)'}
              </button>
              <button
                type="button"
                onClick={() => setSegment('STOCKS')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  segment === 'STOCKS' ? 'seg-control-btn-active' : ''
                }`}
                title={locale === 'ar' ? 'تداولات الأسهم المقيدة داخل المقصورة فقط' : 'Listed Equities Only'}
              >
                {locale === 'ar' ? 'الأسهم فقط' : 'Stocks Only'}
              </button>
              <button
                type="button"
                onClick={() => setSegment('BONDS')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  segment === 'BONDS' ? 'seg-control-btn-active' : ''
                }`}
                title={locale === 'ar' ? 'السندات الحكومية وسندات الشركات' : 'Bonds Only'}
              >
                {locale === 'ar' ? 'السندات' : 'Bonds'}
              </button>
              <button
                type="button"
                onClick={() => setSegment('BILLS')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  segment === 'BILLS' ? 'seg-control-btn-active' : ''
                }`}
                title={locale === 'ar' ? 'أذون الخزانة الحكومية' : 'Treasury Bills Only'}
              >
                {locale === 'ar' ? 'الأذون' : 'T-Bills'}
              </button>
            </div>

            {/* Currency Switcher: EGP vs USD (Daily FX Rate) */}
            <div className="seg-control h-7.5 p-0.5">
              <button
                type="button"
                onClick={() => setCurrency('EGP')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  currency === 'EGP' ? 'seg-control-btn-active' : ''
                }`}
                title={locale === 'ar' ? 'عرض القيم بالجنيه المصري' : 'Display values in Egyptian Pounds (EGP)'}
              >
                EGP
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  currency === 'USD' ? 'seg-control-btn-active' : ''
                }`}
                title={
                  locale === 'ar'
                    ? 'عرض القيم بالدولار الأمريكي وفق سعر صرف كل يوم تداول'
                    : 'Display values in US Dollars using each day’s historical exchange rate'
                }
              >
                USD
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Toolbar (Phone Only - Clean Popovers matching Strategies Studio) */}
        <div ref={mobileControlsRef} className="sm:hidden flex flex-col gap-2 mb-2.5 pt-0.5">
          {/* Row 1: Market Segment, Investor Category, Currency & Time Horizon */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <FlowDropdown
              label={locale === 'ar' ? 'السوق' : 'Market'}
              value={segment}
              options={segmentOptions}
              onChange={setSegment}
              isOpen={openMobileDropdown === 'segment'}
              onToggle={() => setOpenMobileDropdown((prev) => (prev === 'segment' ? null : 'segment'))}
              onClose={() => setOpenMobileDropdown(null)}
              align="start"
            />
            <FlowDropdown
              label={locale === 'ar' ? 'الفئة' : 'Category'}
              value={category}
              options={categoryOptions}
              onChange={setCategory}
              isOpen={openMobileDropdown === 'category'}
              onToggle={() => setOpenMobileDropdown((prev) => (prev === 'category' ? null : 'category'))}
              onClose={() => setOpenMobileDropdown(null)}
              align="start"
            />
            <FlowDropdown
              label={locale === 'ar' ? 'العملة' : 'CCY'}
              value={currency}
              options={currencyOptions}
              onChange={setCurrency}
              isOpen={openMobileDropdown === 'currency'}
              onToggle={() => setOpenMobileDropdown((prev) => (prev === 'currency' ? null : 'currency'))}
              onClose={() => setOpenMobileDropdown(null)}
              align="start"
            />
            <FlowDropdown
              label={locale === 'ar' ? 'المدة' : 'Period'}
              value={horizon}
              options={horizonOptions}
              onChange={setHorizon}
              isOpen={openMobileDropdown === 'horizon'}
              onToggle={() => setOpenMobileDropdown((prev) => (prev === 'horizon' ? null : 'horizon'))}
              onClose={() => setOpenMobileDropdown(null)}
              align="end"
            />
          </div>

          {/* Row 2: Chart Mode, Flow Filter & Scale Mode */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <FlowDropdown
              label={locale === 'ar' ? 'العرض' : 'View'}
              value={chartMode}
              options={chartModeOptions}
              onChange={setChartMode}
              isOpen={openMobileDropdown === 'chartMode'}
              onToggle={() => setOpenMobileDropdown((prev) => (prev === 'chartMode' ? null : 'chartMode'))}
              onClose={() => setOpenMobileDropdown(null)}
              align="start"
            />
            {chartMode === 'net_flow' && (
              <FlowDropdown
                label={locale === 'ar' ? 'التدفق' : 'Flow'}
                value={netFilter}
                options={netFilterOptions}
                onChange={setNetFilter}
                isOpen={openMobileDropdown === 'netFilter'}
                onToggle={() => setOpenMobileDropdown((prev) => (prev === 'netFilter' ? null : 'netFilter'))}
                onClose={() => setOpenMobileDropdown(null)}
                align="start"
              />
            )}
            {chartMode === 'net_flow' && (
              <FlowDropdown
                label={locale === 'ar' ? 'المقياس' : 'Scale'}
                value={scaleMode}
                options={scaleModeOptions}
                onChange={setScaleMode}
                isOpen={openMobileDropdown === 'scaleMode'}
                onToggle={() => setOpenMobileDropdown((prev) => (prev === 'scaleMode' ? null : 'scaleMode'))}
                onClose={() => setOpenMobileDropdown(null)}
                align="end"
              />
            )}
          </div>
        </div>

        {/* 2. Secondary Control Bar: Investor Category (Total / Institutions / Retail) & Chart Controls - DESKTOP ONLY */}
        <div className="hidden sm:flex sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          {/* Category Switcher: Total vs Institutions vs Retail */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-plt-muted hidden sm:inline">
              {locale === 'ar' ? 'الفئة:' : 'Category:'}
            </span>
            <div className="seg-control h-7.5 p-0.5">
              <button
                type="button"
                onClick={() => setCategory('TOTAL')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  category === 'TOTAL' ? 'seg-control-btn-active' : ''
                }`}
              >
                {locale === 'ar' ? 'الإجمالي' : 'Total'}
              </button>
              <button
                type="button"
                onClick={() => setCategory('INSTITUTIONS')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  category === 'INSTITUTIONS' ? 'seg-control-btn-active' : ''
                }`}
              >
                {locale === 'ar' ? 'المؤسسات' : 'Institutions'}
              </button>
              <button
                type="button"
                onClick={() => setCategory('RETAIL')}
                className={`seg-control-btn h-full px-2.5 text-[11px] rounded-md ${
                  category === 'RETAIL' ? 'seg-control-btn-active' : ''
                }`}
              >
                {locale === 'ar' ? 'الأفراد' : 'Individuals'}
              </button>
            </div>
          </div>

          {/* Chart Mode & Horizon Switchers */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Primary Mode Switcher: 100% Stacked Share vs Hot Money Net Flow */}
            <div className="seg-control h-7.5 p-0.5">
              <button
                type="button"
                onClick={() => setChartMode('stacked_share')}
                className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                  chartMode === 'stacked_share' ? 'seg-control-btn-active' : ''
                }`}
              >
                {locale === 'ar' ? 'حصة السيولة 100%' : '100% Share'}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('net_flow')}
                className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                  chartMode === 'net_flow' ? 'seg-control-btn-active' : ''
                }`}
              >
                {locale === 'ar' ? 'صافي التدفقات' : 'Net Flow'}
              </button>
            </div>

            {/* Sub-Filter: Foreigners vs Arabs vs Combined (Only in Net Flow mode) */}
            {chartMode === 'net_flow' && (
              <div className="seg-control h-7.5 p-0.5">
                <button
                  type="button"
                  onClick={() => setNetFilter('all_hot_money')}
                  className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                    netFilter === 'all_hot_money' ? 'seg-control-btn-active' : ''
                  }`}
                  title={locale === 'ar' ? 'إجمالي صافي غير المصريين (أجانب + عرب)' : 'Total Non-Domestic Net (Foreigners + Arabs)'}
                >
                  {locale === 'ar' ? 'الساخنة' : 'Hot Money'}
                </button>
                <button
                  type="button"
                  onClick={() => setNetFilter('foreign')}
                  className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                    netFilter === 'foreign' ? 'seg-control-btn-active' : ''
                  }`}
                  title={locale === 'ar' ? 'صافي تدفق المستثمرين الأجانب الدوليين' : 'International Foreign Investors Net'}
                >
                  {locale === 'ar' ? 'الأجانب' : 'Foreigners'}
                </button>
                <button
                  type="button"
                  onClick={() => setNetFilter('arab')}
                  className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                    netFilter === 'arab' ? 'seg-control-btn-active' : ''
                  }`}
                  title={locale === 'ar' ? 'صافي تدفق المستثمرين العرب الإقليميين' : 'Regional Arab Investors Net'}
                >
                  {locale === 'ar' ? 'العرب' : 'Arabs'}
                </button>
              </div>
            )}

            {/* Scale Mode Switcher: Balanced (SymLog) vs Linear */}
            {chartMode === 'net_flow' && (
              <div className="seg-control h-7.5 p-0.5">
                <button
                  type="button"
                  onClick={() => setScaleMode('balanced')}
                  className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                    scaleMode === 'balanced' ? 'seg-control-btn-active' : ''
                  }`}
                  title={
                    locale === 'ar'
                      ? 'مقياس متوازن (SymLog): يُظهر تفاصيل الأيام العادية بوضوح ويبرز القمم الكبيرة'
                      : 'Balanced (SymLog) Scale: Keeps normal days visible while highlighting major outliers'
                  }
                >
                  {locale === 'ar' ? 'متوازن' : 'Balanced'}
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('linear')}
                  className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                    scaleMode === 'linear' ? 'seg-control-btn-active' : ''
                  }`}
                  title={
                    locale === 'ar'
                      ? 'المقياس الخطي الرياضي المباشر'
                      : 'Direct Mathematical Linear Scale'
                  }
                >
                  {locale === 'ar' ? 'خطي' : 'Linear'}
                </button>
              </div>
            )}

            {/* Horizon Pills */}
            <div className="seg-control h-7.5 p-0.5">
              {HORIZONS.map((h) => {
                const isSelected = horizon === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`seg-control-btn h-full px-2 text-[11px] rounded-md ${
                      isSelected ? 'seg-control-btn-active' : ''
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Executive Quick Stats Bar / Retail vs. Inst Participation Split */}
        {isLoading ? (
          <div className="flex items-center gap-3 sm:gap-5 text-xs pb-2 border-b border-plt-border-soft">
            <Skeleton className="h-4 w-32 rounded-none" />
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-4 w-24 rounded-none ml-auto hidden md:block" />
          </div>
        ) : periodStats && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs pb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar">
              {chartMode === 'stacked_share' ? (
                <>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#2962ff]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{periodStats.egyptianShare}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${periodStats.egyptianNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatFlowVal(periodStats.egyptianNet, locale, currency)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#f59e0b]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{periodStats.foreignShare}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${periodStats.foreignNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatFlowVal(periodStats.foreignNet, locale, currency)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#089981]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{periodStats.arabShare}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${periodStats.arabNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatFlowVal(periodStats.arabNet, locale, currency)})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Combined Hot Money Net */}
                  <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-white/10">
                    <span className="text-plt-muted">
                      {locale === 'ar' ? 'صافي الساخنة:' : 'Hot Money Net:'}
                    </span>
                    <span className={`font-semibold tabular-nums text-[11px] ${periodStats.hotMoneyNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatFlowVal(periodStats.hotMoneyNet, locale, currency)}
                    </span>
                  </div>

                  {/* Foreigners component */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#f59e0b]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${periodStats.foreignNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatFlowVal(periodStats.foreignNet, locale, currency)}
                    </span>
                  </div>

                  {/* Arabs component */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#089981]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${periodStats.arabNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatFlowVal(periodStats.arabNet, locale, currency)}
                    </span>
                  </div>

                  {/* Domestic counterpart */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#2962ff]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'المحلي:' : 'Domestic:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${periodStats.egyptianNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatFlowVal(periodStats.egyptianNet, locale, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Session Turnover */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <span className="text-plt-muted text-[11px]">{locale === 'ar' ? 'التداول:' : 'Turnover:'}</span>
              <span className="text-plt-text font-semibold text-[11px] tabular-nums">
                {formatFlowVal(periodStats.totalTurnover, locale, currency, false)}
              </span>
            </div>
          </div>
        )}

        {/* 4. Pitch Black Surface Canvas (No borders) */}
        <div className="relative mt-2 w-full min-w-0 h-[360px] sm:h-[400px] bg-black border-0 rounded-none overflow-hidden pt-2" dir="ltr">
          {isLoading ? (
            <div className="w-full h-full flex flex-col justify-end p-4 pb-8 space-y-4">
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-full w-full pt-8">
                {[65, 40, 80, 55, 30, 90, 45, 70, 35, 85, 60, 50, 75, 40].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center h-full gap-1">
                    <Skeleton className="w-full rounded-none" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-plt-border-soft">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-2.5 w-10 sm:w-12 rounded-none" />
                ))}
              </div>
            </div>
          ) : normalizedHistory.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {locale === 'ar' ? 'لا توجد بيانات متاحة لتدفقات هذا السوق في الإطار الزمني المحدد.' : 'No investor flow history available for this market segment.'}
            </div>
          ) : chartMode === 'stacked_share' ? (
            /* Mode A: 100% Stacked Turnover Share */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={normalizedHistory}
                margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
                barCategoryGap="15%"
              >
                <YAxis
                  orientation="right"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  allowDataOverflow={false}
                  width={56}
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                  tickFormatter={(val: number) => `${val}%`}
                  dx={2}
                />
                <XAxis
                  dataKey="date"
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'sans-serif' }}
                  dy={10}
                  tickFormatter={(dateStr: string) => {
                    if (!dateStr) return '';
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      return `${parts[1]}/${parts[2]}`;
                    }
                    return dateStr;
                  }}
                  interval="preserveStartEnd"
                  minTickGap={25}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div
                        className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50 min-w-[250px]"
                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      >
                        <div className="text-neutral-400 font-medium pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span className="tabular-nums">{d.date}</span>
                          <span className="font-semibold text-neutral-200">
                            {locale === 'ar' ? 'الحصص السوقية' : 'Market Share'}
                          </span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                            </div>
                            <span className="font-bold text-white tabular-nums">
                              {d.egyptianSharePct}%{' '}
                              <span className={`text-[11px] font-semibold ml-1 ${d.egyptianNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                ({formatFlowVal(d.egyptianNet, locale, currency)})
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                            </div>
                            <span className="font-bold text-white tabular-nums">
                              {d.foreignSharePct}%{' '}
                              <span className={`text-[11px] font-semibold ml-1 ${d.foreignNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                ({formatFlowVal(d.foreignNet, locale, currency)})
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                            </div>
                            <span className="font-bold text-white tabular-nums">
                              {d.arabSharePct}%{' '}
                              <span className={`text-[11px] font-semibold ml-1 ${d.arabNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                ({formatFlowVal(d.arabNet, locale, currency)})
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-plt-muted text-[11px] pt-1 border-t border-plt-border-soft">
                          <span>{locale === 'ar' ? 'إجمالي التداول: ' : 'Turnover: '}</span>
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {formatFlowVal(d.totalTurnover, locale, currency, false)}
                          </span>
                        </div>
                        {currency === 'USD' && d.usdEgpRate && (
                          <div className="flex items-center justify-between gap-4 text-neutral-400 text-[10px]">
                            <span>{locale === 'ar' ? 'سعر الصرف (USD/EGP):' : 'FX Rate (USD/EGP):'}</span>
                            <span className="tabular-nums font-medium text-neutral-300">
                              {Number(d.usdEgpRate).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="egyptianSharePct" stackId="a" fill="#2962ff" opacity={0.85} />
                <Bar dataKey="arabSharePct" stackId="a" fill="#089981" opacity={0.9} />
                <Bar dataKey="foreignSharePct" stackId="a" fill="#f59e0b" opacity={0.95} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            /* Mode B: Hot Money Net Flow Bars */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={normalizedHistory}
                margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
                barCategoryGap="20%"
              >
                <YAxis
                  orientation="right"
                  width={64}
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  ticks={scaleMode === 'balanced' ? balancedTicks : undefined}
                  domain={scaleMode === 'balanced' ? ['auto', 'auto'] : undefined}
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                  tickFormatter={(val: number) => {
                    const realMoney = scaleMode === 'balanced' ? fromSymLog(val, currency) : val;
                    const abs = Math.abs(realMoney);
                    const minZero = currency === 'USD' ? 50_000 : 1_000_000;
                    if (abs < minZero) return '0';
                    const sign = realMoney > 0 ? '+' : '-';
                    const prefix = currency === 'USD' && locale !== 'ar' ? '$' : '';
                    const suffix = currency === 'USD' && locale === 'ar' ? ' $' : '';
                    if (abs >= 1e9) {
                      return `${sign}${prefix}${(abs / 1e9).toFixed(abs >= 10e9 ? 0 : 1)}${locale === 'ar' ? ' مليار' : 'B'}${suffix}`;
                    }
                    if (abs >= 1e6) {
                      return `${sign}${prefix}${(abs / 1e6).toFixed(0)}${locale === 'ar' ? 'م' : 'M'}${suffix}`;
                    }
                    return `${sign}${prefix}${(abs / 1e3).toFixed(0)}${locale === 'ar' ? ' ألف' : 'K'}${suffix}`;
                  }}
                  dx={2}
                />
                <XAxis
                  dataKey="date"
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#737373', fontSize: 10, fontFamily: 'sans-serif' }}
                  dy={10}
                  tickFormatter={(dateStr: string) => {
                    if (!dateStr) return '';
                    const parts = dateStr.split('-');
                    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
                    return dateStr;
                  }}
                  interval="preserveStartEnd"
                  minTickGap={25}
                />
                <ReferenceLine y={0} stroke="#333333" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    const activeVal = getBarValue(d);
                    const isPos = activeVal >= 0;
                    const hmTotal = d.hotMoneyNet;
                    const isHmPos = hmTotal >= 0;

                    return (
                      <div
                        className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50 min-w-[260px]"
                        dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {/* Header: Date + Inflow/Outflow Status */}
                        <div className="text-neutral-400 font-medium pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                          <span className="tabular-nums">{d.date}</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isHmPos ? 'text-profit-num' : 'text-loss-num'
                            }`}
                          >
                            {isHmPos
                              ? locale === 'ar'
                                ? 'صافي دخول (+)'
                                : 'Net Inflow (+)'
                              : locale === 'ar'
                              ? 'صافي خروج (-)'
                              : 'Net Outflow (-)'}
                          </span>
                        </div>

                        {/* Selected Metric Net Headline */}
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <span className="text-neutral-400">
                            {netFilter === 'foreign'
                              ? locale === 'ar'
                                ? 'صافي تدفق الأجانب:'
                                : 'Foreign Net:'
                              : netFilter === 'arab'
                              ? locale === 'ar'
                                ? 'صافي تدفق العرب:'
                                : 'Arab Net:'
                              : locale === 'ar'
                              ? 'صافي الساخنة:'
                              : 'Hot Money Net:'}
                          </span>
                          <span className={`font-bold tabular-nums text-sm ${isPos ? 'text-profit-num' : 'text-loss-num'}`}>
                            {formatFlowVal(activeVal, locale, currency)}
                          </span>
                        </div>

                        {/* Breakdown Rows */}
                        <div className="space-y-1 pt-1 border-t border-plt-border-soft">
                          {/* Foreigners */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                            </div>
                            <span className={`font-semibold tabular-nums ${d.foreignNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                              {formatFlowVal(d.foreignNet, locale, currency)}
                            </span>
                          </div>

                          {/* Arabs */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                            </div>
                            <span className={`font-semibold tabular-nums ${d.arabNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                              {formatFlowVal(d.arabNet, locale, currency)}
                            </span>
                          </div>

                          {/* Domestic (Egyptians) */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]"></span>
                              <span className="text-neutral-400">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                            </div>
                            <span className={`font-semibold tabular-nums ${d.egyptianNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                              {formatFlowVal(d.egyptianNet, locale, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Footer: Session Turnover & FX Rate */}
                        <div className="flex items-center justify-between gap-4 text-plt-muted text-[11px] pt-1.5 border-t border-plt-border-soft">
                          <span>{locale === 'ar' ? 'إجمالي التداول: ' : 'Turnover: '}</span>
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {formatFlowVal(d.totalTurnover, locale, currency, false)}
                          </span>
                        </div>
                        {currency === 'USD' && d.usdEgpRate && (
                          <div className="flex items-center justify-between gap-4 text-neutral-400 text-[10px]">
                            <span>{locale === 'ar' ? 'سعر الصرف (USD/EGP):' : 'FX Rate (USD/EGP):'}</span>
                            <span className="tabular-nums font-medium text-neutral-300">
                              {Number(d.usdEgpRate).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey={getBarDataKey()}>
                  {normalizedHistory.map((entry, index) => {
                    const val = getBarValue(entry);
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={val >= 0 ? '#089981' : '#f23645'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

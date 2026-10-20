'use client';

import React, { useState, useMemo } from 'react';
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
import { ChevronRight } from '@/components/ui/icon-library';
import Skeleton from '@/components/ui/Skeleton';
import type { InvestorFlowsResponse } from '@/lib/handlers/investor-flow-handler';
import { useTranslation } from '@/lib/i18n';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';
import { HERO_SCENE_FLOWS } from '@/components/landing/hero-scenes/hero-scene-snapshot';

export type FlowHorizon = '1M' | '3M' | '6M' | 'YTD' | '1Y';
export type FlowSegment = 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
export type FlowCategory = 'TOTAL' | 'INSTITUTIONS' | 'RETAIL';
export type FlowChartMode = 'stacked_share' | 'net_flow';
export type NetFlowFilter = 'all_hot_money' | 'foreign' | 'arab';
export type FlowScaleMode = 'balanced' | 'linear';

const HORIZONS: FlowHorizon[] = ['1M', '3M', '6M', 'YTD', '1Y'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvestorFlowSectionProps {
  id?: string;
}

const SYMLOG_C = 100_000_000; // 100M EGP linear baseline

function toSymLog(v: number): number {
  if (!v) return 0;
  const sign = v > 0 ? 1 : -1;
  return sign * Math.log1p(Math.abs(v) / SYMLOG_C);
}

function fromSymLog(v: number): number {
  if (!v) return 0;
  const sign = v > 0 ? 1 : -1;
  return sign * SYMLOG_C * Math.expm1(Math.abs(v));
}

function formatEgpVal(val: number, locale: string, showSign = true): string {
  const abs = Math.abs(val);
  const sign = showSign && val > 0 ? '+' : '';
  if (abs >= 1e9) {
    return `${sign}${(val / 1e9).toFixed(2)}${locale === 'ar' ? ' مليار' : 'B'}`;
  }
  if (abs >= 1e6) {
    return `${sign}${(val / 1e6).toFixed(1)}${locale === 'ar' ? 'م' : 'M'}`;
  }
  if (abs >= 1e3) {
    return `${sign}${(val / 1e3).toFixed(0)}${locale === 'ar' ? ' ألف' : 'K'}`;
  }
  return `${sign}${val.toFixed(0)}`;
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
      const fNet = Number(h.foreignNet || 0);
      const aNet = Number(h.arabNet || 0);
      const eNet = Number(h.egyptianNet || 0);
      const hmNet = typeof h.hotMoneyNet === 'number' ? h.hotMoneyNet : fNet + aNet;
      const hmBuy = typeof h.hotMoneyBuy === 'number' ? h.hotMoneyBuy : Number(h.foreignBuy || 0) + Number(h.arabBuy || 0);
      const hmSell = typeof h.hotMoneySell === 'number' ? h.hotMoneySell : Number(h.foreignSell || 0) + Number(h.arabSell || 0);

      // Defense-in-depth: clamp shares strictly >= 0 and normalize to exactly 100%
      let rawE = Math.max(0, Number(h.egyptianSharePct || 0));
      let rawA = Math.max(0, Number(h.arabSharePct || 0));
      let rawF = Math.max(0, Number(h.foreignSharePct || 0));
      const totalSum = rawE + rawA + rawF || 100;
      const eShare = Math.round((rawE / totalSum) * 1000) / 10;
      const aShare = Math.round((rawA / totalSum) * 1000) / 10;
      const fShare = Math.max(0, Math.round((100 - eShare - aShare) * 10) / 10);
      const hmShare = Math.round((fShare + aShare) * 10) / 10;

      return {
        ...h,
        foreignNet: fNet,
        arabNet: aNet,
        egyptianNet: eNet,
        hotMoneyNet: hmNet,
        hotMoneyBuy: hmBuy,
        hotMoneySell: hmSell,
        hotMoneySharePct: hmShare,
        egyptianSharePct: eShare,
        arabSharePct: aShare,
        foreignSharePct: fShare,
        foreignNetBalanced: toSymLog(fNet),
        arabNetBalanced: toSymLog(aNet),
        hotMoneyNetBalanced: toSymLog(hmNet),
      };
    });
  }, [data?.history]);

  const summary = data?.summary;
  const hotMoneyNetToday = typeof summary?.hotMoneyNetToday === 'number'
    ? summary.hotMoneyNetToday
    : (summary?.foreignNetToday || 0) + (summary?.arabNetToday || 0);
  const hotMoneyShareToday = typeof summary?.hotMoneyShareToday === 'number'
    ? summary.hotMoneyShareToday
    : Math.round(((summary?.foreignShareToday || 0) + (summary?.arabShareToday || 0)) * 10) / 10;

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

    const candidateMoneyTicks = [
      -30e9, -20e9, -15e9, -10e9, -5e9, -2e9, -1e9, -500e6, -250e6, -100e6,
      0,
      100e6, 250e6, 500e6, 1e9, 2e9, 5e9, 10e9, 15e9, 20e9, 30e9
    ];

    const activeMoneyTicks = candidateMoneyTicks.filter((m) => {
      const sym = toSymLog(m);
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

    return finalMoneyTicks.map((m) => toSymLog(m));
  }, [scaleMode, normalizedHistory, netFilter]);

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

          {/* Instrument / Market Segment Switches (All 4 EGX Filter Options) */}
          <div className="flex items-center gap-2 flex-wrap">
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
          </div>
        </div>

        {/* 2. Secondary Control Bar: Investor Category (Total / Institutions / Retail) & Chart Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
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
        ) : summary && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs pb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar">
              {chartMode === 'stacked_share' ? (
                <>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#2962ff]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{summary.egyptianShareToday}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${summary.egyptianNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatEgpVal(summary.egyptianNetToday, locale)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#f59e0b]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{summary.foreignShareToday}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${summary.foreignNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatEgpVal(summary.foreignNetToday, locale)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-none bg-[#089981]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                    <span className="font-bold text-plt-text tabular-nums">{summary.arabShareToday}%</span>
                    <span className={`text-[11px] font-semibold tabular-nums ml-0.5 ${summary.arabNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      ({formatEgpVal(summary.arabNetToday, locale)})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Combined Hot Money Net */}
                  <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-white/10">
                    <span className="text-plt-muted font-medium">
                      {locale === 'ar' ? 'صافي الساخنة:' : 'Hot Money Net:'}
                    </span>
                    <span className={`font-bold tabular-nums text-sm ${hotMoneyNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatEgpVal(hotMoneyNetToday, locale)}
                    </span>
                  </div>

                  {/* Foreigners component */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#f59e0b]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${summary.foreignNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatEgpVal(summary.foreignNetToday, locale)}
                    </span>
                  </div>

                  {/* Arabs component */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#089981]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${summary.arabNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatEgpVal(summary.arabNetToday, locale)}
                    </span>
                  </div>

                  {/* Domestic counterpart */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-none bg-[#2962ff]"></span>
                    <span className="text-plt-muted">{locale === 'ar' ? 'المحلي:' : 'Domestic:'}</span>
                    <span className={`font-semibold tabular-nums text-[11px] ${summary.egyptianNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                      {formatEgpVal(summary.egyptianNetToday, locale)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Participation Split Badge (Retail vs. Institutions) */}
            <div className="flex items-center gap-3 shrink-0">
              {summary.retailShareToday !== null && summary.instShareToday !== null && (
                <div className="flex items-center gap-2 py-1 px-2.5 bg-white/[0.04] border border-white/10 rounded-none text-[11px]">
                  <span className="text-plt-muted font-medium">
                    {locale === 'ar' ? 'هيكل التداول:' : 'Split:'}
                  </span>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="text-amber-400 font-semibold">{locale === 'ar' ? 'مؤسسات' : 'Inst'} {summary.instShareToday}%</span>
                    <span className="text-white/20">|</span>
                    <span className="text-sky-400 font-semibold">{locale === 'ar' ? 'أفراد' : 'Retail'} {summary.retailShareToday}%</span>
                  </div>
                  <div className="w-12 h-1.5 bg-sky-500/30 rounded-none overflow-hidden flex ml-1">
                    <div className="bg-amber-400 h-full" style={{ width: `${summary.instShareToday}%` }} />
                    <div className="bg-sky-400 h-full" style={{ width: `${summary.retailShareToday}%` }} />
                  </div>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                <span className="text-plt-muted text-[11px]">{locale === 'ar' ? 'التداول:' : 'Turnover:'}</span>
                <span className="text-plt-text font-bold tabular-nums">
                  {formatEgpVal(summary.totalTurnoverToday, locale, false)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Pitch Black Surface Canvas (No borders) */}
        <div className="relative mt-2 w-full min-w-0 h-[360px] sm:h-[400px] bg-black border-0 rounded-none overflow-hidden pt-2">
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
                      <div className="bg-[#3D3D3D] border border-white/15 rounded-none p-3.5 shadow-2xl text-xs space-y-2 z-50 min-w-[270px]">
                        <div className="text-neutral-300 font-medium pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                          <span className="tabular-nums font-semibold">{d.date}</span>
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {locale === 'ar' ? 'التداول: ' : 'Turnover: '}
                            {formatEgpVal(d.totalTurnover, locale, false)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#2962ff] font-medium">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.egyptianSharePct}% <span className={`text-[11px] ml-1 ${d.egyptianNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({formatEgpVal(d.egyptianNet, locale)})</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#f59e0b] font-medium">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.foreignSharePct}% <span className={`text-[11px] ml-1 ${d.foreignNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({formatEgpVal(d.foreignNet, locale)})</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#089981] font-medium">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.arabSharePct}% <span className={`text-[11px] ml-1 ${d.arabNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({formatEgpVal(d.arabNet, locale)})</span>
                            </span>
                          </div>
                        </div>
                        {d.retailSharePct !== null && d.instSharePct !== null && (
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-300">
                            <span>{locale === 'ar' ? 'مؤسسات / أفراد' : 'Inst / Retail Split'}</span>
                            <span className="tabular-nums font-medium">
                              <span className="text-amber-400 font-semibold">{d.instSharePct}%</span> / <span className="text-sky-400 font-semibold">{d.retailSharePct}%</span>
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
                    const realMoney = scaleMode === 'balanced' ? fromSymLog(val) : val;
                    const abs = Math.abs(realMoney);
                    if (abs < 1e6) return '0';
                    const sign = realMoney > 0 ? '+' : '-';
                    if (abs >= 1e9) {
                      return `${sign}${(abs / 1e9).toFixed(abs >= 10e9 ? 0 : 1)}${locale === 'ar' ? ' مليار' : 'B'}`;
                    }
                    return `${sign}${(abs / 1e6).toFixed(0)}${locale === 'ar' ? 'م' : 'M'}`;
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
                      <div className="bg-[#3D3D3D] border border-white/15 rounded-none p-3.5 shadow-2xl text-xs space-y-2.5 z-50 min-w-[280px] max-w-[350px]">
                        {/* Header: Date + Inflow/Outflow Badge */}
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
                          <span className="text-neutral-300 font-medium tabular-nums">{d.date}</span>
                          <span
                            className={`px-2 py-0.5 rounded-none text-[10px] font-bold tracking-wide uppercase tabular-nums ${
                              isHmPos
                                ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                                : 'bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40'
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
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-neutral-400">
                            {netFilter === 'foreign'
                              ? locale === 'ar'
                                ? 'صافي تدفق الأجانب'
                                : 'Foreign Net Flow'
                              : netFilter === 'arab'
                              ? locale === 'ar'
                                ? 'صافي تدفق العرب'
                                : 'Arab Net Flow'
                              : locale === 'ar'
                              ? 'إجمالي صافي الأموال الساخنة (أجانب + عرب)'
                              : 'Total Hot Money Net Flow'}
                          </div>
                          <div className={`text-base font-bold tabular-nums ${isPos ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {formatEgpVal(activeVal, locale)}
                          </div>
                        </div>

                        {/* Hot Money Components: Foreigners vs Arabs */}
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                            <span>{locale === 'ar' ? 'مكونات الأموال الساخنة (غير المحلي)' : 'Hot Money Breakdown'}</span>
                            <span>{locale === 'ar' ? 'الصافي' : 'Net'}</span>
                          </div>

                          {/* Foreigners */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-none bg-[#f59e0b]"></span>
                                <span className="text-neutral-200 font-medium">
                                  {locale === 'ar' ? 'الأجانب (دولي):' : 'Foreigners:'}
                                </span>
                              </div>
                              <span className={`font-bold tabular-nums ${d.foreignNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {formatEgpVal(d.foreignNet, locale)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{formatEgpVal(d.foreignBuy, locale, false)}</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{formatEgpVal(d.foreignSell, locale, false)}</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.foreignSharePct}%</span>
                            </div>
                          </div>

                          {/* Arabs */}
                          <div className="space-y-0.5 pt-1.5 border-t border-white/5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-none bg-[#089981]"></span>
                                <span className="text-neutral-200 font-medium">
                                  {locale === 'ar' ? 'العرب (إقليمي):' : 'Arabs:'}
                                </span>
                              </div>
                              <span className={`font-bold tabular-nums ${d.arabNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {formatEgpVal(d.arabNet, locale)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{formatEgpVal(d.arabBuy, locale, false)}</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{formatEgpVal(d.arabSell, locale, false)}</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.arabSharePct}%</span>
                            </div>
                          </div>

                          {/* Domestic (Egyptians) absorption */}
                          <div className="space-y-0.5 pt-1.5 border-t border-white/10">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-none bg-[#2962ff]"></span>
                                <span className="text-neutral-300 font-medium">
                                  {locale === 'ar' ? 'المصريون (المحلي):' : 'Egyptians (Domestic):'}
                                </span>
                              </div>
                              <span className={`font-semibold tabular-nums ${d.egyptianNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {formatEgpVal(d.egyptianNet, locale)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{formatEgpVal(d.egyptianBuy, locale, false)}</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{formatEgpVal(d.egyptianSell, locale, false)}</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.egyptianSharePct}%</span>
                            </div>
                          </div>

                          {/* Retail vs Inst split if available */}
                          {d.retailSharePct !== null && d.instSharePct !== null && (
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                              <span>{locale === 'ar' ? 'المؤسسات / الأفراد' : 'Inst / Retail'}</span>
                              <span className="tabular-nums font-semibold text-neutral-200">
                                <span className="text-amber-400">{d.instSharePct}%</span> / <span className="text-sky-400">{d.retailSharePct}%</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Session Turnover */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{locale === 'ar' ? 'إجمالي تداول الجلسة' : 'Session Turnover'}</span>
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {formatEgpVal(d.totalTurnover, locale, false)}
                          </span>
                        </div>
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

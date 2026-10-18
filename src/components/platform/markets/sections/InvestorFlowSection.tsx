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
export type FlowChartMode = 'stacked_share' | 'net_flow';
export type NetFlowFilter = 'all_hot_money' | 'foreign' | 'arab';

const HORIZONS: FlowHorizon[] = ['1M', '3M', '6M', 'YTD', '1Y'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvestorFlowSectionProps {
  id?: string;
}

export default function InvestorFlowSection({
  id = 'investor-flows',
}: InvestorFlowSectionProps) {
  const { locale } = useTranslation();
  const isHeroScene = useHeroSceneMode();
  const [horizon, setHorizon] = useState<FlowHorizon>('1M');
  const [chartMode, setChartMode] = useState<FlowChartMode>('net_flow');
  const [netFilter, setNetFilter] = useState<NetFlowFilter>('all_hot_money');

  const { data: liveData, isLoading: liveIsLoading } = useSWR<InvestorFlowsResponse>(
    isHeroScene ? null : `/api/macro/investor-flows?horizon=${horizon}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
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
      const hmShare = typeof h.hotMoneySharePct === 'number' ? h.hotMoneySharePct : Math.round((Number(h.foreignSharePct || 0) + Number(h.arabSharePct || 0)) * 10) / 10;

      return {
        ...h,
        foreignNet: fNet,
        arabNet: aNet,
        egyptianNet: eNet,
        hotMoneyNet: hmNet,
        hotMoneyBuy: hmBuy,
        hotMoneySell: hmSell,
        hotMoneySharePct: hmShare,
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
    if (netFilter === 'foreign') return 'foreignNet';
    if (netFilter === 'arab') return 'arabNet';
    return 'hotMoneyNet';
  };

  return (
    <div id={id} className="w-full pt-3 select-none font-sans">
      <div className="w-full bg-transparent p-0 border-0">
        {/* 1. Header: 'EGX Investor Flow ›' + Mode & Horizon Switchers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1 cursor-pointer group w-fit">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-plt-text group-hover:text-plt-text transition-colors">
              {locale === 'ar'
                ? 'تدفقات المستثمرين (الأموال المحلية مقابل الساخنة)'
                : 'Investor flow (Domestic vs. Foreign Hot Money)'}
            </h3>
            <ChevronRight
              size={16}
              className="text-plt-muted group-hover:text-plt-text transition-colors translate-y-[0.5px]"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Primary Mode Switcher: 100% Stacked Share vs Hot Money Net Flow */}
            <div className="seg-control h-7 py-0.5 px-1 rounded-lg">
              <button
                type="button"
                onClick={() => setChartMode('stacked_share')}
                className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                  chartMode === 'stacked_share'
                    ? 'bg-surface-active text-white font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {locale === 'ar' ? 'حصة السيولة 100%' : '100% Turnover Share'}
              </button>
              <button
                type="button"
                onClick={() => setChartMode('net_flow')}
                className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                  chartMode === 'net_flow'
                    ? 'bg-surface-active text-white font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {locale === 'ar' ? 'صافي الأموال الساخنة' : 'Hot Money Net Flow'}
              </button>
            </div>

            {/* Sub-Filter: Foreigners vs Arabs vs Combined (Only in Net Flow mode) */}
            {chartMode === 'net_flow' && (
              <div className="seg-control h-7 py-0.5 px-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNetFilter('all_hot_money')}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                    netFilter === 'all_hot_money'
                      ? 'bg-surface-active text-white font-semibold shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={locale === 'ar' ? 'إجمالي صافي غير المصريين (أجانب + عرب)' : 'Total Non-Domestic Net (Foreigners + Arabs)'}
                >
                  {locale === 'ar' ? 'إجمالي الساخنة' : 'All Hot Money'}
                </button>
                <button
                  type="button"
                  onClick={() => setNetFilter('foreign')}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                    netFilter === 'foreign'
                      ? 'bg-surface-active text-white font-semibold shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={locale === 'ar' ? 'صافي تدفق المؤسسات الأجنبية الدولية' : 'International Foreign Institutions Net'}
                >
                  {locale === 'ar' ? 'الأجانب' : 'Foreigners'}
                </button>
                <button
                  type="button"
                  onClick={() => setNetFilter('arab')}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                    netFilter === 'arab'
                      ? 'bg-surface-active text-white font-semibold shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={locale === 'ar' ? 'صافي تدفق المستثمرين العرب الإقليميين' : 'Regional Arab Investors Net'}
                >
                  {locale === 'ar' ? 'العرب' : 'Arabs'}
                </button>
              </div>
            )}

            {/* Horizon Pills */}
            <div className="seg-control h-7 py-0.5 px-1 rounded-lg">
              {HORIZONS.map((h) => {
                const isSelected = horizon === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-active text-white font-semibold shadow-xs'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Executive Quick Stats Bar / Dynamic Contextual Legend */}
        {isLoading ? (
          <div className="flex items-center gap-3 sm:gap-5 text-xs pb-2 border-b border-plt-border-soft">
            <Skeleton className="h-4 w-32 rounded-none" />
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-4 w-24 rounded-none ml-auto hidden md:block" />
          </div>
        ) : summary && (
          <div className="flex items-center gap-3 sm:gap-5 text-xs pb-2 border-b border-plt-border-soft overflow-x-auto no-scrollbar">
            {chartMode === 'stacked_share' ? (
              /* Mode A Legend: 100% Turnover Share (Category Colors Match Stacked Bars) */
              <>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'المصريون (محلي):' : 'Egyptians (Domestic):'}</span>
                  <span className="font-bold text-plt-text tabular-nums">{summary.egyptianShareToday}%</span>
                  <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.egyptianNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    ({summary.egyptianNetToday >= 0 ? '+' : ''}{(summary.egyptianNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب (أموال ساخنة):' : 'Foreigners (Hot Money):'}</span>
                  <span className="font-bold text-plt-text tabular-nums">{summary.foreignShareToday}%</span>
                  <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.foreignNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    ({summary.foreignNetToday >= 0 ? '+' : ''}{(summary.foreignNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#089981]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'العرب (أموال ساخنة):' : 'Arabs (Hot Money):'}</span>
                  <span className="font-bold text-plt-text tabular-nums">{summary.arabShareToday}%</span>
                  <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.arabNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    ({summary.arabNetToday >= 0 ? '+' : ''}{(summary.arabNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
                  </span>
                </div>
              </>
            ) : (
              /* Mode B Legend: Hot Money Net Flow (Matches Green/Red Bar Semantics) */
              <>
                {/* Visual Bar Colors Legend */}
                <div className="flex items-center gap-2.5 shrink-0 pr-3 border-r border-plt-border-soft">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#089981]"></span>
                    <span className="text-plt-subtle font-medium text-[11px]">
                      {locale === 'ar' ? 'صافي دخول (شراء)' : 'Net Inflow (+)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#f23645]"></span>
                    <span className="text-plt-subtle font-medium text-[11px]">
                      {locale === 'ar' ? 'صافي خروج (بيع)' : 'Net Outflow (-)'}
                    </span>
                  </div>
                </div>

                {/* Combined Hot Money Net */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-plt-muted font-medium">
                    {locale === 'ar' ? 'إجمالي الساخنة:' : 'Hot Money Net:'}
                  </span>
                  <span className={`font-bold tabular-nums ${hotMoneyNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    {hotMoneyNetToday >= 0 ? '+' : ''}{(hotMoneyNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}
                  </span>
                </div>

                {/* Foreigners component */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'الأجانب:' : 'Foreigners:'}</span>
                  <span className={`font-semibold tabular-nums text-[11px] ${summary.foreignNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    {summary.foreignNetToday >= 0 ? '+' : ''}{(summary.foreignNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}
                  </span>
                </div>

                {/* Arabs component */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#089981]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                  <span className={`font-semibold tabular-nums text-[11px] ${summary.arabNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    {summary.arabNetToday >= 0 ? '+' : ''}{(summary.arabNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}
                  </span>
                </div>

                {/* Domestic counterpart */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]"></span>
                  <span className="text-plt-muted">{locale === 'ar' ? 'المحلي:' : 'Domestic:'}</span>
                  <span className={`font-semibold tabular-nums text-[11px] ${summary.egyptianNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                    {summary.egyptianNetToday >= 0 ? '+' : ''}{(summary.egyptianNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}
                  </span>
                </div>
              </>
            )}

            <div className="ml-auto hidden md:flex items-center gap-2 shrink-0">
              <span className="text-plt-muted text-[11px]">{locale === 'ar' ? 'آخر جلسة:' : 'Latest Session:'}</span>
              <span className="text-plt-text font-medium tabular-nums">{summary.latestDate}</span>
            </div>
          </div>
        )}

        {/* 3. TradingView Dark Surface Canvas */}
        <div className="relative mt-2 w-full min-w-0 h-[360px] sm:h-[400px] bg-plt-base overflow-hidden pt-2">
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
          ) : normalizedHistory.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {locale === 'ar' ? 'لا توجد بيانات متاحة لتدفقات المستثمرين في هذا الإطار الزمني.' : 'No investor flow history available for this timeframe.'}
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
                      <div className="bg-[#3D3D3D] border border-white/15 rounded-lg p-3.5 shadow-2xl text-xs space-y-2 z-50 min-w-[260px]">
                        <div className="text-neutral-300 font-medium pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                          <span className="tabular-nums">{d.date}</span>
                          <span className="font-semibold text-neutral-200">
                            {locale === 'ar' ? 'تداول الجلسة: ' : 'Turnover: '}
                            {(d.totalTurnover / 1e9).toFixed(2)}
                            {locale === 'ar' ? ' مليار ج.م' : 'B EGP'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#2962ff] font-medium">{locale === 'ar' ? 'المصريون (محلي):' : 'Egyptians (Domestic):'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.egyptianSharePct}% <span className={`text-[11px] ml-1 ${d.egyptianNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({d.egyptianNet >= 0 ? '+' : ''}{(d.egyptianNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#f59e0b] font-medium">{locale === 'ar' ? 'الأجانب (ساخنة):' : 'Foreigners (Hot Money):'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.foreignSharePct}% <span className={`text-[11px] ml-1 ${d.foreignNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({d.foreignNet >= 0 ? '+' : ''}{(d.foreignNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[#089981] font-medium">{locale === 'ar' ? 'العرب (ساخنة):' : 'Arabs (Hot Money):'}</span>
                            <span className="font-bold text-white tabular-nums">
                              {d.arabSharePct}% <span className={`text-[11px] ml-1 ${d.arabNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>({d.arabNet >= 0 ? '+' : ''}{(d.arabNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                            </span>
                          </div>
                        </div>
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
                  width={56}
                  stroke="#262626"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                  tickFormatter={(val: number) => `${(val / 1e6).toFixed(0)}${locale === 'ar' ? 'م' : 'M'}`}
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
                      <div className="bg-[#3D3D3D] border border-white/15 rounded-lg p-3.5 shadow-2xl text-xs space-y-2.5 z-50 min-w-[270px] max-w-[340px]">
                        {/* Header: Date + Inflow/Outflow Badge */}
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
                          <span className="text-neutral-300 font-medium tabular-nums">{d.date}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase tabular-nums ${
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
                            {isPos ? '+' : ''}{(activeVal / 1e6).toFixed(2)} {locale === 'ar' ? 'مليون ج.م' : 'Million EGP'}
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
                                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                                <span className="text-neutral-200 font-medium">
                                  {locale === 'ar' ? 'الأجانب (دولي):' : 'Foreigners:'}
                                </span>
                              </div>
                              <span className={`font-bold tabular-nums ${d.foreignNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {d.foreignNet >= 0 ? '+' : ''}{(d.foreignNet / 1e6).toFixed(2)}M
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{(d.foreignBuy / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{(d.foreignSell / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.foreignSharePct}%</span>
                            </div>
                          </div>

                          {/* Arabs */}
                          <div className="space-y-0.5 pt-1.5 border-t border-white/5">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#089981]"></span>
                                <span className="text-neutral-200 font-medium">
                                  {locale === 'ar' ? 'العرب (إقليمي):' : 'Arabs:'}
                                </span>
                              </div>
                              <span className={`font-bold tabular-nums ${d.arabNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {d.arabNet >= 0 ? '+' : ''}{(d.arabNet / 1e6).toFixed(2)}M
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{(d.arabBuy / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{(d.arabSell / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.arabSharePct}%</span>
                            </div>
                          </div>

                          {/* Domestic (Egyptians) absorption */}
                          <div className="space-y-0.5 pt-1.5 border-t border-white/10">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]"></span>
                                <span className="text-neutral-300 font-medium">
                                  {locale === 'ar' ? 'المصريون (المحلي):' : 'Egyptians (Domestic):'}
                                </span>
                              </div>
                              <span className={`font-semibold tabular-nums ${d.egyptianNet >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                {d.egyptianNet >= 0 ? '+' : ''}{(d.egyptianNet / 1e6).toFixed(2)}M
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 tabular-nums pl-3">
                              <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{(d.egyptianBuy / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{(d.egyptianSell / 1e6).toFixed(1)}M</span>
                              <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.egyptianSharePct}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Session Turnover */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{locale === 'ar' ? 'إجمالي تداول الجلسة' : 'Session Turnover'}</span>
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {(d.totalTurnover / 1e9).toFixed(2)} {locale === 'ar' ? 'مليار ج.م' : 'B EGP'}
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

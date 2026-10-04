'use client';

import React, { useState } from 'react';
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
import SectionLoadingState from '@/components/ui/SectionLoadingState';
import type { InvestorFlowsResponse } from '@/lib/handlers/investor-flow-handler';
import { useTranslation } from '@/lib/i18n';

export type FlowHorizon = '1M' | '3M' | '6M' | 'YTD' | '1Y';
export type FlowChartMode = 'stacked_share' | 'foreign_net';

const HORIZONS: FlowHorizon[] = ['1M', '3M', '6M', 'YTD', '1Y'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvestorFlowSectionProps {
  id?: string;
}

export default function InvestorFlowSection({
  id = 'investor-flows',
}: InvestorFlowSectionProps) {
  const { locale } = useTranslation();
  const [horizon, setHorizon] = useState<FlowHorizon>('1M');
  const [chartMode, setChartMode] = useState<FlowChartMode>('stacked_share');

  const { data, isLoading } = useSWR<InvestorFlowsResponse>(
    `/api/macro/investor-flows?horizon=${horizon}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );

  const history = data?.history || [];
  const summary = data?.summary;

  return (
    <div id={id} className="w-full pt-3 select-none font-sans">
      <div className="w-full bg-transparent p-0 border-0">
        {/* 1. Header: 'EGX Investor Flow ›' + Mode & Horizon Switchers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1 cursor-pointer group w-fit">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              {locale === 'ar'
                ? 'تدفقات المستثمرين (الأموال المحلية مقابل الساخنة)'
                : 'Investor flow (Domestic vs. Foreign Hot Money)'}
            </h3>
            <ChevronRight
              size={16}
              className="text-neutral-400 group-hover:text-white transition-colors translate-y-[0.5px]"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Mode Switcher: 100% Stacked Share vs Net Flow */}
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
                onClick={() => setChartMode('foreign_net')}
                className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer ${
                  chartMode === 'foreign_net'
                    ? 'bg-surface-active text-white font-semibold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {locale === 'ar' ? 'صافي التدفق الأجنبي' : 'Foreign Net Flow'}
              </button>
            </div>

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

        {/* 2. Executive Quick Stats Bar */}
        {summary && (
          <div className="flex items-center gap-4 sm:gap-6 text-xs pb-2 border-b border-white/5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff]"></span>
              <span className="text-neutral-400">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
              <span className="font-bold text-white tabular-nums">{summary.egyptianShareToday}%</span>
              <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.egyptianNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                ({summary.egyptianNetToday >= 0 ? '+' : ''}{(summary.egyptianNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              <span className="text-neutral-400">{locale === 'ar' ? 'الأجانب (الأموال الساخنة):' : 'Foreigners (Hot Money):'}</span>
              <span className="font-bold text-white tabular-nums">{summary.foreignShareToday}%</span>
              <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.foreignNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                ({summary.foreignNetToday >= 0 ? '+' : ''}{(summary.foreignNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#089981]"></span>
              <span className="text-neutral-400">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
              <span className="font-bold text-white tabular-nums">{summary.arabShareToday}%</span>
              <span className={`text-[11px] font-semibold tabular-nums ml-1 ${summary.arabNetToday >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                ({summary.arabNetToday >= 0 ? '+' : ''}{(summary.arabNetToday / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})
              </span>
            </div>

            <div className="ml-auto hidden md:flex items-center gap-2 shrink-0">
              <span className="text-neutral-500 text-[11px]">{locale === 'ar' ? 'آخر جلسة:' : 'Latest Session:'}</span>
              <span className="text-neutral-300 font-medium tabular-nums">{summary.latestDate}</span>
            </div>
          </div>
        )}

        {/* 3. TradingView Dark Surface Canvas */}
        <div className="relative mt-2 w-full min-w-0 h-[360px] sm:h-[400px] bg-black overflow-hidden pt-2">
          {isLoading ? (
            <SectionLoadingState className="h-full" label={locale === 'ar' ? 'جاري تحميل تدفقات المستثمرين…' : 'Loading investor flow data…'} />
          ) : history.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {locale === 'ar' ? 'لا توجد بيانات متاحة لتدفقات المستثمرين في هذا الإطار الزمني.' : 'No investor flow history available for this timeframe.'}
            </div>
          ) : chartMode === 'stacked_share' ? (
            /* Mode A: 100% Stacked Turnover Share */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={history}
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
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50">
                        <div className="text-neutral-400 font-medium pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span>{d.date}</span>
                          <span className="font-semibold text-neutral-200">
                            {locale === 'ar' ? 'قيمة تداول الجلسة: ' : 'Session Turnover: '}
                            {(d.totalTurnover / 1e9).toFixed(2)}
                            {locale === 'ar' ? ' مليار ج.م' : 'B EGP'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#2962ff] font-medium">{locale === 'ar' ? 'المصريون:' : 'Egyptians:'}</span>
                          <span className="font-bold text-white tabular-nums">
                            {d.egyptianSharePct}% <span className={`text-[11px] ml-1 ${d.egyptianNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>({d.egyptianNet >= 0 ? '+' : ''}{(d.egyptianNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#f59e0b] font-medium">{locale === 'ar' ? 'الأجانب (الأموال الساخنة):' : 'Foreigners (Hot Money):'}</span>
                          <span className="font-bold text-white tabular-nums">
                            {d.foreignSharePct}% <span className={`text-[11px] ml-1 ${d.foreignNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>({d.foreignNet >= 0 ? '+' : ''}{(d.foreignNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[#089981] font-medium">{locale === 'ar' ? 'العرب:' : 'Arabs:'}</span>
                          <span className="font-bold text-white tabular-nums">
                            {d.arabSharePct}% <span className={`text-[11px] ml-1 ${d.arabNet >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>({d.arabNet >= 0 ? '+' : ''}{(d.arabNet / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'})</span>
                          </span>
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
            /* Mode B: Foreign Net Flow Bars */
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={history}
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
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    const isPos = d.foreignNet >= 0;
                    return (
                      <div className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50">
                        <div className="text-neutral-400 font-medium pb-1 border-b border-white/10 flex items-center justify-between gap-4">
                          <span>{d.date}</span>
                          <span className="font-semibold text-neutral-200">{locale === 'ar' ? 'صافي التدفق الأجنبي' : 'Foreign Net Flow'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-0.5">
                          <span className="text-neutral-400">{locale === 'ar' ? 'صافي الرصيد:' : 'Net Balance:'}</span>
                          <span className={`font-bold tabular-nums text-sm ${isPos ? 'text-profit-num' : 'text-loss-num'}`}>
                            {isPos ? '+' : ''}{(d.foreignNet / 1e6).toFixed(2)} {locale === 'ar' ? 'مليون ج.م' : 'Million EGP'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[11px] text-neutral-400 pt-1 border-t border-white/5">
                          <span>{locale === 'ar' ? 'شراء: ' : 'Buy: '}{(d.foreignBuy / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}</span>
                          <span>{locale === 'ar' ? 'بيع: ' : 'Sell: '}{(d.foreignSell / 1e6).toFixed(1)}{locale === 'ar' ? 'م' : 'M'}</span>
                          <span>{locale === 'ar' ? 'الحصة: ' : 'Share: '}{d.foreignSharePct}%</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="foreignNet">
                  {history.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.foreignNet >= 0 ? '#089981' : '#f23645'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

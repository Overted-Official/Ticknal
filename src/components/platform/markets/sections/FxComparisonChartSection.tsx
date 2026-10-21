'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ChevronRight } from '@/components/ui/icon-library';
import Skeleton from '@/components/ui/Skeleton';
import { useTranslation } from '@/lib/i18n';
import type { FxFairValueResponse, FxHistoryItem } from '@/lib/handlers/fx-fair-value-handler';

export type SelectedFxSeries = 'ALL' | 'OFFICIAL' | 'FAIR' | 'USDT' | 'GOLD' | 'CIB';
export type FxHorizon = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

const HORIZONS: { key: FxHorizon; label: string; labelAr: string; count: number }[] = [
  { key: '1M', label: '1M', labelAr: 'شهر', count: 22 },
  { key: '3M', label: '3M', labelAr: '3 أشهر', count: 66 },
  { key: '6M', label: '6M', labelAr: '6 أشهر', count: 132 },
  { key: 'YTD', label: 'YTD', labelAr: 'من بداية العام', count: 190 },
  { key: '1Y', label: '1Y', labelAr: 'سنة', count: 250 },
  { key: 'ALL', label: 'ALL', labelAr: 'الكل', count: 9999 },
];

interface FxComparisonChartSectionProps {
  id?: string;
  fxData?: FxFairValueResponse | null;
  isLoading?: boolean;
}

export default function FxComparisonChartSection({
  id = 'fx-comparison-chart',
  fxData,
  isLoading = false,
}: FxComparisonChartSectionProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const [selectedSeries, setSelectedSeries] = useState<SelectedFxSeries>('ALL');
  const [horizon, setHorizon] = useState<FxHorizon>('6M');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Spot benchmarks from fxData
  const officialUsd = fxData?.officialUsd ?? 54.5;
  const compositeFair = fxData?.compositeFairValue ?? 55.19;
  const usdtRate = fxData?.usdtRate ?? 55.08;
  const goldRate = fxData?.goldImpliedRate ?? 53.96;
  const gdrRate = fxData?.gdrImpliedRate ?? 56.58;

  const fairGapPct = fxData?.managedGapPct ?? Number((((compositeFair - officialUsd) / officialUsd) * 100).toFixed(1));
  const usdtSpread = fxData?.usdtSpreadPct ?? Number((((usdtRate - officialUsd) / officialUsd) * 100).toFixed(1));
  const goldSpread = fxData?.goldSpreadPct ?? Number((((goldRate - officialUsd) / officialUsd) * 100).toFixed(1));
  const gdrSpread = fxData?.gdrSpreadPct ?? Number((((gdrRate - officialUsd) / officialUsd) * 100).toFixed(1));

  // Series carousel definition matching MajorIndicesSection 1-to-1
  const seriesTabs = [
    {
      id: 'ALL' as SelectedFxSeries,
      badge: 'ALL',
      name: isAr ? 'مقارنة الأسعار' : 'All Proxies',
      value: officialUsd,
      spreadText: isAr ? 'شامل' : 'Compare',
      spreadColor: 'text-brand-blue',
      strokeColor: '#38bdf8',
    },
    {
      id: 'OFFICIAL' as SelectedFxSeries,
      badge: 'USD',
      name: isAr ? 'الدولار الرسمي (CBE)' : 'Official USD / EGP',
      value: officialUsd,
      spreadText: isAr ? 'الأساس' : 'Spot Baseline',
      spreadColor: 'text-neutral-400',
      strokeColor: '#38bdf8',
    },
    {
      id: 'FAIR' as SelectedFxSeries,
      badge: 'FAIR',
      name: isAr ? 'القيمة العادلة الحقيقية' : 'Real EGP Fair Value',
      value: compositeFair,
      spreadText: `${fairGapPct >= 0 ? '+' : ''}${fairGapPct.toFixed(1)}%`,
      spreadColor: 'text-profit-num',
      strokeColor: '#10b981',
    },
    {
      id: 'USDT' as SelectedFxSeries,
      badge: 'USDT',
      name: isAr ? 'دولار التيذر (P2P)' : 'P2P USDT Proxy',
      value: usdtRate,
      spreadText: `${usdtSpread >= 0 ? '+' : ''}${usdtSpread.toFixed(1)}%`,
      spreadColor: usdtSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
      strokeColor: '#06b6d4',
    },
    {
      id: 'GOLD' as SelectedFxSeries,
      badge: 'GOLD',
      name: isAr ? 'دولار الصاغة (الذهب)' : 'Sagha Gold Proxy',
      value: goldRate,
      spreadText: `${goldSpread >= 0 ? '+' : ''}${goldSpread.toFixed(1)}%`,
      spreadColor: goldSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
      strokeColor: '#f59e0b',
    },
    {
      id: 'CIB' as SelectedFxSeries,
      badge: 'CIB',
      name: isAr ? 'دولار CIB لندن (GDR)' : 'Offshore CIB Proxy',
      value: gdrRate,
      spreadText: `${gdrSpread >= 0 ? '+' : ''}${gdrSpread.toFixed(1)}%`,
      spreadColor: gdrSpread >= 0 ? 'text-profit-num' : 'text-loss-num',
      strokeColor: '#a855f7',
    },
  ];

  // Slice history by selected horizon
  const chartData = useMemo(() => {
    const rawHistory = fxData?.history;
    if (!rawHistory || rawHistory.length === 0) return [];

    const selectedPreset = HORIZONS.find((h) => h.key === horizon);
    const count = selectedPreset ? selectedPreset.count : 132;
    return rawHistory.slice(-count);
  }, [fxData?.history, horizon]);

  // Compute dynamic Y-axis min/max
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 45, yMax: 60, yTicks: [45, 50, 55, 60] };

    let allValues: number[] = [];
    if (selectedSeries === 'ALL') {
      for (const d of chartData) {
        allValues.push(d.officialUsd, d.compositeFair, d.usdtRate, d.goldRate, d.gdrRate);
      }
    } else if (selectedSeries === 'OFFICIAL') {
      allValues = chartData.map((d) => d.officialUsd);
    } else if (selectedSeries === 'FAIR') {
      allValues = chartData.map((d) => d.compositeFair);
    } else if (selectedSeries === 'USDT') {
      allValues = chartData.map((d) => d.usdtRate);
    } else if (selectedSeries === 'GOLD') {
      allValues = chartData.map((d) => d.goldRate);
    } else if (selectedSeries === 'CIB') {
      allValues = chartData.map((d) => d.gdrRate);
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const spread = max - min || min * 0.05 || 2;
    const padding = spread * 0.12;

    const rawMin = Math.floor(Math.max(0, min - padding));
    const rawMax = Math.ceil(max + padding);

    // Clean integer or 0.5 interval ticks
    const step = rawMax - rawMin > 10 ? 2 : 1;
    const ticks: number[] = [];
    for (let t = rawMin; t <= rawMax; t += step) {
      ticks.push(t);
    }

    return {
      yMin: rawMin,
      yMax: rawMax,
      yTicks: ticks,
    };
  }, [chartData, selectedSeries]);

  const activeTabConfig = seriesTabs.find((t) => t.id === selectedSeries) || seriesTabs[0];

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: isAr ? -220 : 220, behavior: 'smooth' });
    }
  };

  return (
    <div id={id} className="w-full pt-3 select-none font-sans">
      <div className="w-full bg-transparent p-0 border-0">
        {/* 1. Header: Title + Canonical Horizon Switcher */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-plt-text">
              {isAr ? 'مسار سعر الصرف الرسمي مقابل الأسواق الموازية' : 'Official USD vs. Shadow Proxies'}
            </h3>
            <p className="text-[11px] text-plt-muted hidden sm:block">
              {isAr
                ? 'مقارنة تاريخية يومية للدولار الرسمي مقابل الصاغة وتيذر وCIB لندن والقيمة العادلة'
                : 'Daily historical progression of official CBE spot vs. Sagha gold, P2P USDT, offshore CIB, and triangulated fair value'}
            </p>
          </div>

          {/* Time Horizon Switcher (Canonical segmented control) */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="seg-control h-7.5 p-0.5">
              {HORIZONS.map((h) => {
                const isSelected = horizon === h.key;
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => setHorizon(h.key)}
                    className={`seg-control-btn h-full px-2.5 text-[11px] ${
                      isSelected ? 'seg-control-btn-active' : ''
                    }`}
                  >
                    {isAr ? h.labelAr : h.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Selectable Series Carousel Row (1-to-1 with Major Indices) */}
        <div className="flex items-center justify-between gap-3 relative">
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar select-none flex-1"
          >
            {seriesTabs.map((item) => {
              const isSelected = selectedSeries === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSeries(item.id)}
                  className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-full transition-all shrink-0 text-left cursor-pointer ${
                    isSelected
                      ? 'bg-surface-active border border-white/10 shadow-lg'
                      : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Left Circular Badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-surface-raised text-white border border-neutral-600'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-700/80'
                    }`}
                  >
                    {item.badge}
                  </div>

                  {/* Right Info Block */}
                  <div className="flex flex-col justify-center">
                    {/* Top Line: Name + Amber D Tag + Dash */}
                    <div className="flex items-center gap-1 leading-none">
                      <span
                        className={`text-xs font-medium tracking-tight whitespace-nowrap ${
                          isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 ml-0.5">D</span>
                      <span className="text-neutral-500 text-xs ml-0.5">-</span>
                    </div>

                    {/* Bottom Line: Rate in EGP + Spread % */}
                    <div className="flex items-center gap-1.5 mt-1 leading-none">
                      <span className="text-xs font-bold text-white tabular-nums">
                        {item.value.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight">
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ml-1 ${item.spreadColor}`}>
                        {item.spreadText}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Carousel Right Arrow Button */}
          <button
            type="button"
            onClick={scrollRight}
            className="w-8 h-8 rounded-full bg-black hover:bg-surface-raised border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0 cursor-pointer mb-2"
            title={isAr ? 'الخيارات التالية' : 'Next series'}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 3. Pure Pitch Black Surface Chart Canvas (Border-0, Rounded-None) */}
        <div className="relative mt-2 w-full min-w-0 h-[380px] sm:h-[420px] bg-black border-0 rounded-none overflow-hidden pt-2" dir="ltr">
          {isLoading ? (
            <div className="w-full h-full flex flex-col justify-between p-6 select-none">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-none" />
                <Skeleton className="h-4 w-16 rounded-none" />
              </div>
              <div className="flex-1 flex items-end gap-2 py-6 opacity-30">
                {[45, 52, 48, 62, 58, 72, 68, 80, 76, 88, 92].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/10 rounded-none animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between border-t border-plt-border-soft pt-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-2.5 w-10 rounded-none" />
                ))}
              </div>
            </div>
          ) : chartData.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
              {isAr ? 'لا توجد بيانات تاريخية متاحة لهذا الإطار الزمني.' : 'No historical data available for this timeframe.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {selectedSeries === 'ALL' ? (
                /* Multi-line comparative view */
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
                >
                  <YAxis
                    orientation="right"
                    domain={[yMin, yMax]}
                    ticks={yTicks}
                    stroke="#262626"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                    tickFormatter={(val: number) => `${val.toFixed(1)}${isAr ? ' ج.م' : ' EGP'}`}
                    width={56}
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

                  {/* Canonical EGX 30 Style Floating Hovercard */}
                  <Tooltip
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const d = payload[0].payload as FxHistoryItem;

                      return (
                        <div
                          className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50 min-w-[270px]"
                          dir={isAr ? 'rtl' : 'ltr'}
                        >
                          {/* Header: Date + Title */}
                          <div className="text-neutral-400 font-medium pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                            <span className="tabular-nums">{d.date}</span>
                            <span className="font-semibold text-neutral-200">
                              {isAr ? 'أسعار الصرف المتوازية' : 'FX & Shadow Rates'}
                            </span>
                          </div>

                          {/* Official USD (CBE) Baseline */}
                          <div className="flex items-center justify-between gap-4 pt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
                              <span className="text-neutral-300 font-medium">
                                {isAr ? 'السعر الرسمي (CBE):' : 'Official USD (CBE):'}
                              </span>
                            </div>
                            <span className="font-bold text-white tabular-nums text-sm">
                              {d.officialUsd.toFixed(2)}{' '}
                              <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>
                            </span>
                          </div>

                          {/* Proxies Breakdown */}
                          <div className="space-y-1 pt-1 border-t border-plt-border-soft">
                            {/* Real Fair Value */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                <span className="text-neutral-400">{isAr ? 'القيمة العادلة:' : 'Fair Value:'}</span>
                              </div>
                              <span className="font-semibold text-white tabular-nums">
                                {d.compositeFair.toFixed(2)} <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>{' '}
                                <span className={`text-[11px] font-semibold ml-1 ${d.fairSpread >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                  ({d.fairSpread >= 0 ? '+' : ''}{d.fairSpread.toFixed(1)}%)
                                </span>
                              </span>
                            </div>

                            {/* USDT P2P */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span>
                                <span className="text-neutral-400">{isAr ? 'تيذر P2P:' : 'USDT P2P:'}</span>
                              </div>
                              <span className="font-semibold text-white tabular-nums">
                                {d.usdtRate.toFixed(2)} <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>{' '}
                                <span className={`text-[11px] font-semibold ml-1 ${d.usdtSpread >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                  ({d.usdtSpread >= 0 ? '+' : ''}{d.usdtSpread.toFixed(1)}%)
                                </span>
                              </span>
                            </div>

                            {/* Sagha Gold */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                                <span className="text-neutral-400">{isAr ? 'دولار الصاغة:' : 'Sagha Gold:'}</span>
                              </div>
                              <span className="font-semibold text-white tabular-nums">
                                {d.goldRate.toFixed(2)} <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>{' '}
                                <span className={`text-[11px] font-semibold ml-1 ${d.goldSpread >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                  ({d.goldSpread >= 0 ? '+' : ''}{d.goldSpread.toFixed(1)}%)
                                </span>
                              </span>
                            </div>

                            {/* Offshore CIB London */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></span>
                                <span className="text-neutral-400">{isAr ? 'CIB لندن (GDR):' : 'CIB London:'}</span>
                              </div>
                              <span className="font-semibold text-white tabular-nums">
                                {d.gdrRate.toFixed(2)} <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>{' '}
                                <span className={`text-[11px] font-semibold ml-1 ${d.gdrSpread >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                                  ({d.gdrSpread >= 0 ? '+' : ''}{d.gdrSpread.toFixed(1)}%)
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Footer: Max Parallel Spread */}
                          <div className="flex items-center justify-between gap-4 text-plt-muted text-[11px] pt-1.5 border-t border-plt-border-soft">
                            <span>{isAr ? 'الفجوة الموازية العظمى:' : 'Max Parallel Spread:'}</span>
                            <span className="font-semibold text-neutral-200 tabular-nums">
                              +{d.maxSpread.toFixed(2)} EGP (+{d.maxSpreadPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  {/* 5 Distinct crisp line series */}
                  <Line type="linear" dataKey="officialUsd" stroke="#38bdf8" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="compositeFair" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="usdtRate" stroke="#06b6d4" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="goldRate" stroke="#f59e0b" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="gdrRate" stroke="#a855f7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                </LineChart>
              ) : (
                /* Focused Single Series View with Area Gradient + Benchmark */
                <AreaChart
                  data={chartData}
                  margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id={`fx-grad-${selectedSeries}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeTabConfig.strokeColor} stopOpacity={0.28} />
                      <stop offset="50%" stopColor={activeTabConfig.strokeColor} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={activeTabConfig.strokeColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <YAxis
                    orientation="right"
                    domain={[yMin, yMax]}
                    ticks={yTicks}
                    stroke="#262626"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#888888', fontSize: 10, fontFamily: 'sans-serif' }}
                    tickFormatter={(val: number) => `${val.toFixed(1)}${isAr ? ' ج.م' : ' EGP'}`}
                    width={56}
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

                  {/* Canonical EGX 30 Style Floating Hovercard */}
                  <Tooltip
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const d = payload[0].payload as FxHistoryItem;
                      const activeVal =
                        selectedSeries === 'OFFICIAL'
                          ? d.officialUsd
                          : selectedSeries === 'FAIR'
                          ? d.compositeFair
                          : selectedSeries === 'USDT'
                          ? d.usdtRate
                          : selectedSeries === 'GOLD'
                          ? d.goldRate
                          : d.gdrRate;

                      const spreadVsOfficial = Number((((activeVal - d.officialUsd) / d.officialUsd) * 100).toFixed(1));

                      return (
                        <div
                          className="bg-surface-raised border border-neutral-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50 min-w-[260px]"
                          dir={isAr ? 'rtl' : 'ltr'}
                        >
                          <div className="text-neutral-400 font-medium pb-1.5 border-b border-white/10 flex items-center justify-between gap-4">
                            <span className="tabular-nums">{d.date}</span>
                            <span className="font-semibold text-neutral-200">{activeTabConfig.name}</span>
                          </div>

                          <div className="flex items-center justify-between gap-4 pt-0.5">
                            <span className="text-neutral-400">{isAr ? 'السعر:' : 'Rate:'}</span>
                            <span className="font-bold text-white tabular-nums text-sm">
                              {activeVal.toFixed(2)}{' '}
                              <span className="text-[10px] text-neutral-400">{isAr ? 'ج.م' : 'EGP'}</span>
                            </span>
                          </div>

                          {selectedSeries !== 'OFFICIAL' && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-neutral-400">{isAr ? 'الفارق عن الرسمي:' : 'Spread vs. Official:'}</span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  spreadVsOfficial >= 0 ? 'text-profit-num' : 'text-loss-num'
                                }`}
                              >
                                {spreadVsOfficial >= 0 ? '+' : ''}
                                {spreadVsOfficial.toFixed(1)}% ({(activeVal - d.officialUsd >= 0 ? '+' : '')}
                                {(activeVal - d.officialUsd).toFixed(2)} EGP)
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-4 text-plt-muted text-[11px] pt-1.5 border-t border-plt-border-soft">
                            <span>{isAr ? 'الرسمي (CBE):' : 'Official CBE: '}</span>
                            <span className="font-semibold text-neutral-200 tabular-nums">
                              {d.officialUsd.toFixed(2)} EGP
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  {/* Primary focused Area */}
                  <Area
                    type="linear"
                    dataKey={
                      selectedSeries === 'OFFICIAL'
                        ? 'officialUsd'
                        : selectedSeries === 'FAIR'
                        ? 'compositeFair'
                        : selectedSeries === 'USDT'
                        ? 'usdtRate'
                        : selectedSeries === 'GOLD'
                        ? 'goldRate'
                        : 'gdrRate'
                    }
                    stroke={activeTabConfig.strokeColor}
                    strokeWidth={2}
                    fill={`url(#fx-grad-${selectedSeries})`}
                    isAnimationActive={false}
                  />

                  {/* Secondary dashed benchmark line if not official */}
                  {selectedSeries !== 'OFFICIAL' && (
                    <Line
                      type="linear"
                      dataKey="officialUsd"
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

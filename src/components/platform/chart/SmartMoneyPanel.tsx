'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts';
import { X, Layers } from '@/components/ui/icon-library';
import type { ChartData } from './types';
import { cssTokenColor, parseChartTime } from './utils';
import {
  computeSmartMoneyFlow,
  type SmartMoneyPoint,
} from '@/indicators/smart-money';
import { useTranslation } from '@/lib/i18n';

interface SmartMoneyPanelProps {
  data: ChartData[];
  mainChart: IChartApi | null;
  onClose: () => void;
  optionsState?: Record<string, boolean>;
  activeTime?: string | null;
}

export default function SmartMoneyPanel({
  data,
  mainChart,
  onClose,
  optionsState,
  activeTime,
}: SmartMoneyPanelProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const atsSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const baselineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const tradesSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Compute Smart Money microstructure points
  const smartMoneyResult = useMemo(() => {
    return computeSmartMoneyFlow(data, {
      showMarkers: optionsState?.['showMarkers'] ?? false,
    });
  }, [data, optionsState]);

  const latestPoint =
    smartMoneyResult.points[smartMoneyResult.points.length - 1] ?? null;
  const [activePoint, setActivePoint] = useState<SmartMoneyPoint | null>(null);

  // Synchronize with external activeTime (e.g. from mobile tap or scrub)
  useEffect(() => {
    if (activeTime) {
      const found = smartMoneyResult.points.find(
        (p) => String(p.time) === activeTime
      );
      if (found) {
        setActivePoint(found);
      }
    } else {
      setActivePoint(null);
    }
  }, [activeTime, smartMoneyResult]);

  const displayPoint = activePoint ?? latestPoint;

  // Initialize Sub-Panel Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: {
          type: ColorType.Solid,
          color: cssTokenColor('--plt-bg-base', 'rgb(0, 0, 0)'),
        },
        textColor: cssTokenColor(
          '--plt-text-muted',
          'rgba(255, 255, 255, 0.45)'
        ),
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: {
          color: cssTokenColor(
            '--border-subtle',
            'rgba(255, 255, 255, 0.05)'
          ),
        },
        horzLines: {
          color: cssTokenColor(
            '--border-subtle',
            'rgba(255, 255, 255, 0.05)'
          ),
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: cssTokenColor(
          '--border-subtle',
          'rgba(255, 255, 255, 0.06)'
        ),
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.02,
        },
      },
      leftPriceScale: {
        visible: false,
        scaleMargins: {
          top: 0.25,
          bottom: 0.02,
        },
      },
      timeScale: {
        borderColor: cssTokenColor(
          '--border-subtle',
          'rgba(255, 255, 255, 0.06)'
        ),
        timeVisible: true,
        secondsVisible: false,
        visible: false, // Seamless alignment with main chart
      },
    });

    chartRef.current = chart;

    // 1. Histogram Series for Average Trade Size (ATS)
    const atsSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          if (price >= 1e6) return `${(price / 1e6).toFixed(2)}M`;
          if (price >= 1e3) return `${(price / 1e3).toFixed(0)}k`;
          return price.toFixed(0);
        },
      },
      priceScaleId: 'right',
    });
    atsSeriesRef.current = atsSeries;

    // 2. Continuous 20-day ATS Baseline (Dashed hairline)
    const baselineSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255, 255, 255, 0.35)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      priceFormat: {
        type: 'custom',
        formatter: (p: number) => `${(p / 1e3).toFixed(0)}k avg`,
      },
    });
    baselineSeriesRef.current = baselineSeries;

    // 3. Trade Count Frequency Line (Rendered on independent left scale)
    const tradesSeries = chart.addSeries(LineSeries, {
      color: '#38bdf8', // Cyan / Sky blue
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceScaleId: 'left',
      priceFormat: {
        type: 'custom',
        formatter: (p: number) => `${Math.round(p)} tx`,
      },
    });
    tradesSeriesRef.current = tradesSeries;

    // Crosshair Hover Sync
    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (!param.time || !param.point) {
        setActivePoint(null);
        return;
      }
      const timeStr =
        typeof param.time === 'string' ? param.time : String(param.time);
      const found = smartMoneyResult.points.find(
        (p) => String(p.time) === timeStr
      );
      if (found) {
        setActivePoint(found);
      }
    });

    // Resize Observer
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (
            chartRef.current &&
            entry.contentRect.width > 0 &&
            entry.contentRect.height > 0
          ) {
            chartRef.current.applyOptions({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
      chartRef.current = null;
      atsSeriesRef.current = null;
      baselineSeriesRef.current = null;
      tradesSeriesRef.current = null;
    };
  }, []);

  // Update Data Series
  useEffect(() => {
    if (
      !atsSeriesRef.current ||
      !baselineSeriesRef.current ||
      !tradesSeriesRef.current ||
      !chartRef.current ||
      smartMoneyResult.points.length === 0
    ) {
      return;
    }

    const atsSeries = atsSeriesRef.current;
    const baselineSeries = baselineSeriesRef.current;
    const tradesSeries = tradesSeriesRef.current;

    const formattedHistogram = smartMoneyResult.points
      .filter((pt) => pt.hasRealTrades && pt.ats > 0)
      .map((pt) => ({
        time: parseChartTime(pt.time),
        value: pt.ats,
        color: pt.color,
      }));

    const formattedBaseline = smartMoneyResult.points
      .filter((pt) => pt.hasRealTrades && pt.atsMa20 > 0)
      .map((pt) => ({
        time: parseChartTime(pt.time),
        value: pt.atsMa20,
      }));

    const formattedTrades = smartMoneyResult.points
      .filter((pt) => pt.hasRealTrades && pt.tradesCount > 0)
      .map((pt) => ({
        time: parseChartTime(pt.time),
        value: pt.tradesCount,
      }));

    atsSeries.setData(formattedHistogram);
    baselineSeries.setData(formattedBaseline);
    tradesSeries.setData(formattedTrades);

    // Initial sync with main chart
    if (mainChart && chartRef.current) {
      const logicalRange = mainChart.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        chartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
      }
    }
  }, [smartMoneyResult, mainChart]);

  // Synchronize Time Scales (Bidirectional sync with Main Chart)
  useEffect(() => {
    if (!mainChart || !chartRef.current) return;

    const subTimeScale = chartRef.current.timeScale();
    const mainTimeScale = mainChart.timeScale();

    const handleMainRangeChange = (range: any) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        subTimeScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncingRef.current = false;
    };

    const handleSubRangeChange = (range: any) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        mainTimeScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncingRef.current = false;
    };

    mainTimeScale.subscribeVisibleLogicalRangeChange(handleMainRangeChange);
    subTimeScale.subscribeVisibleLogicalRangeChange(handleSubRangeChange);

    return () => {
      try {
        mainTimeScale.unsubscribeVisibleLogicalRangeChange(
          handleMainRangeChange
        );
        subTimeScale.unsubscribeVisibleLogicalRangeChange(handleSubRangeChange);
      } catch {}
    };
  }, [mainChart]);

  // Format numbers for display
  const hasRealTrades = displayPoint?.hasRealTrades ?? false;
  const atsDisplay = displayPoint && hasRealTrades ? displayPoint.ats : 0;
  const atsMa20Display = displayPoint && hasRealTrades ? displayPoint.atsMa20 : 0;
  const tradesDisplay = displayPoint && hasRealTrades ? displayPoint.tradesCount : 0;
  const absorptionDisplay = displayPoint
    ? Math.round(displayPoint.absorptionRatio * 100) / 100
    : 1;

  const atsRatio =
    atsMa20Display > 0 ? (atsDisplay / atsMa20Display - 1) * 100 : 0;

  const stateColor =
    displayPoint?.state === 'ACCUMULATION_HEAVY'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : displayPoint?.state === 'ACCUMULATION_MODERATE'
      ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
      : displayPoint?.state === 'DISTRIBUTION_HEAVY'
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : displayPoint?.state === 'DISTRIBUTION_MODERATE'
      ? 'text-rose-300 bg-rose-500/10 border-rose-500/20'
      : 'text-white/60 bg-white/[0.04] border-white/10';

  const getStateLabel = (state?: SmartMoneyPoint['state'], defaultLabel?: string) => {
    if (!state) return defaultLabel ?? '';
    if (isAr) {
      switch (state) {
        case 'ACCUMULATION_HEAVY':
          return 'تجميع مؤسسي';
        case 'ACCUMULATION_MODERATE':
          return 'شراء امتصاصي';
        case 'DISTRIBUTION_HEAVY':
          return 'تصريف مؤسسي';
        case 'DISTRIBUTION_MODERATE':
          return 'دوران تصريفي';
        case 'NEUTRAL':
        default:
          return 'نشاط تجزئة عادي';
      }
    }
    return defaultLabel ?? '';
  };

  return (
    <div className="w-full flex flex-col bg-black border-t border-white/[0.06] select-none font-sans">
      {/* Sub-Panel Header */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-white/[0.05] bg-white/[0.01]">
        {/* Left: Indicator Title & Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-white/90 shrink-0">
            <Layers size={13} className="text-white/70" />
            <span className="tracking-wide">
              {isAr ? 'تدفق الأموال الذكية' : 'SMART MONEY FLOW'}
            </span>
          </div>

          {/* ATS Metric */}
          <div className="hidden sm:flex items-center gap-1 tabular-nums">
            <span className="text-white/40 text-[10px]">
              {isAr ? 'متوسط الصفقة:' : 'ATS:'}
            </span>
            {hasRealTrades && atsDisplay > 0 ? (
              <>
                <span className="font-semibold text-white">
                  {atsDisplay >= 1e6
                    ? `${(atsDisplay / 1e6).toFixed(2)}M`
                    : `${Math.round(atsDisplay / 1e3)}k`}{' '}
                  <span className="text-[9px] text-white/40 font-normal">
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </span>
                {atsMa20Display > 0 && (
                  <span
                    className={`text-[9px] font-medium ms-0.5 ${
                      atsRatio > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {atsRatio > 0 ? '+' : ''}
                    {Math.round(atsRatio)}%
                  </span>
                )}
              </>
            ) : (
              <span className="text-white/40 text-[11px] font-normal">—</span>
            )}
          </div>

          {/* Trade Count Metric */}
          <div className="hidden md:flex items-center gap-1 tabular-nums">
            <span className="text-white/40 text-[10px]">
              {isAr ? 'الصفقات:' : 'Trades:'}
            </span>
            {hasRealTrades && tradesDisplay > 0 ? (
              <span className="font-semibold text-sky-400">
                {tradesDisplay.toLocaleString()}{' '}
                <span className="text-[9px] text-white/40 font-normal">
                  {isAr ? 'صفقة' : 'tx'}
                </span>
              </span>
            ) : (
              <span className="text-white/40 text-[11px] font-normal">—</span>
            )}
          </div>

          {/* Wyckoff Absorption Badge */}
          {displayPoint && (
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border tabular-nums shrink-0 ${stateColor}`}
            >
              {getStateLabel(displayPoint.state, displayPoint.stateLabel)} ({absorptionDisplay}x)
            </div>
          )}
        </div>

        {/* Right: Legend & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-[9px] text-white/40 tabular-nums">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
              {isAr ? 'تجميع' : 'Accumulation'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />
              {isAr ? 'تصريف' : 'Distribution'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
              {isAr ? 'الصفقات' : 'Trades'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-b border-dashed border-white/60 inline-block" />
              {isAr ? 'متوسط 20 يوم' : '20d Avg'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={isAr ? 'إغلاق تدفق الأموال الذكية' : 'Close Smart Money Flow'}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[130px] sm:h-[145px] relative"
      >
        {!smartMoneyResult.hasAnyRealTrades && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 z-10">
            <div className="text-[11px] text-white/50 font-medium">
              {isAr ? 'إحصاءات التداول الفورية الموثقة' : 'Verified Real-Time Trade Statistics'}
            </div>
            <div className="text-[10px] text-white/30 max-w-sm mt-0.5">
              {isAr
                ? 'يتم استبعاد عدد الصفقات التاريخية بواسطة المزودين الخارجيين. يتم رسم خطوط متوسط حجم الصفقة وعدد الصفقات تلقائياً للجلسات المباشرة المتزامنة.'
                : 'Historical trade counts omitted by external feeds. ATS and trade count lines plot automatically for live synced market sessions.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

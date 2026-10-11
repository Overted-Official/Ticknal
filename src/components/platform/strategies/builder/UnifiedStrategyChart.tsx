'use client';

import { useCallback, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

import type {
  StrategyVisualizationMarker,
  StrategyVisualizationPane,
  StrategyVisualizationPoint,
} from './strategy-visualization-model';
import StrategyTradingViewChart from './StrategyTradingViewChart';
import UnifiedIndicatorPane from './UnifiedIndicatorPane';

export interface UnifiedStrategyChartProps {
  readonly ticker: string;
  readonly points: readonly StrategyVisualizationPoint[];
  readonly markers: readonly StrategyVisualizationMarker[];
  readonly panes: readonly StrategyVisualizationPane[];
  readonly chartType: 'area' | 'candlestick';
  readonly focusedBlockId: string | null;
  readonly locale: 'en' | 'ar';
  readonly onFocusBlock?: (blockId: string) => void;
}

export default function UnifiedStrategyChart({
  ticker,
  points,
  markers,
  panes,
  chartType,
  focusedBlockId,
  locale,
  onFocusBlock,
}: UnifiedStrategyChartProps) {
  const isAr = locale === 'ar';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mainChart, setMainChart] = useState<IChartApi | null>(null);

  // References for crosshair synchronization
  const mainChartRef = useRef<{
    chart: IChartApi;
    series: ISeriesApi<any>;
  } | null>(null);

  const indicatorPanesRef = useRef<
    Map<string, { chart: IChartApi; series: ISeriesApi<any> }>
  >(new Map());

  const isSyncingCrosshair = useRef(false);

  // Crosshair coordinator across main candlestick chart and all indicator panes
  const handleCrosshairMove = useCallback(
    (sourceId: 'main' | string, time: string | null, index: number | null) => {
      if (isSyncingCrosshair.current) return;
      isSyncingCrosshair.current = true;

      try {
        if (!time || index === null || index < 0 || index >= points.length) {
          setHoveredIndex(null);
          // Clear crosshair on all charts
          mainChartRef.current?.chart.clearCrosshairPosition();
          for (const entry of indicatorPanesRef.current.values()) {
            entry.chart.clearCrosshairPosition();
          }
        } else {
          setHoveredIndex(index);
          const currentPoint = points[index];

          // If hover was on an indicator, sync crosshair to main candlestick chart
          if (sourceId !== 'main' && mainChartRef.current && currentPoint) {
            try {
              mainChartRef.current.chart.setCrosshairPosition(
                currentPoint.close,
                time as unknown as Time,
                mainChartRef.current.series
              );
            } catch {}
          }

          // Sync crosshair to all other indicator panes
          for (const [paneId, entry] of indicatorPanesRef.current.entries()) {
            if (sourceId !== paneId && entry) {
              const targetPane = panes.find((p) => p.id === paneId);
              const val = targetPane?.values[index]?.value ?? 0;
              try {
                entry.chart.setCrosshairPosition(
                  val,
                  time as unknown as Time,
                  entry.series
                );
              } catch {}
            }
          }
        }
      } finally {
        isSyncingCrosshair.current = false;
      }
    },
    [points, panes]
  );

  const handleMainChartReady = useCallback(
    (chart: IChartApi | null, series: ISeriesApi<any> | null) => {
      setMainChart(chart);
      if (chart && series) {
        mainChartRef.current = { chart, series };
      } else {
        mainChartRef.current = null;
      }
    },
    []
  );

  const handleIndicatorPaneReady = useCallback(
    (
      paneId: string,
      chart: IChartApi | null,
      series: ISeriesApi<any> | null
    ) => {
      if (chart && series) {
        indicatorPanesRef.current.set(paneId, { chart, series });
      } else {
        indicatorPanesRef.current.delete(paneId);
      }
    },
    []
  );

  if (points.length === 0) return null;

  const n = points.length;
  const activeIndex = hoveredIndex ?? n - 1;
  const activePoint = points[activeIndex] ?? points[n - 1];
  const activeMarker = markers.find((m) => m.date === activePoint.date);
  const openVal = activePoint.open ?? activePoint.close;
  const highVal = activePoint.high ?? activePoint.close;
  const lowVal = activePoint.low ?? activePoint.close;
  const closeVal = activePoint.close;
  const priceChange = closeVal - openVal;
  const priceChangePct = (priceChange / (openVal || 1)) * 100;

  return (
    <div
      role="region"
      aria-label={isAr ? 'لوحة الرسم البياني الموحدة' : 'Unified strategy chart'}
      className="mt-2 select-none overflow-hidden bg-black"
      onMouseLeave={() => handleCrosshairMove('outer', null, null)}
    >
      {/* 1. TOP SECTION: PRICE CHART & SIGNALS */}
      <div className="p-2 sm:p-3" role="img" aria-label={`${ticker} price chart`}>
        {/* Synchronized Price HUD Header */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-sans text-xs font-bold text-white">{ticker}</span>
            <span className="font-sans text-[11px] tabular-nums text-white/60">{activePoint.date}</span>
            <div className="flex items-center gap-2 font-sans text-[10px] tabular-nums sm:text-[11px]">
              <span className="text-white/40">O: <strong className="font-medium text-white/90">{openVal.toFixed(2)}</strong></span>
              <span className="text-white/40">H: <strong className="font-medium text-white/90">{highVal.toFixed(2)}</strong></span>
              <span className="text-white/40">L: <strong className="font-medium text-white/90">{lowVal.toFixed(2)}</strong></span>
              <span className="text-white/40">C: <strong className={`font-semibold ${priceChange >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>{closeVal.toFixed(2)}</strong></span>
              <span className={`font-semibold ${priceChange >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChange >= 0 ? '+' : ''}{priceChangePct.toFixed(1)}%)
              </span>
            </div>

            {/* Active Buy/Sell Marker callout on hovered bar */}
            {activeMarker && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider ${
                activeMarker.side === 'buy'
                  ? 'border border-plt-profit/40 bg-plt-profit/15 text-plt-profit shadow-xs'
                  : 'border border-plt-risk/40 bg-plt-risk/15 text-plt-risk shadow-xs'
              }`}>
                {activeMarker.side === 'buy' ? '▲ BUY' : '▼ SELL'} @ {activeMarker.price.toFixed(2)} EGP
                <span className="hidden opacity-75 sm:inline">({activeMarker.label})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-sans text-[9px] text-plt-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-plt-profit" />
              {isAr ? 'إشارة شراء' : 'Buy signal'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-plt-risk" />
              {isAr ? 'إشارة بيع' : 'Sell signal'}
            </span>
            <span className="tabular-nums font-sans text-white/40">{n} {isAr ? 'فترة' : 'bars'}</span>
          </div>
        </div>

        {/* Main Price TradingView Candlestick / Area Chart (Shortened height) */}
        <div className="relative h-48 w-full sm:h-56 md:h-60">
          <StrategyTradingViewChart
            points={points}
            markers={markers}
            chartType={chartType}
            locale={locale}
            showTimeScale={panes.length === 0}
            onCrosshairMove={(time, idx) => handleCrosshairMove('main', time, idx)}
            onChartReady={handleMainChartReady}
          />
        </div>

        {/* Accessible markers list for screen readers and test assertions */}
        <div className="sr-only" aria-live="polite">
          {markers.map((marker) => (
            <div key={`${marker.date}-${marker.side}`}>
              {marker.side === 'buy' ? (isAr ? 'شراء' : 'BUY') : (isAr ? 'بيع' : 'SELL')} - {marker.label} ({marker.price} EGP) on {marker.date}
            </div>
          ))}
        </div>
      </div>

      {/* 2. MIDDLE & BOTTOM SECTION: STACKED FULL-WIDTH INDICATOR PANES */}
      {panes.length > 0 && (
        <div>
          {panes.map((pane, index) => {
            const isLastPane = index === panes.length - 1;
            return (
              <UnifiedIndicatorPane
                key={pane.id}
                pane={pane}
                activeIndex={activeIndex}
                isHovering={hoveredIndex !== null}
                isFocused={focusedBlockId === pane.id}
                isAr={isAr}
                showTimeScale={isLastPane}
                onFocusBlock={onFocusBlock}
                mainChart={mainChart}
                onCrosshairMove={(time, idx) => handleCrosshairMove(pane.id, time, idx)}
                onPaneReady={handleIndicatorPaneReady}
              />
            );
          })}
        </div>
      )}

      {panes.length === 0 && (
        <div className="border-t border-white/[0.08] p-6 text-center font-sans text-xs text-plt-muted">
          {isAr ? 'لم تتم إضافة مؤشرات أو حسابات ثانوية بعد.' : 'No calculation or indicator panes configured for this strategy.'}
        </div>
      )}
    </div>
  );
}

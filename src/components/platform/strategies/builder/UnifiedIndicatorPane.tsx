'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';

import { resolveChartColor } from '@/components/platform/chart/utils';
import type { StrategyVisualizationPane } from './strategy-visualization-model';

export interface UnifiedIndicatorPaneProps {
  readonly pane: StrategyVisualizationPane;
  readonly activeIndex: number;
  readonly isHovering: boolean;
  readonly isFocused: boolean;
  readonly isAr: boolean;
  readonly showTimeScale?: boolean;
  readonly onFocusBlock?: (blockId: string) => void;
  readonly mainChart?: IChartApi | null;
  readonly onCrosshairMove?: (time: string | null, index: number | null) => void;
  readonly onPaneReady?: (
    paneId: string,
    chart: IChartApi | null,
    series: ISeriesApi<any> | null
  ) => void;
}

export default function UnifiedIndicatorPane({
  pane,
  activeIndex,
  isHovering,
  isFocused,
  isAr,
  showTimeScale = false,
  onFocusBlock,
  mainChart,
  onCrosshairMove,
  onPaneReady,
}: UnifiedIndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | null>(null);

  const paneValuesRef = useRef(pane.values);
  paneValuesRef.current = pane.values;

  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const vals = pane.values.map((v) => v.value);
  const currentVal = pane.values[activeIndex]?.value ?? vals[vals.length - 1] ?? 0;

  // 1. Chart Instance Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 96,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: 'rgba(255, 255, 255, 0.45)',
        fontSize: 10,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1a1a',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1a1a',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
        minimumWidth: 60,
      },
      timeScale: {
        visible: showTimeScale,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    // Crosshair movement subscription
    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (!param.time) {
        onCrosshairMoveRef.current?.(null, null);
        return;
      }
      const timeStr = typeof param.time === 'string' ? param.time : String(param.time);
      const currentValues = paneValuesRef.current;
      const index = currentValues.findIndex((v) => v.date === timeStr);
      onCrosshairMoveRef.current?.(timeStr, index >= 0 ? index : null);
    });

    // Resize Observer
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (chartRef.current && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
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
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
      onPaneReady?.(pane.id, null, null);
    };
  }, [onPaneReady, pane.id, showTimeScale]);

  // Dynamically update timeScale visibility when showTimeScale changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        visible: showTimeScale,
      },
    });
  }, [showTimeScale]);

  // 2. Series Data Synchronization
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || pane.values.length === 0) return;

    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current);
      } catch {}
      seriesRef.current = null;
    }

    const resolvedColor = resolveChartColor(pane.color) || '#2962ff';

    let series: ISeriesApi<'Line'> | ISeriesApi<'Histogram'>;

    if (pane.presentation === 'bar') {
      series = chart.addSeries(HistogramSeries, {
        color: resolvedColor,
      });
    } else {
      series = chart.addSeries(LineSeries, {
        color: resolvedColor,
        lineWidth: 2,
      });
    }

    series.setData(
      pane.values.map((v) => ({
        time: v.date as unknown as Time,
        value: v.value,
      }))
    );

    seriesRef.current = series;
    onPaneReady?.(pane.id, chart, series);

    // Synchronize initial visible range with main chart if available
    if (mainChart) {
      const initialRange = mainChart.timeScale().getVisibleLogicalRange();
      if (initialRange) {
        try {
          chart.timeScale().setVisibleLogicalRange(initialRange);
        } catch {}
      }
    }
  }, [pane.values, pane.presentation, pane.color, mainChart, onPaneReady, pane.id]);

  // 3. Bidirectional Time Scale Synchronization (Zoom & Pan in unison)
  useEffect(() => {
    if (!mainChart || !chartRef.current) return;

    const mainScale = mainChart.timeScale();
    const paneScale = chartRef.current.timeScale();
    let isSyncing = false;

    const handleMainRangeChange = (range: any) => {
      if (isSyncing || !range) return;
      isSyncing = true;
      try {
        paneScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncing = false;
    };

    const handlePaneRangeChange = (range: any) => {
      if (isSyncing || !range) return;
      isSyncing = true;
      try {
        mainScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncing = false;
    };

    mainScale.subscribeVisibleLogicalRangeChange(handleMainRangeChange);
    paneScale.subscribeVisibleLogicalRangeChange(handlePaneRangeChange);

    // Initial sync
    const initialRange = mainScale.getVisibleLogicalRange();
    if (initialRange) {
      try {
        paneScale.setVisibleLogicalRange(initialRange);
      } catch {}
    }

    return () => {
      mainScale.unsubscribeVisibleLogicalRangeChange(handleMainRangeChange);
      paneScale.unsubscribeVisibleLogicalRangeChange(handlePaneRangeChange);
    };
  }, [mainChart]);

  return (
    <div className="border-t border-white/[0.08] p-3 last:border-b-0 sm:px-4 sm:py-2.5">
      {/* Pane HUD Header */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: pane.color }} />
          <span className="font-sans text-xs font-semibold text-white">{pane.name}</span>
          <span className="font-sans text-[10px] text-plt-muted">({pane.presentation})</span>
          {isFocused && (
            <span className="rounded-full border border-white/20 bg-plt-active px-1.5 py-0.2 font-sans text-[8px] uppercase tracking-wider text-white">
              {isAr ? 'محدد' : 'Focused'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-sans text-[11px] font-bold tabular-nums" style={{ color: pane.color }}>
            {currentVal.toFixed(2)}
          </span>
          {onFocusBlock && (
            <button
              type="button"
              onClick={() => onFocusBlock(pane.id)}
              className="rounded-md border border-white/10 px-1.5 py-0.5 font-sans text-[9px] text-plt-muted transition-colors hover:border-white/20 hover:text-white"
            >
              {isAr ? 'الكتلة' : 'Block'}
            </button>
          )}
        </div>
      </div>

      {/* Synchronized TradingView Indicator Pane */}
      <div className={`relative w-full ${showTimeScale ? 'h-28 sm:h-32' : 'h-20 sm:h-24'}`}>
        <div
          ref={containerRef}
          data-testid={`tradingview-pane-${pane.id}`}
          className="h-full w-full bg-black select-none"
        />
        <div className="sr-only" aria-live="polite">
          {pane.name} ({pane.presentation}): {currentVal.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

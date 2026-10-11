'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  AreaSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';

import type {
  StrategyVisualizationMarker,
  StrategyVisualizationPoint,
} from './strategy-visualization-model';

export interface StrategyTradingViewChartProps {
  readonly points: readonly StrategyVisualizationPoint[];
  readonly markers: readonly StrategyVisualizationMarker[];
  readonly chartType: 'candlestick' | 'area';
  readonly locale: 'en' | 'ar';
  readonly showTimeScale?: boolean;
  readonly onCrosshairMove?: (time: string | null, index: number | null) => void;
  readonly onChartReady?: (
    chart: IChartApi | null,
    series: ISeriesApi<any> | null
  ) => void;
}

export default function StrategyTradingViewChart({
  points,
  markers,
  chartType,
  locale,
  showTimeScale = true,
  onCrosshairMove,
  onChartReady,
}: StrategyTradingViewChartProps) {
  const isAr = locale === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  // Keep a stable ref to points and onCrosshairMove for crosshair callback
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  // 1. Chart Instance Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 340,
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
          top: 0.08,
          bottom: 0.08,
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
      const currentPoints = pointsRef.current;
      const index = currentPoints.findIndex((p) => p.date === timeStr);
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
        markerApiRef.current = null;
      }
      onChartReady?.(null, null);
    };
  }, [onChartReady, showTimeScale]);

  // Dynamically update timeScale visibility when showTimeScale changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        visible: showTimeScale,
      },
    });
  }, [showTimeScale]);

  // 2. Series & Markers Data Synchronization
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || points.length === 0) return;

    // Remove existing series to recreate matching the requested chart type
    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current);
      } catch {}
      seriesRef.current = null;
      markerApiRef.current = null;
    }

    let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'>;

    if (chartType === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        borderUpColor: '#089981',
        borderDownColor: '#f23645',
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
      });

      const candleData = points.map((p) => ({
        time: p.date as unknown as Time,
        open: p.open ?? p.close,
        high: p.high ?? p.close,
        low: p.low ?? p.close,
        close: p.close,
      }));
      series.setData(candleData);
    } else {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#2962ff',
        topColor: 'rgba(41, 98, 255, 0.28)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineWidth: 2,
      });

      const areaData = points.map((p) => ({
        time: p.date as unknown as Time,
        value: p.close,
      }));
      series.setData(areaData);
    }

    seriesRef.current = series;
    onChartReady?.(chart, series);

    // Format & attach Buy / Sell strategy markers
    const sortedMarkers: SeriesMarker<Time>[] = markers
      .map((m) => {
        const isBuy = m.side === 'buy';
        return {
          time: m.date as unknown as Time,
          position: isBuy ? ('belowBar' as const) : ('aboveBar' as const),
          color: isBuy ? '#089981' : '#f23645',
          shape: isBuy ? ('arrowUp' as const) : ('arrowDown' as const),
          text: isBuy ? (isAr ? 'شراء' : 'BUY') : (isAr ? 'بيع' : 'SELL'),
          size: 1.25,
        };
      })
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));

    // Deduplicate markers with identical timestamp
    const uniqueMarkers = new Map<string, SeriesMarker<Time>>();
    for (const m of sortedMarkers) {
      uniqueMarkers.set(String(m.time), m);
    }
    const finalMarkers = Array.from(uniqueMarkers.values());

    if (finalMarkers.length > 0) {
      try {
        markerApiRef.current = createSeriesMarkers(series, finalMarkers);
      } catch (err) {
        console.warn('Failed to attach series markers:', err);
      }
    }

    // Auto-fit content to container viewport
    try {
      chart.timeScale().fitContent();
    } catch {}
  }, [points, markers, chartType, isAr]);

  return (
    <div
      ref={containerRef}
      data-testid="tradingview-candlestick-chart"
      className="h-full w-full bg-black select-none"
    />
  );
}

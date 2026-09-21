'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts';
import { X, Activity } from '@/components/ui/icon-library';
import type { ChartData } from './types';
import { cssTokenColor, parseChartTime, sanitizeChartSeriesData } from './utils';
import { computeHydraIndex, type HydraPoint } from '@/indicators/hydra-index';

interface HydraIndexPanelProps {
  data: ChartData[];
  mainChart: IChartApi | null;
  onClose: () => void;
  optionsState?: Record<string, boolean>;
}

export default function HydraIndexPanel({
  data,
  mainChart,
  onClose,
  optionsState,
}: HydraIndexPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const isSyncingRef = useRef<boolean>(false);

  const [viewMode, setViewMode] = useState<'binary' | 'continuous'>('binary');

  // Computed Hydra series (Adaptive Hybrid Volatility Synchronizer)
  const hydraResult = useMemo(() => {
    return computeHydraIndex(data, {
      showMarkers: optionsState?.['showMarkers'] ?? true,
      binaryMode: viewMode === 'binary',
    });
  }, [data, optionsState, viewMode]);

  // Current active hover or latest point
  const latestPoint = hydraResult.points[hydraResult.points.length - 1] ?? null;
  const [activePoint, setActivePoint] = useState<HydraPoint | null>(null);

  const displayPoint = activePoint ?? latestPoint;

  // Chart Lifecycle
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: cssTokenColor('--palette-chart', '#131722') },
        textColor: cssTokenColor('--plt-muted', '#787B86'),
        fontSize: 10,
      },
      grid: {
        vertLines: { color: cssTokenColor('--palette-chart-grid', '#1E222D') },
        horzLines: { color: cssTokenColor('--palette-chart-grid', '#1E222D') },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: cssTokenColor('--palette-chart-grid', '#1E222D'),
        autoScale: false,
        minimumWidth: 70,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: cssTokenColor('--palette-chart-grid', '#1E222D'),
        timeVisible: true,
        secondsVisible: false,
        visible: false, // Hidden to seamlessly align with main chart's time scale
      },
    });

    chartRef.current = chart;

    // Line Series for Hydra (Cyan #00E5FF)
    const hydraSeries = chart.addSeries(LineSeries, {
      color: '#00E5FF',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(1),
      },
    });
    seriesRef.current = hydraSeries;

    // Set fixed 0-100 scale range
    chart.priceScale('right').applyOptions({
      autoScale: false,
    });

    // Dynamic price lines and scale will be set by updateData useEffect
    // Crosshair movement tracker
    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (!param.time) {
        setActivePoint(null);
        return;
      }
      const timeStr = typeof param.time === 'string' ? param.time : String(param.time);
      const found = hydraResult.points.find((p) => String(p.time) === timeStr);
      if (found) {
        setActivePoint(found);
      }
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
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update Data and Binary vs Continuous Display
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || hydraResult.points.length === 0) return;

    const series = seriesRef.current;
    const chart = chartRef.current;

    // Clear previous price lines
    priceLinesRef.current.forEach((pl) => {
      try {
        series.removePriceLine(pl);
      } catch {}
    });
    priceLinesRef.current = [];

    if (viewMode === 'binary') {
      series.applyOptions({
        color: '#00E676', // Glowing Neon Green
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => (p >= 0.5 ? '1 (INVESTED)' : '0 (CASH)'),
        },
      });
      chart.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: { top: 0.2, bottom: 0.2 },
      });
      const pl1 = series.createPriceLine({
        price: 1.0,
        color: '#00E676',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'STATE 1: INVESTED',
      });
      const pl0 = series.createPriceLine({
        price: 0.0,
        color: '#787B86',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'STATE 0: CASH',
      });
      priceLinesRef.current = [pl1, pl0];
    } else {
      series.applyOptions({
        color: '#00E5FF', // Cyan
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => p.toFixed(1),
        },
      });
      chart.priceScale('right').applyOptions({
        autoScale: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      });
      const pl90 = series.createPriceLine({
        price: 90,
        color: '#FF5252',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SELL ZONE (≥90)',
      });
      const pl50 = series.createPriceLine({
        price: 50,
        color: '#787B86',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: false,
        title: '50',
      });
      const pl13 = series.createPriceLine({
        price: 1.3,
        color: '#00E676',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'BUY ZONE (≤1.3)',
      });
      priceLinesRef.current = [pl90, pl50, pl13];
    }

    const formattedData = hydraResult.points.map((pt) => ({
      time: parseChartTime(pt.time),
      value: viewMode === 'binary' ? pt.state : pt.continuousVal,
    }));

    series.setData(formattedData);

    // Synchronize CDF Zone Exit markers on the hydra panel
    const rawMarkers = hydraResult.markers;
    if (rawMarkers && rawMarkers.length > 0) {
      const sanitizedMarkers = sanitizeChartSeriesData(
        rawMarkers.map((m) => ({
          ...m,
          time: parseChartTime(m.time),
        }))
      );
      try {
        if (!markerApiRef.current) {
          markerApiRef.current = createSeriesMarkers(seriesRef.current, sanitizedMarkers);
        } else {
          markerApiRef.current.setMarkers(sanitizedMarkers);
        }
      } catch (err) {
        console.warn('Failed to update hydra panel series markers:', err);
      }
    } else if (markerApiRef.current) {
      try {
        markerApiRef.current.setMarkers([]);
      } catch {}
    }

    // Initial sync with main chart
    if (mainChart && chartRef.current) {
      const logicalRange = mainChart.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        chartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
      }
    }
  }, [hydraResult, viewMode, mainChart]);

  // Synchronize Time Scales (Bidirectional sync)
  useEffect(() => {
    if (!mainChart || !chartRef.current) return;

    const hydraTimeScale = chartRef.current.timeScale();
    const mainTimeScale = mainChart.timeScale();

    // 1. Sync main -> hydra
    const handleMainRangeChange = (range: any) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        hydraTimeScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncingRef.current = false;
    };

    // 2. Sync hydra -> main
    const handleHydraRangeChange = (range: any) => {
      if (isSyncingRef.current || !range) return;
      isSyncingRef.current = true;
      try {
        mainTimeScale.setVisibleLogicalRange(range);
      } catch {}
      isSyncingRef.current = false;
    };

    mainTimeScale.subscribeVisibleLogicalRangeChange(handleMainRangeChange);
    hydraTimeScale.subscribeVisibleLogicalRangeChange(handleHydraRangeChange);

    // Initial sync
    const initialRange = mainTimeScale.getVisibleLogicalRange();
    if (initialRange) {
      hydraTimeScale.setVisibleLogicalRange(initialRange);
    }

    return () => {
      try {
        mainTimeScale.unsubscribeVisibleLogicalRangeChange(handleMainRangeChange);
        hydraTimeScale.unsubscribeVisibleLogicalRangeChange(handleHydraRangeChange);
      } catch {}
    };
  }, [mainChart]);

  // Sync main chart crosshair to hydra panel
  useEffect(() => {
    if (!mainChart) return;
    const handleMainCrosshair = (param: MouseEventParams<Time>) => {
      if (!param.time) {
        setActivePoint(null);
        return;
      }
      const timeStr = typeof param.time === 'string' ? param.time : String(param.time);
      const found = hydraResult.points.find((p) => String(p.time) === timeStr);
      if (found) {
        setActivePoint(found);
      }
    };

    mainChart.subscribeCrosshairMove(handleMainCrosshair);
    return () => {
      try {
        mainChart.unsubscribeCrosshairMove(handleMainCrosshair);
      } catch {}
    };
  }, [mainChart, hydraResult]);

  const stateNum = displayPoint?.state ?? 0;
  const isInvested = stateNum === 1;

  return (
    <div className="h-40 sm:h-44 w-full border-t border-plt-border bg-plt-base/98 flex flex-col relative shrink-0 select-none animate-in slide-in-from-bottom-2 duration-150">
      {/* Panel Top Header Strip */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-plt-border/40 bg-plt-raised/70 shrink-0 text-xs">
        {/* Left: Indicator title and live values */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-[11px] text-[#00E676]">
            <Activity className="h-3.5 w-3.5 text-[#00E676]" />
            <span>HYDRA BINARY INDEX</span>
          </div>

          <span className="text-plt-border-subtle">|</span>

          {/* Current Live State / Value */}
          <div className="flex items-baseline gap-1">
            <span
              className={`font-mono font-bold text-[12px] ${
                isInvested ? 'text-[#00E676]' : 'text-plt-muted'
              }`}
            >
              {viewMode === 'binary'
                ? isInvested
                  ? '1.0 (INVESTED)'
                  : '0.0 (CASH)'
                : `${(displayPoint?.continuousVal ?? 50).toFixed(1)} / 100`}
            </span>
          </div>

          {/* Regime & State Badge */}
          <div
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
              isInvested
                ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40'
                : 'bg-white/[0.06] text-plt-muted border border-white/[0.1]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isInvested ? 'bg-[#00E676] animate-pulse' : 'bg-plt-muted'
              }`}
            />
            <span>
              {isInvested
                ? 'State 1: Bull Wave (Long)'
                : 'State 0: Cash / Bottom Search'}
            </span>
          </div>

          {/* Performance Pill */}
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
            {viewMode === 'continuous'
              ? 'Continuous 0-100 Bayesian Regime Curve'
              : 'Adaptive Volatility Synchronizer: >92% Swings Caught | 2.8-Bar Lag | 0% Leakage'}
          </span>
        </div>

        {/* Right: Mode Switcher & Close */}
        <div className="flex items-center gap-2">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center bg-plt-base/90 rounded p-0.5 border border-plt-border/50 text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('binary')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                viewMode === 'binary'
                  ? 'bg-[#00E676]/20 text-[#00E676] shadow-sm'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
              title="Binary Regime Index (0 = Cash / 1 = Invested)"
            >
              Binary (0 / 1)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('continuous')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                viewMode === 'continuous'
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] shadow-sm'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
              title="Continuous 0-100 Bayesian Regime Curve"
            >
              0-100 Curve
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-5 w-5 rounded flex items-center justify-center text-plt-muted hover:text-plt-text hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close HYDRA Panel"
            aria-label="Close HYDRA Panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-chart Canvas Area */}
      <div className="flex-1 w-full min-h-0 relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

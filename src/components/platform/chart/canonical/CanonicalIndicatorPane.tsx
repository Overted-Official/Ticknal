'use client';

import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';

import { ChevronDown, ChevronUp, RotateCcw, X } from '@/components/ui/icon-library';
import type { CanonicalIndicatorViewState } from '@/indicators/canonical/types';
import { parseChartTime } from '../utils';
import { synchronizeChartSurface } from './chart-sync';
import type { CanonicalPaneModel } from './surface-model';

const COLOR_BY_ROLE = {
  primary: '#2962ff', secondary: '#7c4dff', positive: '#089981',
  negative: '#f23645', warning: '#ff9800', muted: '#a1a1aa',
} as const;

interface CanonicalIndicatorPaneProps {
  readonly pane: CanonicalPaneModel;
  readonly state?: CanonicalIndicatorViewState;
  readonly locale: 'en' | 'ar';
  readonly mainChart: IChartApi | null;
  readonly mainSeries: ISeriesApi<any> | null;
  readonly mainValueAtTime: (time: string) => number | null;
  readonly collapsed: boolean;
  readonly height: number;
  readonly onToggleCollapse: () => void;
  readonly onHeightChange: (height: number) => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onResetParameters: () => void;
  readonly onClose: () => void;
}

export default function CanonicalIndicatorPane({
  pane, state, locale, mainChart, mainSeries, mainValueAtTime, collapsed, height,
  onToggleCollapse, onHeightChange, onMoveUp, onMoveDown, onResetParameters, onClose,
}: CanonicalIndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed || !containerRef.current || state?.status !== 'ok') return;
    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: 'rgba(255,255,255,0.55)', fontSize: 10, attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.10)', minimumWidth: 55 },
      timeScale: { visible: false, borderColor: 'rgba(255,255,255,0.10)' },
    });

    let firstSeries: ISeriesApi<any> | null = null;
    const numericVisuals = pane.visuals.filter((visual) => visual.kind === 'number');
    for (const visual of numericVisuals) {
      const options = {
        color: COLOR_BY_ROLE[visual.colorRole],
        lineColor: COLOR_BY_ROLE[visual.colorRole],
        lineWidth: visual.lineWidth ?? 2,
        title: visual.outputLabel,
      };
      const definition = visual.renderer === 'histogram'
        ? HistogramSeries
        : visual.renderer === 'area'
          ? AreaSeries
          : LineSeries;
      const series = chart.addSeries(definition as any, options as any) as ISeriesApi<any>;
      series.setData(visual.points.flatMap((point) =>
        typeof point.value === 'number'
          ? [{ time: parseChartTime(point.time), value: point.value }]
          : [],
      ));
      for (const level of visual.referenceLevels) {
        series.createPriceLine({
          price: level.value,
          color: COLOR_BY_ROLE[level.colorRole ?? 'muted'],
          lineWidth: 1,
          lineStyle: level.lineStyle === 'solid' ? 0 : level.lineStyle === 'dotted' ? 1 : 2,
          axisLabelVisible: false,
          title: level.label?.[locale] ?? '',
        });
      }
      firstSeries ??= series;
    }

    let cleanupSync: (() => void) | undefined;
    if (mainChart && mainSeries && firstSeries) {
      const firstVisual = numericVisuals[0];
      cleanupSync = synchronizeChartSurface({
        mainChart: mainChart as never,
        mainSeries,
        childChart: chart as never,
        childSeries: firstSeries,
        mainValueAtTime,
        childValueAtTime: (time) => {
          const value = firstVisual.points.find((point) => String(point.time) === time)?.value;
          return typeof value === 'number' ? value : null;
        },
      });
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => {
      cleanupSync?.();
      observer.disconnect();
      chart.remove();
    };
  }, [collapsed, height, locale, mainChart, mainSeries, mainValueAtTime, pane, state?.status]);

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const move = (moveEvent: PointerEvent) => onHeightChange(
      Math.max(112, Math.min(360, startHeight + moveEvent.clientY - startY)),
    );
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  return (
    <section data-testid="canonical-indicator-pane" data-instance-id={pane.instanceId} className="relative flex w-full flex-col border-t border-white/10 bg-black font-sans" style={{ height: collapsed ? 32 : height }}>
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-white/[0.06] px-3 text-[11px]">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onToggleCollapse} className="text-white/60 hover:text-white" aria-label="Collapse indicator pane">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <span className="truncate font-semibold text-white">{pane.name[locale]}</span>
          {[...pane.visuals, ...pane.legends].map((visual) => (
            <span key={visual.id} className="tabular-nums text-white/55">
              {visual.outputLabel}: {visual.latestValue === null ? '—' : String(visual.latestValue)}
            </span>
          ))}
          {state?.status && state.status !== 'ok' && <span className="text-amber-400">{state.status}</span>}
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <button type="button" onClick={onMoveUp} className="p-1 hover:text-white" aria-label="Move pane up"><ChevronUp size={13} /></button>
          <button type="button" onClick={onMoveDown} className="p-1 hover:text-white" aria-label="Move pane down"><ChevronDown size={13} /></button>
          <button type="button" onClick={onResetParameters} className="p-1 hover:text-white" aria-label="Reset indicator parameters"><RotateCcw size={13} /></button>
          <button type="button" onClick={onClose} className="p-1 hover:text-white" aria-label="Remove indicator"><X size={13} /></button>
        </div>
      </header>
      {!collapsed && (
        <>
          {state?.status === 'ok' ? <div ref={containerRef} className="min-h-0 flex-1" /> : (
            <div className="flex flex-1 items-center justify-center text-xs text-white/45">
              {state?.message ?? (state?.status === 'unavailable' ? 'Required market data is unavailable.' : 'Loading indicator…')}
            </div>
          )}
          <div onPointerDown={beginResize} className="absolute inset-x-0 bottom-0 h-1 cursor-row-resize bg-transparent hover:bg-white/10" />
        </>
      )}
    </section>
  );
}

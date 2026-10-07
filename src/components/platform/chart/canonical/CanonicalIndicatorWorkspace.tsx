'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';

import { getIndicatorCatalogEntry } from '@/indicators/canonical/catalog';
import type {
  CanonicalChartVisual,
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import type { CanonicalIndicatorSelectionPatch, ChartData } from '../types';
import { parseChartTime } from '../utils';
import CanonicalIndicatorPaneHost from './CanonicalIndicatorPaneHost';
import CanonicalMarketDrawer from './CanonicalMarketDrawer';
import CanonicalMetricsDock from './CanonicalMetricsDock';
import {
  reconcileCanonicalOverlays,
  type CanonicalOverlayHandle,
  type CanonicalOverlayHost,
  type CanonicalOverlayPoint,
} from './overlay-controller';
import { partitionCanonicalSurfaces } from './surface-model';
import { useCanonicalIndicatorExecutions } from './useCanonicalIndicatorExecutions';
import { formatIndicatorDiagnostic } from './indicator-diagnostic-message';

const COLOR_BY_ROLE = {
  primary: '#2962ff', secondary: '#7c4dff', positive: '#089981',
  negative: '#f23645', warning: '#ff9800', muted: '#a1a1aa',
} as const;

interface LightweightOverlayHandle extends CanonicalOverlayHandle {
  readonly series: ISeriesApi<any>;
}

interface CanonicalIndicatorWorkspaceProps {
  readonly selections: readonly CanonicalIndicatorSelection[];
  readonly symbol: string;
  readonly timeframe: string;
  readonly locale: 'en' | 'ar';
  readonly data: readonly ChartData[];
  readonly mainChart: IChartApi | null;
  readonly mainSeries: ISeriesApi<any> | null;
  readonly seriesReadyKey: number;
  readonly onStatesChange: (states: Readonly<Record<string, CanonicalIndicatorViewState>>) => void;
  readonly onUpdate: (instanceId: string, patch: CanonicalIndicatorSelectionPatch) => void;
  readonly onRemove: (instanceId: string) => void;
  readonly onReorder: (instanceId: string, direction: -1 | 1) => void;
}

export default function CanonicalIndicatorWorkspace({
  selections, symbol, timeframe, locale, data, mainChart, mainSeries, seriesReadyKey,
  onStatesChange, onUpdate, onRemove, onReorder,
}: CanonicalIndicatorWorkspaceProps) {
  const { executions, states } = useCanonicalIndicatorExecutions({ selections, symbol, timeframe });
  const surfaces = useMemo(() => partitionCanonicalSurfaces(executions), [executions]);
  const overlayHandles = useRef<Map<string, CanonicalOverlayHandle>>(new Map());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [heights, setHeights] = useState<Readonly<Record<string, number>>>({});
  const [marketOpen, setMarketOpen] = useState(true);
  const visibleDiagnostics = useMemo(() => selections.flatMap((selection) => {
    const state = states[selection.instanceId];
    if (!state || (state.status !== 'unavailable' && state.status !== 'error')) return [];
    const entry = getIndicatorCatalogEntry(selection.definitionId);
    const message = state.message
      ?? (state.diagnostics?.[0]
        ? formatIndicatorDiagnostic(state.diagnostics[0], locale)
        : locale === 'ar' ? 'بيانات المؤشر غير متاحة.' : 'Indicator data is unavailable.');
    return [{ instanceId: selection.instanceId, name: entry?.name[locale] ?? selection.definitionId, message }];
  }), [locale, selections, states]);

  const prevStatesRef = useRef<Readonly<Record<string, CanonicalIndicatorViewState>>>({});

  useEffect(() => {
    const prev = prevStatesRef.current;
    const prevKeys = Object.keys(prev);
    const newKeys = Object.keys(states);

    let isDifferent = prevKeys.length !== newKeys.length;
    if (!isDifferent) {
      for (const k of newKeys) {
        const a = prev[k];
        const b = states[k];
        if (!a || !b) {
          isDifferent = true;
          break;
        }
        if (
          a.status !== b.status ||
          a.message !== b.message ||
          a.provisional !== b.provisional ||
          a.asOf !== b.asOf ||
          a.diagnostics?.length !== b.diagnostics?.length
        ) {
          isDifferent = true;
          break;
        }
      }
    }

    if (isDifferent) {
      prevStatesRef.current = states;
      onStatesChange(states);
    }
  }, [onStatesChange, states]);

  useEffect(() => {
    if (!mainChart || !mainSeries) return;
    const host: CanonicalOverlayHost = {
      addSeries(visual: CanonicalChartVisual): LightweightOverlayHandle {
        const definition = visual.renderer === 'histogram'
          ? HistogramSeries
          : visual.renderer === 'area'
            ? AreaSeries
            : LineSeries;
        const color = COLOR_BY_ROLE[visual.colorRole];
        const series = mainChart.addSeries(definition as any, {
          color,
          lineColor: color,
          topColor: `${color}40`,
          bottomColor: `${color}05`,
          lineWidth: visual.lineWidth ?? 2,
          title: `${visual.indicatorName[locale]} — ${visual.outputLabel}`,
        } as any) as ISeriesApi<any>;
        return {
          series,
          setData(points: readonly CanonicalOverlayPoint[]) {
            series.setData(points.map((point) => ({ time: parseChartTime(point.time), value: point.value })));
          },
        };
      },
      removeSeries(_id, handle) {
        try { mainChart.removeSeries((handle as LightweightOverlayHandle).series); } catch {}
      },
    };
    overlayHandles.current = reconcileCanonicalOverlays(host, overlayHandles.current, executions);
  }, [executions, locale, mainChart, mainSeries, seriesReadyKey]);

  useEffect(() => () => {
    if (!mainChart) return;
    for (const handle of overlayHandles.current.values()) {
      try { mainChart.removeSeries((handle as LightweightOverlayHandle).series); } catch {}
    }
    overlayHandles.current.clear();
  }, [mainChart]);

  const mainValueAtTime = useCallback((time: string) => {
    const bar = data.find((candidate) => String(candidate.time) === time);
    return bar?.close ?? null;
  }, [data]);

  return (
    <>
      {visibleDiagnostics.length > 0 && (
        <div data-testid="canonical-indicator-diagnostics" className="border-t border-white/10 bg-black px-3 py-2 font-sans text-[10px] text-[#ffb74d]">
          {visibleDiagnostics.map((diagnostic) => (
            <div key={diagnostic.instanceId} className="leading-5">
              <span className="font-semibold text-white/75">{diagnostic.name}</span>
              <span className="px-1 text-white/25">·</span>
              <span>{diagnostic.message}</span>
            </div>
          ))}
        </div>
      )}
      {surfaces.overlays.length > 0 && (
        <div data-testid="canonical-overlay-legend" className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 bg-black px-3 py-1 font-sans text-[10px] text-white/55">
          {surfaces.overlays.map((visual) => (
            <span key={visual.id} className="tabular-nums">
              {visual.indicatorName[locale]} · {visual.outputLabel}: {visual.latestValue === null ? '—' : String(visual.latestValue)}
            </span>
          ))}
        </div>
      )}
      <CanonicalMetricsDock visuals={[...surfaces.cards, ...surfaces.legends]} locale={locale} />
      <CanonicalIndicatorPaneHost
        panes={surfaces.panes} states={states} locale={locale}
        mainChart={mainChart} mainSeries={mainSeries} mainValueAtTime={mainValueAtTime}
        collapsed={collapsed} heights={heights}
        onToggleCollapse={(instanceId) => setCollapsed((current) => {
          const next = new Set(current);
          if (next.has(instanceId)) next.delete(instanceId); else next.add(instanceId);
          return next;
        })}
        onHeightChange={(instanceId, height) => setHeights((current) => ({ ...current, [instanceId]: height }))}
        onMove={onReorder}
        onResetParameters={(instanceId) => {
          const selection = selections.find((candidate) => candidate.instanceId === instanceId);
          const entry = selection ? getIndicatorCatalogEntry(selection.definitionId) : undefined;
          if (entry) onUpdate(instanceId, { parameters: entry.defaultParameters });
        }}
        onClose={onRemove}
      />
      {marketOpen && <CanonicalMarketDrawer visuals={surfaces.market} locale={locale} onClose={() => setMarketOpen(false)} />}
    </>
  );
}

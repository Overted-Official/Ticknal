import {
  evaluateChartSeries,
  type ExecutionContext,
  type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';

import { getIndicatorCatalogEntry } from './catalog';
import type {
  CanonicalChartExecution,
  CanonicalIndicatorSelection,
} from './types';

const COLOR_BY_ROLE = Object.freeze({
  primary: '#2962ff',
  secondary: '#7c4dff',
  positive: '#089981',
  negative: '#f23645',
  warning: '#ff9800',
  muted: '#a1a1aa',
});

export function executeChartIndicator(
  selection: CanonicalIndicatorSelection,
  frame: TimeSeriesFrame,
  context: ExecutionContext,
): CanonicalChartExecution;
/** @deprecated Use a versioned CanonicalIndicatorSelection. */
export function executeChartIndicator(
  definitionId: string,
  frame: TimeSeriesFrame,
  context: ExecutionContext,
): CanonicalChartExecution;

export function executeChartIndicator(
  selectionOrDefinitionId: CanonicalIndicatorSelection | string,
  frame: TimeSeriesFrame,
  context: ExecutionContext,
): CanonicalChartExecution {
  const legacyEntry = typeof selectionOrDefinitionId === 'string'
    ? getIndicatorCatalogEntry(selectionOrDefinitionId)
    : undefined;
  const selection: CanonicalIndicatorSelection = typeof selectionOrDefinitionId === 'string'
    ? {
        instanceId: `${selectionOrDefinitionId}:1`,
        definitionId: selectionOrDefinitionId,
        formulaVersion: legacyEntry?.formulaVersion ?? '1.0.0',
        parameters: legacyEntry?.defaultParameters ?? {},
        visibleOutputs: [],
        placementOverrides: {},
      }
    : selectionOrDefinitionId;
  const entry = getIndicatorCatalogEntry(selection.definitionId);
  if (!entry) {
    throw new RangeError(`Unknown canonical indicator: ${selection.definitionId}`);
  }
  if (entry.formulaVersion !== selection.formulaVersion) {
    throw new RangeError(
      `Formula version mismatch for ${entry.id}: expected ${entry.formulaVersion}, received ${selection.formulaVersion}.`,
    );
  }

  const result = evaluateChartSeries({
    definitionId: selection.definitionId,
    formulaVersion: selection.formulaVersion,
    frame,
    parameters: selection.parameters,
    context,
  });

  if (result.status !== 'ok') {
    return Object.freeze({
      instanceId: selection.instanceId,
      definitionId: entry.id,
      result,
      visuals: Object.freeze([]),
      lines: Object.freeze([]),
    });
  }

  const visibleOutputs = new Set(selection.visibleOutputs);
  const showEveryOutput = visibleOutputs.size === 0;
  const seriesByOutput = new Map(result.series.map((series) => [series.outputKey, series]));
  const visuals = entry.visuals.flatMap((descriptor) => {
    if (!showEveryOutput && !visibleOutputs.has(descriptor.outputKey)) return [];
    const series = seriesByOutput.get(descriptor.outputKey);
    if (!series) return [];

    const requestedSurface = selection.placementOverrides[descriptor.outputKey];
    const surface = requestedSurface && descriptor.allowedSurfaces?.includes(requestedSurface)
      ? requestedSurface
      : descriptor.surface;

    return [{
      id: `${selection.instanceId}:${descriptor.outputKey}`,
      instanceId: selection.instanceId,
      definitionId: entry.id,
      outputKey: descriptor.outputKey,
      indicatorName: entry.name,
      outputLabel: series.label,
      surface,
      renderer: descriptor.renderer,
      colorRole: descriptor.colorRole,
      lineWidth: descriptor.lineWidth,
      paneGroup: descriptor.paneGroup,
      referenceLevels: descriptor.referenceLevels ?? Object.freeze([]),
      kind: series.kind,
      unit: series.unit,
      points: series.points,
      latestValue: series.points.at(-1)?.value ?? null,
    }];
  });

  const lines = visuals.flatMap((visual) => {
    if (visual.surface !== 'overlay' || visual.kind !== 'number') return [];
    return [{
      id: visual.outputKey,
      name: `${entry.name.en} — ${visual.outputLabel}`,
      color: COLOR_BY_ROLE[visual.colorRole],
      lineWidth: visual.lineWidth ?? 2,
      data: visual.points.flatMap((point) =>
        typeof point.value === 'number' ? [{ time: point.time, value: point.value }] : [],
      ),
    }];
  });

  return Object.freeze({
    instanceId: selection.instanceId,
    definitionId: entry.id,
    result,
    visuals: Object.freeze(visuals),
    lines: Object.freeze(lines),
  });
}

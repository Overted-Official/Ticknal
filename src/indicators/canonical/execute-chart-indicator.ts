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

export function executeChartIndicator(
  selection: CanonicalIndicatorSelection,
  frame: TimeSeriesFrame,
  context: ExecutionContext,
): CanonicalChartExecution {
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

  return Object.freeze({
    instanceId: selection.instanceId,
    definitionId: entry.id,
    result,
    visuals: Object.freeze(visuals),
  });
}

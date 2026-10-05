import type { ObservationTime } from '@ticknal/quant-engine/canonical';

import type {
  CanonicalChartExecution,
  CanonicalChartVisual,
} from '@/indicators/canonical/types';

export interface CanonicalOverlayPoint {
  readonly time: ObservationTime;
  readonly value: number;
}

export interface CanonicalOverlayHandle {
  setData(data: readonly CanonicalOverlayPoint[]): void;
}

export interface CanonicalOverlayHost {
  addSeries(visual: CanonicalChartVisual): CanonicalOverlayHandle;
  removeSeries(id: string, handle: CanonicalOverlayHandle): void;
}

export function reconcileCanonicalOverlays(
  host: CanonicalOverlayHost,
  previousHandles: ReadonlyMap<string, CanonicalOverlayHandle>,
  executions: readonly CanonicalChartExecution[],
): Map<string, CanonicalOverlayHandle> {
  const next = new Map<string, CanonicalOverlayHandle>();

  for (const execution of executions) {
    for (const visual of execution.visuals) {
      if (visual.surface !== 'overlay' || visual.kind !== 'number') continue;
      if (!['line', 'area', 'histogram'].includes(visual.renderer)) continue;

      const handle = previousHandles.get(visual.id) ?? host.addSeries(visual);
      handle.setData(visual.points.flatMap((point) =>
        typeof point.value === 'number' ? [{ time: point.time, value: point.value }] : [],
      ));
      next.set(visual.id, handle);
    }
  }

  for (const [id, handle] of previousHandles) {
    if (!next.has(id)) host.removeSeries(id, handle);
  }

  return next;
}

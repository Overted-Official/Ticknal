import type {
  CanonicalChartExecution,
  CanonicalChartVisual,
} from '@/indicators/canonical/types';

export interface CanonicalPaneModel {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly name: CanonicalChartVisual['indicatorName'];
  readonly visuals: readonly CanonicalChartVisual[];
  readonly legends: readonly CanonicalChartVisual[];
  readonly execution: CanonicalChartExecution;
}

export interface CanonicalSurfaceModel {
  readonly overlays: readonly CanonicalChartVisual[];
  readonly panes: readonly CanonicalPaneModel[];
  readonly market: readonly CanonicalChartVisual[];
  readonly cards: readonly CanonicalChartVisual[];
  readonly legends: readonly CanonicalChartVisual[];
}

export function partitionCanonicalSurfaces(
  executions: readonly CanonicalChartExecution[],
): CanonicalSurfaceModel {
  const overlays: CanonicalChartVisual[] = [];
  const panes: CanonicalPaneModel[] = [];
  const market: CanonicalChartVisual[] = [];
  const cards: CanonicalChartVisual[] = [];
  const legends: CanonicalChartVisual[] = [];

  for (const execution of executions) {
    if (execution.result.status !== 'ok') continue;
    const paneVisuals = execution.visuals.filter((visual) => visual.surface === 'pane');
    const instanceLegends = execution.visuals.filter((visual) => visual.surface === 'legend');
    overlays.push(...execution.visuals.filter((visual) => visual.surface === 'overlay'));
    market.push(...execution.visuals.filter((visual) => visual.surface === 'market'));
    cards.push(...execution.visuals.filter((visual) => visual.surface === 'card'));

    if (paneVisuals.length > 0) {
      panes.push(Object.freeze({
        instanceId: execution.instanceId,
        definitionId: execution.definitionId,
        name: paneVisuals[0].indicatorName,
        visuals: Object.freeze(paneVisuals),
        legends: Object.freeze(instanceLegends),
        execution,
      }));
    } else {
      legends.push(...instanceLegends);
    }
  }

  return Object.freeze({
    overlays: Object.freeze(overlays),
    panes: Object.freeze(panes),
    market: Object.freeze(market),
    cards: Object.freeze(cards),
    legends: Object.freeze(legends),
  });
}

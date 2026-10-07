import {
  parseIndicatorQuery,
  removeIndicatorSelection,
} from '../../../../indicators/canonical/selection-state';
import type { CanonicalIndicatorSelection } from '../../../../indicators/canonical/types';

export interface ChartIndicatorState {
  readonly canonicalSelections: readonly CanonicalIndicatorSelection[];
  readonly legacyIds: readonly string[];
  readonly activeCount: number;
}

export function stableChartWidgetKey(symbol: string, timeframe: string): string {
  return `${symbol}:${timeframe}`;
}

export function initializeChartIndicatorState(
  searchParams: URLSearchParams,
  selectableDefinitionIds: ReadonlySet<string> | readonly string[],
): ChartIndicatorState {
  const parsed = parseIndicatorQuery(searchParams, selectableDefinitionIds);
  return Object.freeze({
    canonicalSelections: parsed.selections,
    legacyIds: parsed.legacyIds,
    activeCount: parsed.selections.length + parsed.legacyIds.length,
  });
}

export function removeCanonicalFromChartState(
  state: ChartIndicatorState,
  instanceId: string,
): ChartIndicatorState {
  const canonicalSelections = removeIndicatorSelection(state.canonicalSelections, instanceId);
  return Object.freeze({
    canonicalSelections,
    legacyIds: state.legacyIds,
    activeCount: canonicalSelections.length + state.legacyIds.length,
  });
}

export function clearCanonicalChartState(state: ChartIndicatorState): ChartIndicatorState {
  return Object.freeze({
    canonicalSelections: Object.freeze([]),
    legacyIds: state.legacyIds,
    activeCount: state.legacyIds.length,
  });
}

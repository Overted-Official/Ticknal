import type { CanonicalIndicatorSelection } from '../../../indicators/canonical/types';
import {
  normalizeLiveTicker,
  parseLiveTimeframe,
  type LiveTimeframe,
} from './types';

export interface ContextualEvaluationRequest {
  readonly symbol: string;
  readonly timeframe: LiveTimeframe;
  readonly selections: readonly CanonicalIndicatorSelection[];
}

export type ContextualEvaluationRequestParseResult =
  | { readonly success: true; readonly value: ContextualEvaluationRequest }
  | { readonly success: false; readonly error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseSelection(value: unknown): CanonicalIndicatorSelection | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.instanceId !== 'string' || value.instanceId.length === 0
    || typeof value.definitionId !== 'string' || value.definitionId.length === 0
    || value.formulaVersion !== '1.0.0'
    || !isRecord(value.parameters)
    || !Array.isArray(value.visibleOutputs)
    || !value.visibleOutputs.every((output) => typeof output === 'string')
    || !isRecord(value.placementOverrides)
    || !Object.values(value.placementOverrides).every((placement) => placement === 'overlay' || placement === 'pane')
  ) return null;
  return {
    instanceId: value.instanceId,
    definitionId: value.definitionId,
    formulaVersion: '1.0.0',
    parameters: value.parameters,
    visibleOutputs: value.visibleOutputs as string[],
    placementOverrides: value.placementOverrides as Record<string, 'overlay' | 'pane'>,
  };
}

export function parseContextualEvaluationRequest(
  value: unknown,
): ContextualEvaluationRequestParseResult {
  if (!isRecord(value)) return { success: false, error: 'Request body must be an object.' };
  const symbol = typeof value.symbol === 'string' ? normalizeLiveTicker(value.symbol) : null;
  const timeframe = typeof value.timeframe === 'string' ? parseLiveTimeframe(value.timeframe) : null;
  if (!symbol || !timeframe) {
    return { success: false, error: 'symbol and timeframe must be valid.' };
  }
  if (!Array.isArray(value.selections) || value.selections.length === 0 || value.selections.length > 50) {
    return { success: false, error: 'selections must contain between 1 and 50 entries.' };
  }
  const selections = value.selections.map(parseSelection);
  if (selections.some((selection) => selection === null)) {
    return { success: false, error: 'Each selection must match the canonical selection contract.' };
  }
  return { success: true, value: { symbol, timeframe, selections: selections as CanonicalIndicatorSelection[] } };
}

import type { Diagnostic } from '@ticknal/quant-engine/canonical';

import { getIndicatorCatalogEntry } from '../../../../indicators/canonical/catalog';
import type {
  CanonicalChartExecution,
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '../../../../indicators/canonical/types';
import type { ActiveIndicatorEvaluation } from './evaluate-active-indicators';

export interface ContextualExecutionItem {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly execution: CanonicalChartExecution;
}

export type ContextualRequestState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly items: readonly ContextualExecutionItem[] }
  | { readonly status: 'unavailable'; readonly diagnostics: readonly Diagnostic[] }
  | { readonly status: 'error'; readonly message: string };

export interface ContextualRequestStore {
  readonly currentRequestKey: string | null;
  readonly state: ContextualRequestState;
}

export type ContextualRequestAction =
  | { readonly type: 'reset' }
  | { readonly type: 'begin'; readonly requestKey: string }
  | { readonly type: 'settle'; readonly requestKey: string; readonly state: ContextualRequestState };

export function contextualRequestReducer(
  store: ContextualRequestStore,
  action: ContextualRequestAction,
): ContextualRequestStore {
  if (action.type === 'reset') {
    return { currentRequestKey: null, state: { status: 'idle' } };
  }
  if (action.type === 'begin') {
    return { currentRequestKey: action.requestKey, state: { status: 'loading' } };
  }
  if (store.currentRequestKey !== action.requestKey) return store;
  return { currentRequestKey: store.currentRequestKey, state: action.state };
}

export function partitionCanonicalSelections(
  selections: readonly CanonicalIndicatorSelection[],
): Readonly<{
  local: readonly CanonicalIndicatorSelection[];
  contextual: readonly CanonicalIndicatorSelection[];
}> {
  const local: CanonicalIndicatorSelection[] = [];
  const contextual: CanonicalIndicatorSelection[] = [];
  for (const selection of selections) {
    const capabilities = getIndicatorCatalogEntry(selection.definitionId)
      ?.definition.metadata.requiredCapabilities ?? [];
    (capabilities.length > 0 ? contextual : local).push(selection);
  }
  return Object.freeze({ local: Object.freeze(local), contextual: Object.freeze(contextual) });
}

export function indicatorViewStateFromExecution(
  execution: CanonicalChartExecution,
): CanonicalIndicatorViewState {
  return {
    status: execution.result.status === 'ok'
      ? 'ok'
      : execution.result.status === 'unavailable'
        ? 'unavailable'
        : 'error',
    asOf: execution.result.evidence.provenance.asOf,
    provisional: execution.result.evidence.resultFinality === 'provisional',
    diagnostics: execution.result.diagnostics,
    message: execution.result.status === 'invalid'
      ? 'Canonical input validation failed.'
      : undefined,
  };
}

function pendingState(state: ContextualRequestState): CanonicalIndicatorViewState {
  switch (state.status) {
    case 'unavailable':
      return { status: 'unavailable', diagnostics: state.diagnostics };
    case 'error':
      return { status: 'error', message: state.message };
    case 'idle':
    case 'loading':
    case 'ok':
      return { status: 'loading' };
  }
}

export function mergeCanonicalIndicatorEvaluations(
  selections: readonly CanonicalIndicatorSelection[],
  localEvaluation: ActiveIndicatorEvaluation,
  contextualState: ContextualRequestState,
): ActiveIndicatorEvaluation {
  const { contextual } = partitionCanonicalSelections(selections);
  const contextualIds = new Set(contextual.map((selection) => selection.instanceId));
  const executionsById = new Map(
    localEvaluation.executions.map((execution) => [execution.instanceId, execution]),
  );
  const statesById = new Map(Object.entries(localEvaluation.states));

  if (contextualState.status === 'ok') {
    for (const item of contextualState.items) {
      executionsById.set(item.instanceId, item.execution);
      statesById.set(item.instanceId, indicatorViewStateFromExecution(item.execution));
    }
  } else {
    const state = pendingState(contextualState);
    for (const instanceId of contextualIds) statesById.set(instanceId, state);
  }

  const executions: CanonicalChartExecution[] = [];
  const states: Record<string, CanonicalIndicatorViewState> = {};
  for (const selection of selections) {
    const execution = executionsById.get(selection.instanceId);
    if (execution) executions.push(execution);
    states[selection.instanceId] = statesById.get(selection.instanceId)
      ?? (contextualIds.has(selection.instanceId)
        ? { status: 'error', message: 'Contextual evaluation omitted this indicator.' }
        : { status: 'loading' });
  }

  return Object.freeze({
    executions: Object.freeze(executions),
    states: Object.freeze(states),
  });
}

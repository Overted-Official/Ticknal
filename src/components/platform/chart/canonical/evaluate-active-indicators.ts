import type { TimeSeriesFrame } from '@ticknal/quant-engine/canonical';

import { executeChartIndicator } from '@/indicators/canonical/execute-chart-indicator';
import type {
  CanonicalChartExecution,
  CanonicalIndicatorSelection,
  CanonicalIndicatorViewState,
} from '@/indicators/canonical/types';
import { indicatorViewStateFromExecution } from './contextual-execution';

export interface ActiveIndicatorEvaluation {
  readonly executions: readonly CanonicalChartExecution[];
  readonly states: Readonly<Record<string, CanonicalIndicatorViewState>>;
}

export function evaluateActiveIndicators(
  selections: readonly CanonicalIndicatorSelection[],
  frame: TimeSeriesFrame,
  calculatedAt: string,
): ActiveIndicatorEvaluation {
  const executions: CanonicalChartExecution[] = [];
  const states: Record<string, CanonicalIndicatorViewState> = {};

  for (const selection of selections) {
    try {
      const execution = executeChartIndicator(selection, frame, { calculatedAt });
      executions.push(execution);
      states[selection.instanceId] = indicatorViewStateFromExecution(execution);
    } catch (error) {
      states[selection.instanceId] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Indicator execution failed.',
      };
    }
  }

  return Object.freeze({
    executions: Object.freeze(executions),
    states: Object.freeze(states),
  });
}

import { describe, expect, it } from 'vitest';

import type {
  CanonicalChartExecution,
  CanonicalIndicatorSelection,
} from '../../../../indicators/canonical/types';
import {
  contextualRequestReducer,
  mergeCanonicalIndicatorEvaluations,
  partitionCanonicalSelections,
  type ContextualRequestStore,
} from './contextual-execution';
import { stableChartWidgetKey } from './chart-integration-model';
import { formatIndicatorDiagnostic } from './indicator-diagnostic-message';

function selection(instanceId: string, definitionId: string): CanonicalIndicatorSelection {
  return {
    instanceId,
    definitionId,
    formulaVersion: '1.0.0',
    parameters: {},
    visibleOutputs: [],
    placementOverrides: {},
  };
}

function execution(instanceId: string, definitionId: string): CanonicalChartExecution {
  return {
    instanceId,
    definitionId,
    visuals: [],
    result: {
      status: 'ok',
      series: [],
      diagnostics: [],
      evidence: {
        identity: {
          backlogId: 'TEST-001', definitionSchemaVersion: 1,
          id: definitionId, formulaVersion: '1.0.0',
        },
        normalizedParameters: {},
        provenance: {
          sourceId: 'test', sourceType: 'test', sourceRevision: 'one',
          instrumentId: 'COMI', symbol: 'COMI', exchange: 'EGX',
          requestedTimeframe: '1d', effectiveTimeframe: '1d',
          adjustmentMode: 'raw', adjustmentRevision: null,
          asOf: '2026-01-08', receivedAt: '2026-01-08',
          transformations: [],
        },
        contextualProvenance: [],
        executionFingerprint: 'test',
        calculatedAt: '2026-01-08',
        resultFinality: 'final',
        coverage: {
          barCount: 1, firstObservation: '2026-01-08', lastObservation: '2026-01-08',
          sessionCompleteness: 'complete', continuityStatus: 'continuous',
        },
      },
    },
  };
}

describe('contextual chart execution orchestration', () => {
  it('keeps the chart workspace mounted across background data revisions', () => {
    expect(stableChartWidgetKey('COMI', 'D')).toBe('COMI:D');
    expect(stableChartWidgetKey('COMI', 'D')).toBe(stableChartWidgetKey('COMI', 'D'));
  });

  it('partitions local and contextual selections from canonical capabilities', () => {
    const selections = [
      selection('local', 'close-price'),
      selection('comparison', 'rolling-correlation'),
      selection('trades', 'profit-factor'),
    ];

    const result = partitionCanonicalSelections(selections);

    expect(result.local.map((item) => item.instanceId)).toEqual(['local']);
    expect(result.contextual.map((item) => item.instanceId)).toEqual(['comparison', 'trades']);
  });

  it('ignores a late response after a newer request begins', () => {
    const initial: ContextualRequestStore = {
      currentRequestKey: null,
      state: { status: 'idle' },
    };
    const first = contextualRequestReducer(initial, { type: 'begin', requestKey: 'first' });
    const second = contextualRequestReducer(first, { type: 'begin', requestKey: 'second' });
    const stale = contextualRequestReducer(second, {
      type: 'settle', requestKey: 'first', state: { status: 'error', message: 'stale' },
    });

    expect(stale).toBe(second);
    expect(stale.state).toEqual({ status: 'loading' });
  });

  it('merges local and contextual executions in selection order', () => {
    const selections = [
      selection('context-one', 'rolling-correlation'),
      selection('local', 'close-price'),
      selection('context-two', 'rolling-beta'),
    ];
    const localExecution = execution('local', 'close-price');
    const contextOne = execution('context-one', 'rolling-correlation');
    const contextTwo = execution('context-two', 'rolling-beta');

    const merged = mergeCanonicalIndicatorEvaluations(
      selections,
      { executions: [localExecution], states: { local: { status: 'ok' } } },
      {
        status: 'ok',
        items: [
          { instanceId: 'context-one', definitionId: 'rolling-correlation', execution: contextOne },
          { instanceId: 'context-two', definitionId: 'rolling-beta', execution: contextTwo },
        ],
      },
    );

    expect(merged.executions.map((item) => item.instanceId)).toEqual([
      'context-one', 'local', 'context-two',
    ]);
    expect(Object.keys(merged.states)).toEqual(['context-one', 'local', 'context-two']);
  });

  it('projects contextual unavailable diagnostics onto every contextual selection', () => {
    const selections = [selection('one', 'rolling-beta'), selection('two', 'rolling-alpha')];
    const diagnostics = [{
      code: 'DATA_CAPABILITY_MISSING' as const,
      severity: 'warning' as const,
      messageKey: 'indicator.data.requiredRoleMissing',
      fields: { role: 'benchmark' },
    }];

    const merged = mergeCanonicalIndicatorEvaluations(
      selections,
      { executions: [], states: {} },
      { status: 'unavailable', diagnostics },
    );

    expect(merged.states.one).toEqual({ status: 'unavailable', diagnostics });
    expect(merged.states.two).toEqual({ status: 'unavailable', diagnostics });
  });

  it('formats the specific missing data role for visible chart diagnostics', () => {
    const diagnostic = {
      code: 'DATA_CAPABILITY_MISSING' as const,
      severity: 'error' as const,
      messageKey: 'indicator.data.requiredRoleMissing',
      fields: { role: 'benchmark' },
    };

    expect(formatIndicatorDiagnostic(diagnostic, 'en')).toBe('Missing required data: benchmark.');
    expect(formatIndicatorDiagnostic(diagnostic, 'ar')).toContain('benchmark');
  });

  it('formats chronology failures without exposing internal message keys', () => {
    const diagnostic = {
      code: 'INPUT_TIMESTAMP_ORDER' as const,
      severity: 'error' as const,
      messageKey: 'indicator.context.tradeChronologyInvalid',
      fields: { tradeId: 'trade-42' },
    };

    expect(formatIndicatorDiagnostic(diagnostic, 'en')).toBe(
      'A completed trade has an exit before its entry: trade-42.',
    );
    expect(formatIndicatorDiagnostic(diagnostic, 'ar')).toContain('trade-42');
    expect(formatIndicatorDiagnostic(diagnostic, 'en')).not.toContain('indicator.');
  });
});

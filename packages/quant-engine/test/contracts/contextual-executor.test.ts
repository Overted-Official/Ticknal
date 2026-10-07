import { describe, expect, it, vi } from 'vitest';

import type {
  ComputationResult,
  IndicatorInputBundle,
  IndicatorMetadata,
  NumericSeriesFrame,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../../src/canonical/contracts';
import {
  createIndicatorInputBundle,
  EMPTY_INDICATOR_INPUT_BUNDLE,
} from '../../src/canonical/contracts/contextual-inputs';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { FIVE_BAR_FRAME } from '../references/five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function comparisonFrame(revision: string, values = [10, 11, 12, 13, 14]): NumericSeriesFrame {
  return {
    domain: 'numeric-series',
    role: 'comparison',
    unit: 'price',
    points: FIVE_BAR_FRAME.bars.map((bar, index) => ({
      time: bar.time,
      value: values[index] ?? null,
    })),
    provenance: {
      sourceId: 'comparison-feed',
      sourceType: 'market-prices',
      sourceRevision: revision,
      instrumentId: 'comparison-equity',
      symbol: 'CMP',
      asOf: '2026-01-08T12:00:00.000Z',
      receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

const METADATA: IndicatorMetadata = {
  name: 'Context fixture',
  description: { en: 'Context fixture.', ar: 'اختبار السياق.' },
  category: 'test',
  tags: ['test'],
  requiredFields: ['close'],
  requiredCapabilities: ['numeric-series'],
  outputs: [{
    key: 'value',
    label: 'Value',
    kind: 'number',
    unit: 'price',
    placement: 'pane',
    nullable: true,
  }],
  defaultParameters: {},
  dependencies: [],
  minimumHistory: 1,
  repaintBehavior: 'none',
  confirmationDelay: 0,
  references: [],
};

function definition(
  compute: (
    frame: TimeSeriesFrame,
    parameters: Record<string, never>,
    inputs?: IndicatorInputBundle,
  ) => ComputationResult,
): TimeSeriesIndicatorDefinition<Record<string, never>> {
  return {
    backlogId: 'TEST-CTX-001',
    id: 'context-fixture',
    formulaVersion: '1.0.0',
    definitionSchemaVersion: 1,
    metadata: METADATA,
    parseParameters: () => ({ success: true, value: {} }),
    compute,
  };
}

describe('contextual indicator execution', () => {
  it('creates a deeply immutable serializable input bundle', () => {
    const bundle = createIndicatorInputBundle({
      seriesByRole: { comparison: comparisonFrame('cmp-v1') },
    });

    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.seriesByRole)).toBe(true);
    expect(Object.isFrozen(bundle.seriesByRole.comparison)).toBe(true);
    expect(Object.isFrozen(bundle.seriesByRole.comparison?.points)).toBe(true);
    expect(Object.isFrozen(bundle.seriesByRole.comparison?.points[0])).toBe(true);
    expect(JSON.parse(JSON.stringify(bundle)).seriesByRole.comparison.provenance.sourceRevision)
      .toBe('cmp-v1');
  });

  it('returns unavailable before compute when a required capability is absent', () => {
    const compute = vi.fn((): ComputationResult => ({ status: 'ok', outputs: { value: [] } }));

    const result = executeContextualIndicator(
      definition(compute),
      FIVE_BAR_FRAME,
      {},
      EMPTY_INDICATOR_INPUT_BUNDLE,
      CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DATA_CAPABILITY_MISSING',
        fields: { capability: 'numeric-series' },
      }),
    ]);
    expect(compute).not.toHaveBeenCalled();
  });

  it('passes contextual inputs to compute and preserves supplemental provenance', () => {
    const inputs = createIndicatorInputBundle({
      seriesByRole: { comparison: comparisonFrame('cmp-v1') },
    });
    const result = executeContextualIndicator(
      definition((frame, _parameters, bundle) => ({
        status: 'ok',
        outputs: {
          value: frame.bars.map((_, index) => bundle?.seriesByRole.comparison?.points[index]?.value ?? null),
        },
      })),
      FIVE_BAR_FRAME,
      {},
      inputs,
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.value).toEqual([10, 11, 12, 13, 14]);
    expect(result.contextualProvenance).toEqual([
      expect.objectContaining({
        capability: 'numeric-series',
        role: 'comparison',
        sourceId: 'comparison-feed',
        sourceRevision: 'cmp-v1',
      }),
    ]);
  });

  it('changes the execution fingerprint when supplemental source revision changes', () => {
    const execute = (revision: string) => executeContextualIndicator(
      definition((frame) => ({
        status: 'ok',
        outputs: { value: frame.bars.map((bar) => bar.close) },
      })),
      FIVE_BAR_FRAME,
      {},
      createIndicatorInputBundle({
        seriesByRole: { comparison: comparisonFrame(revision) },
      }),
      CONTEXT,
    );

    expect(execute('cmp-v1').executionFingerprint)
      .not.toBe(execute('cmp-v2').executionFingerprint);
  });

  it('returns unavailable before compute when a contextual series has duplicate timestamps', () => {
    const compute = vi.fn((): ComputationResult => ({
      status: 'ok', outputs: { value: FIVE_BAR_FRAME.bars.map(() => 1) },
    }));
    const source = comparisonFrame('duplicates');
    const inputs = createIndicatorInputBundle({
      seriesByRole: {
        comparison: {
          ...source,
          points: [...source.points, source.points[0]!],
        },
      },
    });

    const result = executeContextualIndicator(
      definition(compute), FIVE_BAR_FRAME, {}, inputs, CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'INPUT_DUPLICATE_TIMESTAMP',
      fields: expect.objectContaining({ role: 'comparison' }),
    }));
    expect(compute).not.toHaveBeenCalled();
  });
});

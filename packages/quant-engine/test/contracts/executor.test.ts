import { describe, expect, it } from 'vitest';

import type {
  ComputationResult,
  IndicatorMetadata,
  ParameterParseResult,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../../src/canonical/contracts';
import { executeTimeSeriesIndicator } from '../../src/canonical/execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../references/five-bar-frame';

interface TestParameters {
  readonly lookback: number;
}

const BASE_METADATA: IndicatorMetadata = {
  name: 'Executor contract fixture',
  description: { en: 'Tests the executor contract.', ar: 'يختبر عقد التنفيذ.' },
  category: 'test',
  tags: ['test'],
  requiredFields: ['close'],
  outputs: [
    {
      key: 'value',
      label: 'Value',
      kind: 'number',
      unit: 'price',
      placement: 'overlay',
      nullable: true,
    },
  ],
  defaultParameters: { lookback: 1 },
  dependencies: [],
  minimumHistory: 1,
  repaintBehavior: 'provisional-latest',
  confirmationDelay: 0,
  references: [],
};

function testDefinition(
  compute: (frame: TimeSeriesFrame, parameters: TestParameters) => ComputationResult = (frame) => ({
    status: 'ok',
    outputs: { value: frame.bars.map((bar) => bar.close) },
  }),
  metadata: IndicatorMetadata = BASE_METADATA,
): TimeSeriesIndicatorDefinition<TestParameters> {
  return {
    backlogId: 'TEST-001',
    id: 'executor-contract-fixture',
    formulaVersion: '1.0.0',
    definitionSchemaVersion: 1,
    metadata,
    parseParameters(raw): ParameterParseResult<TestParameters> {
      const lookback = raw.lookback ?? 1;
      return Number.isSafeInteger(lookback) && Number(lookback) > 0
        ? { success: true, value: { lookback: Number(lookback) } }
        : {
            success: false,
            diagnostics: [
              {
                code: 'PARAMETER_INVALID',
                severity: 'error',
                messageKey: 'indicator.parameter.positiveInteger',
                fields: { parameter: 'lookback' },
              },
            ],
          };
    },
    compute,
  };
}

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function codes(result: ReturnType<typeof executeTimeSeriesIndicator>): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe('executeTimeSeriesIndicator', () => {
  it('returns invalid when parameter parsing fails', () => {
    const result = executeTimeSeriesIndicator(
      testDefinition(),
      FIVE_BAR_FRAME,
      { lookback: 0 },
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(codes(result)).toContain('PARAMETER_INVALID');
  });

  it('returns unavailable when a required field is not fully observed', () => {
    const frame = cloneFiveBarFrame();
    const withoutVolume: TimeSeriesFrame = {
      ...frame,
      meta: {
        ...frame.meta,
        fields: {
          ...frame.meta.fields,
          volume: { coverage: 'unavailable', observedCount: 0, missingCount: 5 },
        },
      },
      bars: frame.bars.map((bar) => ({ ...bar, volume: null })),
    };
    const metadata = { ...BASE_METADATA, requiredFields: ['close', 'volume'] as const };

    const result = executeTimeSeriesIndicator(
      testDefinition(undefined, metadata),
      withoutVolume,
      {},
      CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(codes(result)).toContain('DATA_FIELD_MISSING');
  });

  it('rejects output arrays whose length differs from the input frame', () => {
    const result = executeTimeSeriesIndicator(
      testDefinition(() => ({ status: 'ok', outputs: { value: [1, 2] } })),
      FIVE_BAR_FRAME,
      {},
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(codes(result)).toContain('OUTPUT_INVARIANT_FAILED');
  });

  it('rejects non-finite numeric output', () => {
    const result = executeTimeSeriesIndicator(
      testDefinition((frame) => ({
        status: 'ok',
        outputs: { value: frame.bars.map((bar, index) => (index === 3 ? Number.NaN : bar.close)) },
      })),
      FIVE_BAR_FRAME,
      {},
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(codes(result)).toContain('OUTPUT_INVARIANT_FAILED');
  });

  it('accepts null warm-up values and preserves input alignment', () => {
    const result = executeTimeSeriesIndicator(
      testDefinition((frame) => ({
        status: 'ok',
        outputs: { value: frame.bars.map((bar, index) => (index === 0 ? null : bar.close)) },
      })),
      FIVE_BAR_FRAME,
      {},
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.value).toEqual([null, 108, 114, 110, 115]);
    expect(result.observationTimes).toEqual(FIVE_BAR_FRAME.bars.map((bar) => bar.time));
  });

  it('gives identical requests identical execution fingerprints', () => {
    const first = executeTimeSeriesIndicator(
      testDefinition(),
      FIVE_BAR_FRAME,
      { lookback: 2 },
      CONTEXT,
    );
    const second = executeTimeSeriesIndicator(
      testDefinition(),
      cloneFiveBarFrame(),
      { lookback: 2 },
      CONTEXT,
    );

    expect(first.executionFingerprint).toBe(second.executionFingerprint);
    expect(first.executionFingerprint).toMatch(/^ce1-[0-9a-f]{16}$/);
  });

  it('leaves unexpected programmer exceptions observable', () => {
    const definition = testDefinition(() => {
      throw new Error('programmer defect');
    });

    expect(() => executeTimeSeriesIndicator(definition, FIVE_BAR_FRAME, {}, CONTEXT)).toThrow(
      'programmer defect',
    );
  });
});

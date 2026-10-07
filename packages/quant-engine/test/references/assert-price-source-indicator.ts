import { expect } from 'vitest';

import type {
  FieldObservationSummary,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from '../../src/canonical/contracts';
import { executeTimeSeriesIndicator } from '../../src/canonical/execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function summarize(frame: TimeSeriesFrame, field: MarketField): FieldObservationSummary {
  const observedCount = frame.bars.filter((bar) => bar[field] !== null).length;
  const missingCount = frame.bars.length - observedCount;
  return {
    coverage: observedCount === 0 ? 'unavailable' : missingCount === 0 ? 'observed' : 'partial',
    observedCount,
    missingCount,
  };
}

export function prefixFrame(length: number): TimeSeriesFrame {
  const bars = FIVE_BAR_FRAME.bars.slice(0, length);
  const provisional: TimeSeriesFrame = { ...FIVE_BAR_FRAME, bars };
  return {
    ...provisional,
    meta: {
      ...provisional.meta,
      fields: {
        open: summarize(provisional, 'open'),
        high: summarize(provisional, 'high'),
        low: summarize(provisional, 'low'),
        close: summarize(provisional, 'close'),
        volume: summarize(provisional, 'volume'),
        trades: summarize(provisional, 'trades'),
      },
    },
  };
}

export function assertPriceSourceIndicator(
  definition: TimeSeriesIndicatorDefinition<object>,
  expected: Readonly<Record<string, readonly number[]>>,
  identity: Readonly<{ backlogId: string; id: string }>,
): void {
  expect(definition.backlogId).toBe(identity.backlogId);
  expect(definition.id).toBe(identity.id);
  expect(definition.formulaVersion).toBe('1.0.0');
  expect(definition.definitionSchemaVersion).toBe(1);
  expect(definition.metadata.outputs.map(({ key, unit, placement }) => ({ key, unit, placement }))).toEqual(
    Object.keys(expected).map((key) => ({ key, unit: 'price', placement: 'overlay' })),
  );
  expect(definition.parseParameters({})).toEqual({ success: true, value: {} });
  expect(definition.parseParameters({ unexpected: true }).success).toBe(false);

  const result = executeTimeSeriesIndicator(definition, FIVE_BAR_FRAME, {}, CONTEXT);
  expect(result.status).toBe('ok');
  expect(result.observationTimes).toEqual(FIVE_BAR_FRAME.bars.map((bar) => bar.time));

  for (const [key, expectedValues] of Object.entries(expected)) {
    const actualValues = result.outputs[key] as IndicatorOutputs[string];
    expect(actualValues).toHaveLength(FIVE_BAR_FRAME.bars.length);
    actualValues.forEach((value, index) => {
      expect(value).not.toBeNull();
      expect(value as number).toBeCloseTo(expectedValues[index], 10);
    });
  }

  const prefixResult = executeTimeSeriesIndicator(definition, prefixFrame(3), {}, CONTEXT);
  expect(prefixResult.status).toBe('ok');
  for (const key of Object.keys(expected)) {
    expect(prefixResult.outputs[key]).toEqual(result.outputs[key].slice(0, 3));
  }
}

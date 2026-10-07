import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { DISTANCE_FROM_HIGH_LOW_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function expectCloseSeries(actual: readonly unknown[], expected: readonly (number | null)[]) {
  actual.forEach((value, index) => {
    if (expected[index] === null) expect(value).toBeNull();
    else expect(value as number).toBeCloseTo(expected[index] as number, 10);
  });
}

describe('PRC-017 distance-from-high-low', () => {
  it('returns exact close distance from rolling bar highs and lows', () => {
    const result = executeTimeSeriesIndicator(
      DISTANCE_FROM_HIGH_LOW_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 3 },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expectCloseSeries(result.outputs.distance_from_high_pct, [
      null,
      null,
      -0.8695652174,
      -6.7796610169,
      -2.5423728814,
    ]);
    expectCloseSeries(result.outputs.distance_from_low_pct, [
      null,
      null,
      26.6666666667,
      8.9108910891,
      10.5769230769,
    ]);
  });

  it('returns aligned nulls plus history diagnostics for an oversized lookback', () => {
    const result = executeTimeSeriesIndicator(
      DISTANCE_FROM_HIGH_LOW_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 10 },
      CONTEXT,
    );

    expect(result.outputs.distance_from_high_pct).toEqual([null, null, null, null, null]);
    expect(result.outputs.distance_from_low_pct).toEqual([null, null, null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('HISTORY_INSUFFICIENT');
  });
});

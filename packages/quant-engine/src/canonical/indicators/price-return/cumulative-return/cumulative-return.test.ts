import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { CUMULATIVE_RETURN_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function expectCloseSeries(actual: readonly unknown[], expected: readonly (number | null)[]) {
  actual.forEach((value, index) => {
    if (expected[index] === null) expect(value).toBeNull();
    else expect(value as number).toBeCloseTo(expected[index] as number, 10);
  });
}

describe('PRC-011 cumulative-return', () => {
  it('defaults to the first observation and preserves full precision', () => {
    const result = executeTimeSeriesIndicator(CUMULATIVE_RETURN_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);

    expect(result.status).toBe('ok');
    expectCloseSeries(result.outputs.cumulative_return, [
      0,
      2.8571428571,
      8.5714285714,
      4.7619047619,
      9.5238095238,
    ]);
  });

  it('uses an exact observation-time anchor and leaves earlier bars null', () => {
    const result = executeTimeSeriesIndicator(
      CUMULATIVE_RETURN_DEFINITION,
      FIVE_BAR_FRAME,
      { anchor: '2026-01-06' },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expectCloseSeries(result.outputs.cumulative_return, [
      null,
      null,
      0,
      -3.5087719298,
      0.8771929825,
    ]);
  });

  it('rejects an unmatched anchor rather than selecting a nearby date', () => {
    const result = executeTimeSeriesIndicator(
      CUMULATIVE_RETURN_DEFINITION,
      FIVE_BAR_FRAME,
      { anchor: '2026-01-06T00:00:01Z' },
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('PARAMETER_INVALID');
  });

  it('rejects a non-positive anchor divisor', () => {
    const frame = cloneFiveBarFrame();
    const candidate: TimeSeriesFrame = {
      ...frame,
      bars: frame.bars.map((bar, index) =>
        index === 0 ? { ...bar, open: 0, high: 0, low: 0, close: 0 } : bar,
      ),
    };
    const result = executeTimeSeriesIndicator(CUMULATIVE_RETURN_DEFINITION, candidate, {}, CONTEXT);

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
  });
});

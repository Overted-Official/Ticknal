import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { PRICE_PERCENTILE_RANK_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-019 price-percentile-rank', () => {
  it('measures close position inside the rolling close minimum and maximum', () => {
    const result = executeTimeSeriesIndicator(
      PRICE_PERCENTILE_RANK_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 3 },
      CONTEXT,
    );
    const expected = [null, null, 100, 33.3333333333, 100];

    expect(result.status).toBe('ok');
    result.outputs.percentile_0_100.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value as number).toBeCloseTo(expected[index] as number, 10);
    });
  });

  it('returns null and a diagnostic for each zero-width complete window', () => {
    const frame = cloneFiveBarFrame();
    const constant: TimeSeriesFrame = {
      ...frame,
      bars: frame.bars.map((bar) => ({ ...bar, open: 100, high: 100, low: 100, close: 100 })),
    };
    const result = executeTimeSeriesIndicator(
      PRICE_PERCENTILE_RANK_DEFINITION,
      constant,
      { lookback: 3 },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.percentile_0_100).toEqual([null, null, null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'NUMERIC_DIVIDE_BY_ZERO',
    );
  });

  it('returns aligned nulls plus history diagnostics for an oversized lookback', () => {
    const result = executeTimeSeriesIndicator(
      PRICE_PERCENTILE_RANK_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 10 },
      CONTEXT,
    );

    expect(result.outputs.percentile_0_100).toEqual([null, null, null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('HISTORY_INSUFFICIENT');
  });
});

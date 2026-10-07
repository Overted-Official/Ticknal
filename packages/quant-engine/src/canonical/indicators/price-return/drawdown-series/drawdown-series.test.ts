import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { DRAWDOWN_SERIES_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-018 drawdown-series', () => {
  it('returns the running peak and exact peak-relative drawdown', () => {
    const result = executeTimeSeriesIndicator(DRAWDOWN_SERIES_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);

    expect(result.status).toBe('ok');
    expect(result.outputs.peak).toEqual([105, 108, 114, 114, 115]);
    const expected = [0, 0, 0, -3.5087719298, 0];
    result.outputs.drawdown_pct.forEach((value, index) =>
      expect(value as number).toBeCloseTo(expected[index], 10),
    );
  });
});

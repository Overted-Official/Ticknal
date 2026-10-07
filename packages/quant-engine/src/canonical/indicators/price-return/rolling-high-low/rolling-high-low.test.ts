import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { ROLLING_HIGH_LOW_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-016 rolling-high-low', () => {
  it('returns exact complete-window high and low series', () => {
    const result = executeTimeSeriesIndicator(
      ROLLING_HIGH_LOW_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 3 },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.highest).toEqual([null, null, 115, 118, 118]);
    expect(result.outputs.lowest).toEqual([null, null, 90, 101, 104]);
  });

  it('returns aligned nulls plus history diagnostics when lookback exceeds history', () => {
    const result = executeTimeSeriesIndicator(
      ROLLING_HIGH_LOW_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 10 },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.highest).toEqual([null, null, null, null, null]);
    expect(result.outputs.lowest).toEqual([null, null, null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('HISTORY_INSUFFICIENT');
  });
});

import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { LOG_RETURN_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-010 log-return', () => {
  it('returns exact decimal log returns without rounding', () => {
    const result = executeTimeSeriesIndicator(
      LOG_RETURN_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );
    const expected = [null, 0.02817087697, 0.05406722127, -0.0357180826, 0.04445176257];

    expect(result.status).toBe('ok');
    result.outputs.log_return.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value as number).toBeCloseTo(expected[index] as number, 10);
    });
    expect(LOG_RETURN_DEFINITION.metadata.outputs[0].unit).toBe('decimal-return');
  });

  it('defaults to one bar and keeps two-bar warm-up aligned', () => {
    const defaults = executeTimeSeriesIndicator(LOG_RETURN_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);
    const explicit = executeTimeSeriesIndicator(
      LOG_RETURN_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );
    const twoBars = executeTimeSeriesIndicator(
      LOG_RETURN_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 2 },
      CONTEXT,
    );

    expect(defaults.outputs.log_return).toEqual(explicit.outputs.log_return);
    expect(twoBars.outputs.log_return.slice(0, 2)).toEqual([null, null]);
  });

  it.each([0, -1])('returns invalid for non-positive price %s', (price) => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 0 ? { ...bar, open: price, high: price, low: price, close: price } : bar,
    );
    const candidate: TimeSeriesFrame = { ...frame, bars };
    const result = executeTimeSeriesIndicator(
      LOG_RETURN_DEFINITION,
      candidate,
      { lookback: 1 },
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
    expect(result.outputs).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { PERCENTAGE_CHANGE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-009 percentage-change', () => {
  it('returns exact percent changes without rounding', () => {
    const result = executeTimeSeriesIndicator(
      PERCENTAGE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );
    const expected = [null, 2.8571428571, 5.5555555556, -3.5087719298, 4.5454545455];

    expect(result.status).toBe('ok');
    result.outputs.return_pct.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value as number).toBeCloseTo(expected[index] as number, 10);
    });
    expect(PERCENTAGE_CHANGE_DEFINITION.metadata.outputs[0].unit).toBe('percent');
  });

  it('defaults to one bar and keeps two-bar warm-up aligned', () => {
    const defaults = executeTimeSeriesIndicator(PERCENTAGE_CHANGE_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);
    const explicit = executeTimeSeriesIndicator(
      PERCENTAGE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );
    const twoBars = executeTimeSeriesIndicator(
      PERCENTAGE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 2 },
      CONTEXT,
    );

    expect(defaults.outputs.return_pct).toEqual(explicit.outputs.return_pct);
    expect(twoBars.outputs.return_pct.slice(0, 2)).toEqual([null, null]);
  });

  it.each([0, -1])('returns invalid rather than Infinity for divisor %s', (divisor) => {
    const frame = cloneFiveBarFrame();
    const bars = frame.bars.map((bar, index) =>
      index === 0
        ? { ...bar, open: divisor, high: divisor, low: divisor, close: divisor }
        : bar,
    );
    const candidate: TimeSeriesFrame = { ...frame, bars };
    const result = executeTimeSeriesIndicator(
      PERCENTAGE_CHANGE_DEFINITION,
      candidate,
      { lookback: 1 },
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
    expect(result.outputs).toEqual({});
  });
});

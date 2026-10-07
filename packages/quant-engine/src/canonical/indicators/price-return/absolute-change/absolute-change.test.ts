import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { ABSOLUTE_CHANGE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-008 absolute-change', () => {
  it('returns the exact aligned one-bar price differences', () => {
    const result = executeTimeSeriesIndicator(
      ABSOLUTE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.change).toEqual([null, 3, 6, -4, 5]);
    expect(ABSOLUTE_CHANGE_DEFINITION.metadata.outputs[0]).toMatchObject({
      key: 'change',
      unit: 'price',
      placement: 'pane',
    });
  });

  it('defaults to one bar and preserves lookback warm-up alignment', () => {
    const defaults = executeTimeSeriesIndicator(ABSOLUTE_CHANGE_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);
    const explicit = executeTimeSeriesIndicator(
      ABSOLUTE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 1 },
      CONTEXT,
    );
    const twoBars = executeTimeSeriesIndicator(
      ABSOLUTE_CHANGE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 2 },
      CONTEXT,
    );

    expect(defaults.outputs.change).toEqual(explicit.outputs.change);
    expect(twoBars.outputs.change).toEqual([null, null, 9, 2, 1]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid lookback %s',
    (lookback) => {
      const result = executeTimeSeriesIndicator(
        ABSOLUTE_CHANGE_DEFINITION,
        FIVE_BAR_FRAME,
        { lookback },
        CONTEXT,
      );
      expect(result.status).toBe('invalid');
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('PARAMETER_INVALID');
    },
  );
});

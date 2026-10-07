import { describe, expect, it } from 'vitest';

import { parsePositiveSafeIntegerLookback } from '../../src/canonical/core/parameters/parse-lookback';
import { rollingMinMax } from '../../src/canonical/core/rolling/extrema';
import { rollingSum } from '../../src/canonical/core/rolling/sum';
import { rollingWeightedMean } from '../../src/canonical/core/rolling/weighted-mean';
import { lagAligned } from '../../src/canonical/core/series/lag';
import { getPriceSource } from '../../src/canonical/core/series/price-source';
import { FIVE_BAR_FRAME } from '../references/five-bar-frame';

describe('price source', () => {
  it('calculates exact OHLC-derived sources without display rounding', () => {
    const bar = FIVE_BAR_FRAME.bars[0];

    expect(getPriceSource(bar, 'open')).toBe(100);
    expect(getPriceSource(bar, 'high')).toBe(110);
    expect(getPriceSource(bar, 'low')).toBe(90);
    expect(getPriceSource(bar, 'close')).toBe(105);
    expect(getPriceSource(bar, 'hl2')).toBe(100);
    expect(getPriceSource(bar, 'hlc3')).toBeCloseTo(101.66666666666667, 14);
    expect(getPriceSource(bar, 'ohlc4')).toBe(101.25);
    expect(getPriceSource(bar, 'hlcc4')).toBe(102.5);
  });
});

describe('aligned and rolling primitives', () => {
  it('lags values without shortening or shifting the output', () => {
    expect(lagAligned([105, 108, 114, 110, 115], 2)).toEqual([
      null,
      null,
      105,
      108,
      114,
    ]);
  });

  it('returns complete-window rolling extrema with leading nulls', () => {
    expect(rollingMinMax([105, 108, 114, 110, 115], 3)).toEqual({
      minimum: [null, null, 105, 108, 110],
      maximum: [null, null, 114, 114, 115],
    });
  });

  it('returns complete-window rolling sums with leading nulls', () => {
    expect(rollingSum([1, 2, 3, 4, 5], 3)).toEqual([null, null, 6, 9, 12]);
  });

  it('computes weighted means only from complete observed windows', () => {
    expect(rollingWeightedMean([1, 2, 3, 4, 5], [1, 1, 1, 2, 2], 3)).toEqual({
      values: [null, null, 2, 3.25, 4.2],
      diagnostics: [],
    });
  });

  it('returns null plus a divide-by-zero diagnostic for a zero-weight window', () => {
    const result = rollingWeightedMean([10, 20, 30], [0, 0, 0], 3);

    expect(result.values).toEqual([null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'NUMERIC_DIVIDE_BY_ZERO',
    ]);
  });

  it('does not coerce a missing weight to authentic zero', () => {
    const result = rollingWeightedMean([10, 20, 30], [1, null, 1], 3);

    expect(result.values).toEqual([null, null, null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'DATA_FIELD_MISSING',
    ]);
  });
});

describe('positive safe-integer lookback parsing', () => {
  it('uses the explicit default only when the input is absent', () => {
    expect(parsePositiveSafeIntegerLookback(undefined, 20)).toEqual({ success: true, value: 20 });
    expect(parsePositiveSafeIntegerLookback(3, 20)).toEqual({ success: true, value: 3 });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid lookback %s',
    (value) => {
      const result = parsePositiveSafeIntegerLookback(value, 20);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
          'PARAMETER_INVALID',
        ]);
      }
    },
  );
});

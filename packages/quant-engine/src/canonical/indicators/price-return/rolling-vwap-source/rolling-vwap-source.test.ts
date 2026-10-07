import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { ROLLING_VWAP_SOURCE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

function withVolumes(volumes: readonly (number | null)[]): TimeSeriesFrame {
  const frame = cloneFiveBarFrame();
  const observedCount = volumes.filter((value) => value !== null).length;
  const missingCount = volumes.length - observedCount;
  return {
    ...frame,
    meta: {
      ...frame.meta,
      fields: {
        ...frame.meta.fields,
        volume: {
          coverage: observedCount === 0 ? 'unavailable' : missingCount === 0 ? 'observed' : 'partial',
          observedCount,
          missingCount,
        },
      },
    },
    bars: frame.bars.map((bar, index) => ({ ...bar, volume: volumes[index] })),
  };
}

describe('PRC-020 rolling-vwap-source', () => {
  it('returns exact unrounded HLC3 rolling VWAP values', () => {
    const result = executeTimeSeriesIndicator(
      ROLLING_VWAP_SOURCE_DEFINITION,
      FIVE_BAR_FRAME,
      { lookback: 3, source: 'hlc3' },
      CONTEXT,
    );
    const expected = [null, null, 106.2888888889, 110.2, 112.09375];

    expect(result.status).toBe('ok');
    result.outputs.rolling_vwap.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value as number).toBeCloseTo(expected[index] as number, 10);
    });
  });

  it('defaults to HLC3 with lookback 20 and rejects unknown sources', () => {
    expect(ROLLING_VWAP_SOURCE_DEFINITION.parseParameters({})).toEqual({
      success: true,
      value: { lookback: 20, source: 'hlc3' },
    });
    expect(
      executeTimeSeriesIndicator(
        ROLLING_VWAP_SOURCE_DEFINITION,
        FIVE_BAR_FRAME,
        { source: 'typical-ish' },
        CONTEXT,
      ).status,
    ).toBe('invalid');
  });

  it.each([
    { label: 'unavailable', volumes: [null, null, null, null, null] },
    { label: 'partial', volumes: [1000, null, 800, 1500, 900] },
  ])('returns unavailable for $label volume coverage', ({ volumes }) => {
    const result = executeTimeSeriesIndicator(
      ROLLING_VWAP_SOURCE_DEFINITION,
      withVolumes(volumes),
      { lookback: 3, source: 'hlc3' },
      CONTEXT,
    );

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('DATA_FIELD_MISSING');
    expect(result.outputs).toEqual({});
  });

  it('preserves authentic zero weight without treating it as missing', () => {
    const result = executeTimeSeriesIndicator(
      ROLLING_VWAP_SOURCE_DEFINITION,
      withVolumes([0, 1200, 800, 1500, 900]),
      { lookback: 3, source: 'hlc3' },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.rolling_vwap[2] as number).toBeCloseTo(108.6, 10);
    expect(result.diagnostics).toEqual([]);
  });

  it('returns null plus a diagnostic when a complete window has zero total volume', () => {
    const result = executeTimeSeriesIndicator(
      ROLLING_VWAP_SOURCE_DEFINITION,
      withVolumes([0, 0, 0, 1500, 900]),
      { lookback: 3, source: 'hlc3' },
      CONTEXT,
    );

    expect(result.status).toBe('ok');
    expect(result.outputs.rolling_vwap[2]).toBeNull();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'NUMERIC_DIVIDE_BY_ZERO',
    );
  });
});

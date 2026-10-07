import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { HIGH_LOW_RANGE_PERCENTAGE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-014 high-low-range-percentage', () => {
  it('returns exact ranges relative to close', () => {
    const result = executeTimeSeriesIndicator(
      HIGH_LOW_RANGE_PERCENTAGE_DEFINITION,
      FIVE_BAR_FRAME,
      {},
      CONTEXT,
    );
    const expected = [19.0476190476, 10.1851851852, 9.649122807, 8.1818181818, 7.8260869565];

    expect(result.status).toBe('ok');
    result.outputs.range_pct.forEach((value, index) =>
      expect(value as number).toBeCloseTo(expected[index], 10),
    );
  });

  it('rejects a non-positive close divisor', () => {
    const frame = cloneFiveBarFrame();
    const candidate: TimeSeriesFrame = {
      ...frame,
      bars: frame.bars.map((bar, index) =>
        index === 2 ? { ...bar, open: 5, high: 10, low: 0, close: 0 } : bar,
      ),
    };
    const result = executeTimeSeriesIndicator(
      HIGH_LOW_RANGE_PERCENTAGE_DEFINITION,
      candidate,
      {},
      CONTEXT,
    );

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
  });
});

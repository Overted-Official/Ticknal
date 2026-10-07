import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { GAP_PERCENTAGE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-012 gap-percentage', () => {
  it('returns exact gaps and sign-derived directions', () => {
    const result = executeTimeSeriesIndicator(GAP_PERCENTAGE_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);
    const expected = [null, 0.9523809524, -0.9259259259, -0.8771929825, 0.9090909091];

    expect(result.status).toBe('ok');
    result.outputs.gap_pct.forEach((value, index) => {
      if (expected[index] === null) expect(value).toBeNull();
      else expect(value as number).toBeCloseTo(expected[index] as number, 10);
    });
    expect(result.outputs.direction).toEqual([null, 'up', 'down', 'down', 'up']);
  });

  it('rejects a non-positive previous close', () => {
    const frame = cloneFiveBarFrame();
    const candidate: TimeSeriesFrame = {
      ...frame,
      bars: frame.bars.map((bar, index) =>
        index === 0 ? { ...bar, open: 0, high: 0, low: 0, close: 0 } : bar,
      ),
    };
    const result = executeTimeSeriesIndicator(GAP_PERCENTAGE_DEFINITION, candidate, {}, CONTEXT);

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
  });
});

import { describe, expect, it } from 'vitest';

import type { TimeSeriesFrame } from '../../../contracts';
import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { cloneFiveBarFrame, FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { INTRABAR_RETURN_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-013 intrabar-return', () => {
  it('returns exact open-to-close percentage changes', () => {
    const result = executeTimeSeriesIndicator(INTRABAR_RETURN_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);
    const expected = [5, 1.8867924528, 6.5420560748, -2.6548672566, 3.6036036036];

    expect(result.status).toBe('ok');
    result.outputs.body_return_pct.forEach((value, index) =>
      expect(value as number).toBeCloseTo(expected[index], 10),
    );
  });

  it('rejects a non-positive open divisor', () => {
    const frame = cloneFiveBarFrame();
    const candidate: TimeSeriesFrame = {
      ...frame,
      bars: frame.bars.map((bar, index) =>
        index === 1 ? { ...bar, open: 0, low: 0 } : bar,
      ),
    };
    const result = executeTimeSeriesIndicator(INTRABAR_RETURN_DEFINITION, candidate, {}, CONTEXT);

    expect(result.status).toBe('invalid');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('NUMERIC_DOMAIN_ERROR');
  });
});

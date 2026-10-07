import { describe, expect, it } from 'vitest';

import { executeTimeSeriesIndicator } from '../../../execution/execute-time-series-indicator';
import { FIVE_BAR_FRAME } from '../../../../../test/references/five-bar-frame';
import { TRUE_RANGE_DEFINITION } from './definition';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;

describe('PRC-015 true-range', () => {
  it('uses bar range first and gap-adjusted range thereafter', () => {
    const result = executeTimeSeriesIndicator(TRUE_RANGE_DEFINITION, FIVE_BAR_FRAME, {}, CONTEXT);

    expect(result.status).toBe('ok');
    expect(result.outputs.true_range).toEqual([20, 11, 11, 9, 9]);
    expect(TRUE_RANGE_DEFINITION.metadata.outputs[0]).toMatchObject({
      unit: 'price',
      placement: 'pane',
      nullable: false,
    });
  });
});

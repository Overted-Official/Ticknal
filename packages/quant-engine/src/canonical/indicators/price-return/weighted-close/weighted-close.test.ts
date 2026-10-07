import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { WEIGHTED_CLOSE_DEFINITION } from './definition';

describe('PRC-007 weighted-close', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      WEIGHTED_CLOSE_DEFINITION,
      {"hlcc4":[102.5,107.25,111.75,111.75,113.25]},
      { backlogId: 'PRC-007', id: 'weighted-close' },
    );
  });
});

import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { HIGH_LOW_DEFINITION } from './definition';

describe('PRC-003 high-low', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      HIGH_LOW_DEFINITION,
      {"high":[110,112,115,118,116],"low":[90,101,104,109,107],"range":[20,11,11,9,9]},
      { backlogId: 'PRC-003', id: 'high-low' },
    );
  });
});

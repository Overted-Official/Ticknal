import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { CLOSE_PRICE_DEFINITION } from './definition';

describe('PRC-001 close-price', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      CLOSE_PRICE_DEFINITION,
      {"close":[105,108,114,110,115]},
      { backlogId: 'PRC-001', id: 'close-price' },
    );
  });
});

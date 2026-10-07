import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { HLC3_TYPICAL_PRICE_DEFINITION } from './definition';

describe('PRC-005 hlc3-typical-price', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      HLC3_TYPICAL_PRICE_DEFINITION,
      {"hlc3":[101.6666666667,107,111,112.3333333333,112.6666666667]},
      { backlogId: 'PRC-005', id: 'hlc3-typical-price' },
    );
  });
});

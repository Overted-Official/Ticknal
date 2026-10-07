import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { OHLC4_AVERAGE_PRICE_DEFINITION } from './definition';

describe('PRC-006 ohlc4-average-price', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      OHLC4_AVERAGE_PRICE_DEFINITION,
      {"ohlc4":[101.25,106.75,110,112.5,112.25]},
      { backlogId: 'PRC-006', id: 'ohlc4-average-price' },
    );
  });
});

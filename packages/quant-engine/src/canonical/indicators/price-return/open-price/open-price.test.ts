import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { OPEN_PRICE_DEFINITION } from './definition';

describe('PRC-002 open-price', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      OPEN_PRICE_DEFINITION,
      {"open":[100,106,107,113,111]},
      { backlogId: 'PRC-002', id: 'open-price' },
    );
  });
});

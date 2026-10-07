import { describe, it } from 'vitest';

import { assertPriceSourceIndicator } from '../../../../../test/references/assert-price-source-indicator';
import { HL2_MEDIAN_PRICE_DEFINITION } from './definition';

describe('PRC-004 hl2-median-price', () => {
  it('publishes exact aligned values and remains prefix-stable', () => {
    assertPriceSourceIndicator(
      HL2_MEDIAN_PRICE_DEFINITION,
      {"hl2":[100,106.5,109.5,113.5,111.5]},
      { backlogId: 'PRC-004', id: 'hl2-median-price' },
    );
  });
});

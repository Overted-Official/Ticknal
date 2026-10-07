import { describe, expect, it } from 'vitest';

import { supportsLongOnlyPortfolioValuation } from './portfolio-position-support';

describe('portfolio position support', () => {
  it('accepts positive long holdings and rejects short exposure instead of valuing it as long', () => {
    expect(supportsLongOnlyPortfolioValuation([
      { side: 'LONG', quantity: '10' },
      { side: 'long', quantity: 4 },
    ])).toBe(true);
    expect(supportsLongOnlyPortfolioValuation([
      { side: 'SHORT', quantity: '10' },
    ])).toBe(false);
  });

  it('rejects non-positive or non-finite quantities', () => {
    expect(supportsLongOnlyPortfolioValuation([{ side: 'LONG', quantity: 0 }])).toBe(false);
    expect(supportsLongOnlyPortfolioValuation([{ side: 'LONG', quantity: 'invalid' }])).toBe(false);
  });
});

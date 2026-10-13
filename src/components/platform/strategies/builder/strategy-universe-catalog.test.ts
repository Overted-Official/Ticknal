import { describe, expect, it } from 'vitest';

import { buildStrategyCompanyUniverse } from './strategy-universe-catalog';

describe('buildStrategyCompanyUniverse', () => {
  it('keeps every EGX company while excluding indices, funds and duplicate symbols', () => {
    const companies = Array.from({ length: 290 }, (_, index) => ({
      symbol: `EGX${index}`, exchange: 'EGX', sector: 'Banks', industryGroup: 'Commercial Banks',
      companyName: `Company ${index}`, logoUrl: null,
    }));
    const universe = buildStrategyCompanyUniverse([
      ...companies, companies[0],
      { symbol: 'EGX30', exchange: 'EGX', sector: 'Indices', industryGroup: null, companyName: 'Index', logoUrl: null },
      { symbol: 'FUND', exchange: 'EGX', sector: 'Funds', industryGroup: null, companyName: 'Fund', logoUrl: null },
      { symbol: 'FOREIGN', exchange: 'OTHER', sector: 'Banks', industryGroup: null, companyName: 'Foreign', logoUrl: null },
    ]);

    expect(universe).toHaveLength(290);
    expect(universe[0]).toMatchObject({ symbol: 'EGX0', name: 'Company 0', group: 'Commercial Banks' });
  });
});

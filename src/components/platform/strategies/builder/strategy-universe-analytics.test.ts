import { describe, expect, it } from 'vitest';

import { summarizeUniverseBacktest } from './strategy-universe-analytics';

describe('summarizeUniverseBacktest', () => {
  it('groups calculated companies by the live EGX catalogue, not the preview fixture', () => {
    const universe = [
      { symbol: 'NEW1', name: 'New Bank', group: 'Banks', logoUrl: null },
      { symbol: 'NEW2', name: 'New Telecom', group: 'Telecom', logoUrl: null },
    ];
    const results = universe.map(({ symbol }) => ({ symbol, status: 'unavailable' as const, code: 'NO_HISTORY' }));

    const summary = summarizeUniverseBacktest(results, universe);

    expect(summary.groups.map((group) => [group.name, group.selected])).toEqual([['Banks', 1], ['Telecom', 1]]);
  });
});

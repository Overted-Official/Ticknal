import { describe, expect, it } from 'vitest';
import { createUniverseResultCache } from '../../src/components/platform/strategies/builder/strategy-universe-cache';

describe('universe result cache', () => {
  it('keeps paused work after completed results expire', () => {
    const cache = createUniverseResultCache(5 * 60_000);
    const partial = [{ symbol: 'COMI', status: 'unavailable' as const, code: 'NO_DATA' }];
    cache.setPartial('paused', partial, 297, 1_000);
    cache.set('complete', { status: 'ready', results: partial }, 1_000);

    expect(cache.get('paused', 1_000 + 6 * 60_000)).toMatchObject({ completed: 1, total: 297 });
    expect(cache.get('complete', 1_000 + 6 * 60_000)).toBeNull();
  });
});

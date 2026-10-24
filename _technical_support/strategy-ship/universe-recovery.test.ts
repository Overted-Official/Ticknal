import { describe, expect, it } from 'vitest';
import { runUniverseBatches } from '../../src/components/platform/strategies/builder/strategy-universe-batches';

describe('full-universe recovery', () => {
  it('retains successful results when a later bounded batch fails', async () => {
    const symbols = Array.from({ length: 25 }, (_, index) => `EGX${index}`);
    let requests = 0;
    const result = await runUniverseBatches(symbols, async (batch) => {
      requests += 1;
      return requests === 2 ? { status: 'error' } : { status: 'ready', results: batch.map((symbol) => ({ symbol, status: 'unavailable', code: 'NO_HISTORY' })) };
    }, new AbortController().signal, () => {});
    expect(result.status).toBe('error');
    expect(result.results).toHaveLength(12);
    expect(result.results[0].symbol).toBe('EGX0');
    expect(requests).toBe(2);
  });
});

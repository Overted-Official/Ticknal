import { describe, expect, it } from 'vitest';

import { chunkUniverseSymbols, runUniverseBatches } from './strategy-universe-batches';

describe('chunkUniverseSymbols', () => {
  it('covers a 290-company universe without sending more than 12 companies per request', () => {
    const symbols = Array.from({ length: 290 }, (_, index) => `EGX${index}`);
    const batches = chunkUniverseSymbols(symbols);

    expect(batches).toHaveLength(25);
    expect(batches.every((batch) => batch.length > 0 && batch.length <= 12)).toBe(true);
    expect(batches.flat()).toEqual(symbols);
  });
});

describe('runUniverseBatches', () => {
  it('runs one bounded batch at a time and reports cumulative progress', async () => {
    const symbols = Array.from({ length: 25 }, (_, index) => `EGX${index}`);
    const calls: string[][] = [];
    const progress: number[] = [];
    const result = await runUniverseBatches(symbols, async (batch) => {
      calls.push([...batch]);
      return { status: 'ready' as const, results: batch.map((symbol) => ({ symbol, status: 'unavailable' as const, code: 'NO_HISTORY' })) };
    }, new AbortController().signal, (completed) => progress.push(completed));

    expect(calls.map((batch) => batch.length)).toEqual([12, 12, 1]);
    expect(progress).toEqual([12, 24, 25]);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.results.map((item) => item.symbol)).toEqual(symbols);
  });
});

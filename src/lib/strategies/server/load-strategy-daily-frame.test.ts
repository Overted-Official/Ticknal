import { describe, expect, it, vi } from 'vitest';

const source = vi.hoisted(() => vi.fn(async ({ symbol }: { symbol: string; timeframe: string }) => ({
  status: 'unavailable' as const,
  diagnostics: [{ code: symbol, messageKey: 'test.frame.unavailable', fields: {} }],
})));

vi.mock('../../indicators/server/load-live-time-series-frame', () => ({
  loadLiveTimeSeriesFrame: source,
}));

vi.mock('next/cache', () => {
  const entries = new Map<string, unknown>();
  return {
    unstable_cache: (read: (symbol: string) => Promise<unknown>) => async (symbol: string) => {
      if (entries.has(symbol)) return entries.get(symbol);
      const value = await read(symbol);
      entries.set(symbol, value);
      return value;
    },
  };
});

import { loadStrategyDailyFrame } from './load-strategy-daily-frame';

describe('loadStrategyDailyFrame', () => {
  it('reuses one symbol snapshot across sequential strategy requests', async () => {
    const first = await loadStrategyDailyFrame(' comi ');
    const second = await loadStrategyDailyFrame('COMI');

    expect(first).toEqual(second);
    expect(source).toHaveBeenCalledExactlyOnceWith({ symbol: 'COMI', timeframe: 'D' });
  });

  it('uses a separate snapshot per symbol and rejects invalid symbols', async () => {
    const hrho = await loadStrategyDailyFrame('HRHO');
    expect(hrho).toMatchObject({ diagnostics: [{ code: 'HRHO' }] });
    await expect(loadStrategyDailyFrame('../COMI')).rejects.toThrow('Invalid strategy symbol');
    expect(source).toHaveBeenCalledTimes(2);
  });
});

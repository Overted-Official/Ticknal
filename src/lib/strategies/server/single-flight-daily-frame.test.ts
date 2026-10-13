import { describe, expect, it, vi } from 'vitest';

import { createSingleFlightDailyFrameLoader } from './single-flight-daily-frame';

describe('createSingleFlightDailyFrameLoader', () => {
  it('coalesces simultaneous requests for one normalized symbol', async () => {
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => { release = resolve; });
    const source = vi.fn(async (_symbol: string) => pending);
    const load = createSingleFlightDailyFrameLoader(source);

    const first = load(' comi ');
    const second = load('COMI');
    expect(source).toHaveBeenCalledOnce();
    expect(source).toHaveBeenCalledWith('COMI');

    release('revision-1');
    expect(await Promise.all([first, second])).toEqual(['revision-1', 'revision-1']);
    expect(await load('COMI')).toBe('revision-1');
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('does not let one symbol block another', async () => {
    const source = vi.fn(async (symbol: string) => symbol);
    const load = createSingleFlightDailyFrameLoader(source);

    expect(await Promise.all([load('COMI'), load('HRHO')])).toEqual(['COMI', 'HRHO']);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('clears failed requests so the next request can retry', async () => {
    const source = vi.fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce('revision-2');
    const load = createSingleFlightDailyFrameLoader(source);

    await expect(load('COMI')).rejects.toThrow('database unavailable');
    await expect(load('COMI')).resolves.toBe('revision-2');
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid symbols before any source read', async () => {
    const source = vi.fn(async (symbol: string) => symbol);
    const load = createSingleFlightDailyFrameLoader(source);

    await expect(load('COMI/../../all')).rejects.toThrow('Invalid strategy symbol');
    expect(source).not.toHaveBeenCalled();
  });
});

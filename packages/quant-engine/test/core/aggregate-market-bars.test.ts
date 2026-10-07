import { describe, expect, it } from 'vitest';

import { aggregateMarketBars } from '../../src/canonical/core/aggregation/aggregate-market-bars';
import type { MarketBar, TimeSeriesFrame } from '../../src/canonical/contracts';
import { FIVE_BAR_META } from '../references/five-bar-frame';

function frame(bars: readonly MarketBar[]): TimeSeriesFrame {
  const observedVolume = bars.filter((bar) => bar.volume !== null).length;
  const observedTrades = bars.filter((bar) => bar.trades !== null).length;

  return {
    domain: 'time-series',
    meta: {
      ...FIVE_BAR_META,
      sourceId: 'daily-prices',
      sourceRevision: 'sha256:daily-fixture',
      asOf: '2026-02-02T15:00:00.000Z',
      adjustmentMode: 'as-stored',
      fields: {
        open: { coverage: 'observed', observedCount: bars.length, missingCount: 0 },
        high: { coverage: 'observed', observedCount: bars.length, missingCount: 0 },
        low: { coverage: 'observed', observedCount: bars.length, missingCount: 0 },
        close: { coverage: 'observed', observedCount: bars.length, missingCount: 0 },
        volume: {
          coverage: observedVolume === bars.length ? 'observed' : observedVolume === 0 ? 'unavailable' : 'partial',
          observedCount: observedVolume,
          missingCount: bars.length - observedVolume,
        },
        trades: {
          coverage: observedTrades === bars.length ? 'observed' : observedTrades === 0 ? 'unavailable' : 'partial',
          observedCount: observedTrades,
          missingCount: bars.length - observedTrades,
        },
      },
    },
    bars,
  };
}

function bar(
  time: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number | null,
  finality: 'final' | 'provisional' = 'final',
): MarketBar {
  return { time, open, high, low, close, volume, trades: null, finality };
}

describe('aggregateMarketBars', () => {
  it('groups Cairo daily bars into Sunday-through-Saturday weeks using OHLC rules', () => {
    const result = aggregateMarketBars(
      frame([
        bar('2026-01-04', 10, 12, 9, 11, 100),
        bar('2026-01-08', 11, 15, 8, 14, 200),
        bar('2026-01-10', 14, 16, 13, 15, 300),
        bar('2026-01-11', 20, 21, 18, 19, 400),
      ]),
      'W',
    );

    expect(result.meta.requestedTimeframe).toBe('W');
    expect(result.meta.effectiveTimeframe).toBe('W');
    expect(result.bars).toEqual([
      bar('2026-01-04', 10, 16, 8, 15, 600),
      bar('2026-01-11', 20, 21, 18, 19, 400),
    ]);
    expect(result.meta.transformations.at(-1)).toEqual({
      kind: 'aggregation',
      description: 'Aggregated Africa/Cairo daily observations into Sunday-through-Saturday weekly bars.',
      fromTimeframe: 'D',
      toTimeframe: 'W',
    });
  });

  it('groups daily bars by Cairo calendar month', () => {
    const result = aggregateMarketBars(
      frame([
        bar('2026-01-04', 10, 12, 9, 11, 100),
        bar('2026-01-29', 11, 15, 8, 14, 200),
        bar('2026-02-01', 20, 21, 18, 19, 400),
        bar('2026-02-02', 19, 24, 17, 23, 500),
      ]),
      'M',
    );

    expect(result.bars).toEqual([
      bar('2026-01-01', 10, 15, 8, 14, 300),
      bar('2026-02-01', 20, 24, 17, 23, 900),
    ]);
  });

  it('does not invent aggregate volume when any source observation is missing it', () => {
    const result = aggregateMarketBars(
      frame([
        bar('2026-01-04', 10, 12, 9, 11, 100),
        bar('2026-01-05', 11, 13, 10, 12, null),
      ]),
      'W',
    );

    expect(result.bars[0]?.volume).toBeNull();
    expect(result.meta.fields.volume).toEqual({
      coverage: 'unavailable',
      observedCount: 0,
      missingCount: 1,
    });
  });

  it('marks an aggregate provisional when any source observation is provisional', () => {
    const result = aggregateMarketBars(
      frame([
        bar('2026-01-04', 10, 12, 9, 11, 100),
        bar('2026-01-05', 11, 13, 10, 12, 200, 'provisional'),
      ]),
      'W',
    );

    expect(result.bars[0]?.finality).toBe('provisional');
    expect(result.meta.sessionCompleteness).toBe('partial');
  });
});

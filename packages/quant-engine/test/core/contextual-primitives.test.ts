import { describe, expect, it } from 'vitest';

import type { CompletedTrade, NumericSeriesFrame } from '../../src/canonical/contracts';
import {
  alignFrameCloses,
  alignNumericSeries,
} from '../../src/canonical/core/alignment/align-series';
import {
  linearFit,
  rollingPairStatistic,
  simpleReturns,
} from '../../src/canonical/core/contextual/pair-statistics';
import {
  normalizeWeights,
  portfolioCovariance,
} from '../../src/canonical/core/contextual/portfolio-statistics';
import { summarizeCompletedTrades } from '../../src/canonical/core/contextual/trade-statistics';
import { FIVE_BAR_FRAME } from '../references/five-bar-frame';

function numericSeries(points: NumericSeriesFrame['points']): NumericSeriesFrame {
  return {
    domain: 'numeric-series',
    role: 'comparison',
    unit: 'price',
    points,
    provenance: {
      sourceId: 'fixture',
      sourceType: 'test',
      sourceRevision: 'v1',
      asOf: '2026-01-08T12:00:00.000Z',
      receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

function trade(overrides: Partial<CompletedTrade>): CompletedTrade {
  return {
    id: 'trade-1',
    symbol: 'COMI',
    side: 'long',
    entryTime: '2026-01-01',
    exitTime: '2026-01-02',
    entryPrice: 100,
    exitPrice: 110,
    quantity: 1,
    fees: 0,
    realizedPnl: 10,
    realizedReturn: 0.1,
    maximumAdverseExcursion: -0.02,
    maximumFavorableExcursion: 0.12,
    ...overrides,
  };
}

describe('timestamp alignment', () => {
  it('aligns only exact timestamps and leaves gaps null without future fill', () => {
    const result = alignNumericSeries(
      ['2026-01-01', '2026-01-02', '2026-01-03'],
      numericSeries([
        { time: '2026-01-02', value: 20 },
        { time: '2026-01-03', value: 30 },
      ]),
    );

    expect(result.values).toEqual([null, 20, 30]);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects duplicate supplemental timestamps instead of choosing one', () => {
    const result = alignNumericSeries(
      ['2026-01-01'],
      numericSeries([
        { time: '2026-01-01', value: 10 },
        { time: '2026-01-01', value: 11 },
      ]),
    );

    expect(result.values).toEqual([null]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'INPUT_DUPLICATE_TIMESTAMP',
    ]);
  });

  it('aligns primary closes and comparison values to the primary frame', () => {
    const result = alignFrameCloses(
      FIVE_BAR_FRAME,
      numericSeries([
        { time: '2026-01-05', value: 200 },
        { time: '2026-01-07', value: 220 },
      ]),
    );

    expect(result.primary).toEqual([105, 108, 114, 110, 115]);
    expect(result.comparison).toEqual([null, 200, null, 220, null]);
  });
});

describe('pair statistics', () => {
  it('computes aligned simple returns without crossing a missing observation or zero denominator', () => {
    expect(simpleReturns([100, 110, null, 121, 0, 10])).toEqual([
      null,
      0.1,
      null,
      null,
      -1,
      null,
    ]);
  });

  it('computes a rolling statistic only from complete paired windows', () => {
    const result = rollingPairStatistic(
      [1, 2, 3, 4],
      [2, 4, 6, 8],
      3,
      (left, right) => left.reduce((sum, value, index) => sum + value * right[index]!, 0),
    );

    expect(result).toEqual([null, null, 28, 58]);
  });

  it('fits y = 2x + 1 and rejects a constant independent series', () => {
    expect(linearFit([3, 5, 7], [1, 2, 3])).toEqual({
      slope: 2,
      intercept: 1,
      rSquared: 1,
    });
    expect(linearFit([1, 2, 3], [4, 4, 4])).toBeNull();
  });
});

describe('completed trade statistics', () => {
  it('summarizes a mixed ledger from literal realized outcomes', () => {
    const result = summarizeCompletedTrades([
      trade({ id: 'win', realizedPnl: 30, realizedReturn: 0.3 }),
      trade({ id: 'loss', realizedPnl: -10, realizedReturn: -0.1 }),
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.summary).toEqual({
      tradeCount: 2,
      winCount: 1,
      lossCount: 1,
      grossProfit: 30,
      grossLoss: 10,
      netProfit: 20,
      winRate: 0.5,
      averageWin: 30,
      averageLoss: 10,
      expectancy: 10,
      profitFactor: 3,
      payoffRatio: 3,
    });
  });

  it('returns neutral finite values for an empty ledger and flags invalid chronology', () => {
    expect(summarizeCompletedTrades([]).summary).toEqual({
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      expectancy: 0,
      profitFactor: null,
      payoffRatio: null,
    });
    expect(summarizeCompletedTrades([
      trade({ entryTime: '2026-01-03', exitTime: '2026-01-02' }),
    ]).diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'INPUT_TIMESTAMP_ORDER',
    ]);
  });
});

describe('portfolio statistics', () => {
  it('normalizes positive market values and rejects non-positive totals', () => {
    expect(normalizeWeights([60, 40])).toEqual([0.6, 0.4]);
    expect(normalizeWeights([0, 0])).toBeNull();
    expect(normalizeWeights([10, -1])).toBeNull();
  });

  it('returns a stable singular covariance matrix for perfectly collinear assets', () => {
    const matrix = portfolioCovariance([
      [0.1, 0.2, 0.3],
      [0.2, 0.4, 0.6],
    ]);

    expect(matrix?.[0]?.[0]).toBeCloseTo(0.006666666666666665, 14);
    expect(matrix?.[0]?.[1]).toBeCloseTo(0.01333333333333333, 14);
    expect(matrix?.[1]?.[1]).toBeCloseTo(0.02666666666666666, 14);
  });

  it('rejects arrays that have no complete aligned observations', () => {
    expect(portfolioCovariance([[0.1, null], [null, 0.2]])).toBeNull();
  });
});

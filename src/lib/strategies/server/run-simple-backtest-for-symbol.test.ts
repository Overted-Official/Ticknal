import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketBar, TimeSeriesFrame } from '@ticknal/quant-engine/canonical';

import type { SimpleStrategyProgram } from '../strategy-program';

const loadFrame = vi.hoisted(() => vi.fn());
vi.mock('./load-strategy-daily-frame', () => ({ loadStrategyDailyFrame: loadFrame }));

import { runSimpleBacktestForSymbol } from './run-simple-backtest-for-symbol';

const program: SimpleStrategyProgram = {
  schemaVersion: 1,
  timeframe: 'D',
  inputs: [{ id: 'sma', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 2 } }],
  buy: [[{ id: 'buy', inputId: 'sma', operator: 'crossesAbove', threshold: 10.5 }]],
  sell: [[{ id: 'sell', inputId: 'sma', operator: 'crossesBelow', threshold: 10 }]],
};

function completedFrame(): TimeSeriesFrame {
  const bars: MarketBar[] = [10, 10, 12].map((price, index) => ({
    time: `2025-01-0${index + 1}`, open: price, high: price, low: price, close: price,
    volume: 1000, trades: null, finality: 'final',
  }));
  const observed = { coverage: 'observed' as const, observedCount: 3, missingCount: 0 };
  const missing = { coverage: 'unavailable' as const, observedCount: 0, missingCount: 3 };
  return {
    domain: 'time-series',
    meta: {
      instrumentId: 'COMI', symbol: 'COMI', exchange: 'EGX', assetClass: 'equity', quoteCurrency: 'EGP',
      requestedTimeframe: 'D', effectiveTimeframe: 'D', sourceId: 'postgres:daily_prices', sourceType: 'postgresql-table',
      sourceRevision: 'sha256:fixed-test-revision', asOf: '2025-01-03', receivedAt: '2025-01-04T00:00:00Z',
      timezone: 'Africa/Cairo', exchangeCalendar: 'EGX_SUN_THU', sessionDefinition: 'stored-completed-bars',
      adjustmentMode: 'as-stored', adjustmentRevision: null, sessionCompleteness: 'complete',
      continuityStatus: 'unknown',
      fields: { open: observed, high: observed, low: observed, close: observed, volume: observed, trades: missing },
      transformations: [],
    },
    bars,
  };
}

describe('runSimpleBacktestForSymbol', () => {
  beforeEach(() => loadFrame.mockReset());

  it('runs against the shared daily frame and preserves its source revision', async () => {
    loadFrame.mockResolvedValue({ status: 'ok', frame: completedFrame() });

    const result = await runSimpleBacktestForSymbol('COMI', program, { initialCapital: 1000, feeBps: 0 });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.provenance.sourceRevision).toBe('sha256:fixed-test-revision');
    expect(result.equity).toHaveLength(3);
    expect(loadFrame).toHaveBeenCalledExactlyOnceWith('COMI');
  });

  it('returns missing-history diagnostics without running a backtest', async () => {
    const diagnostics = [{ code: 'DATA_FIELD_MISSING', messageKey: 'historyUnavailable', fields: { symbol: 'COMI' } }];
    loadFrame.mockResolvedValue({ status: 'unavailable', diagnostics });

    const result = await runSimpleBacktestForSymbol('COMI', program, { initialCapital: 1000, feeBps: 0 });

    expect(result).toEqual({ status: 'unavailable', code: 'HISTORY_UNAVAILABLE', diagnostics });
  });

  it('applies the requested period while preserving indicator warm-up bars', async () => {
    loadFrame.mockResolvedValue({ status: 'ok', frame: completedFrame() });

    const result = await runSimpleBacktestForSymbol('COMI', program, { initialCapital: 1000, feeBps: 0 }, {
      startDate: '2025-01-03', endDate: '2025-01-03',
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.equity.map((point) => point.time)).toEqual(['2025-01-03']);
  });
});

import { describe, expect, it } from 'vitest';
import type { MarketBar, TimeSeriesFrame } from '@ticknal/quant-engine/canonical';

import type { SimpleStrategyProgram } from './strategy-program';
import { runSimpleBacktest } from './run-simple-backtest';

const prices = [
  { open: 10, high: 10, low: 10, close: 10 },
  { open: 10, high: 10, low: 10, close: 10 },
  { open: 10, high: 12, low: 10, close: 12 },
  { open: 13, high: 13, low: 12, close: 12 },
  { open: 12, high: 12, low: 8, close: 8 },
  { open: 7, high: 8, low: 7, close: 8 },
] as const;

function frame(rows: readonly { open: number; high: number; low: number; close: number }[]): TimeSeriesFrame {
  const bars: MarketBar[] = rows.map((row, index) => ({
    time: `2025-01-${String(index + 1).padStart(2, '0')}`,
    ...row,
    volume: 1000,
    trades: 10,
    finality: 'final',
  }));
  const observed = { coverage: 'observed' as const, observedCount: bars.length, missingCount: 0 };
  return {
    domain: 'time-series',
    meta: {
      instrumentId: 'TEST', symbol: 'TEST', exchange: 'EGX', assetClass: 'equity', quoteCurrency: 'EGP',
      requestedTimeframe: 'D', effectiveTimeframe: 'D', sourceId: 'test-snapshot', sourceType: 'fixture',
      sourceRevision: 'revision-1', asOf: String(bars.at(-1)?.time), receivedAt: '2025-01-07T00:00:00Z',
      timezone: 'Africa/Cairo', exchangeCalendar: 'EGX_SUN_THU', sessionDefinition: 'completed-bars',
      adjustmentMode: 'as-stored', adjustmentRevision: null, sessionCompleteness: 'complete',
      continuityStatus: 'unknown', fields: { open: observed, high: observed, low: observed, close: observed, volume: observed, trades: observed },
      transformations: [],
    },
    bars,
  };
}

const program: SimpleStrategyProgram = {
  schemaVersion: 1,
  timeframe: 'D',
  inputs: [{ id: 'sma', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 2 } }],
  buy: [[{ id: 'buy', inputId: 'sma', operator: 'crossesAbove', threshold: 10.5 }]],
  sell: [[{ id: 'sell', inputId: 'sma', operator: 'crossesBelow', threshold: 11 }]],
};

const assumptions = { initialCapital: 1000, feeBps: 0 } as const;

describe('runSimpleBacktest', () => {
  it('fills close-bar signals at the next open without looking ahead', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      entrySignalTime: '2025-01-03', entryTime: '2025-01-04', entryPrice: 13,
      exitSignalTime: '2025-01-05', exitTime: '2025-01-06', exitPrice: 7,
    });
    expect(result.trades[0].returnPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.trades[0].maePct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.metrics.totalReturnPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.metrics.maxDrawdownPct).toBeCloseTo((7 / 13 - 1) * 100, 8);
    expect(result.provenance).toMatchObject({ sourceRevision: 'revision-1', formulaVersions: { 'simple-moving-average': '1.0.0' } });
  });

  it('does not fill a signal from the final session without a next open', () => {
    const result = runSimpleBacktest(program, frame(prices.slice(0, 3)), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toEqual([]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBe(0);
  });

  it('charges explicit entry and exit fees', () => {
    const result = runSimpleBacktest(program, frame(prices), { initialCapital: 1000, feeBps: 100 });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.metrics.totalReturnPct).toBeCloseTo(((7 * 0.99) / (13 * 1.01) - 1) * 100, 8);
  });

  it('honors OR branches while requiring every predicate in an AND branch', () => {
    const impossible = { id: 'impossible', inputId: 'sma', operator: 'crossesAbove' as const, threshold: 999 };
    const signal = program.buy[0][0];
    const blocked = runSimpleBacktest({ ...program, buy: [[impossible, signal]] }, frame(prices), assumptions);
    const allowed = runSimpleBacktest({ ...program, buy: [[impossible], [signal]] }, frame(prices), assumptions);
    expect(blocked.status).toBe('ok');
    expect(allowed.status).toBe('ok');
    if (blocked.status !== 'ok' || allowed.status !== 'ok') return;
    expect(blocked.trades).toHaveLength(0);
    expect(allowed.trades).toHaveLength(1);
  });

  it('rejects an indicator formula revision that differs from the compiled program', () => {
    const result = runSimpleBacktest({ ...program, inputs: [{ ...program.inputs[0], formulaVersion: '0.9.0' }] }, frame(prices), assumptions);
    expect(result).toMatchObject({ status: 'invalid', code: 'FORMULA_VERSION_MISMATCH' });
  });

  it('rejects zero prices before a next-open fill can divide by zero', () => {
    const rows = prices.map((row, index) => index === 3 ? { ...row, open: 0, low: 0 } : row);
    expect(runSimpleBacktest(program, frame(rows), assumptions)).toMatchObject({ status: 'invalid', code: 'NON_POSITIVE_PRICE' });
  });

  it('rejects indicators that confirm historical values using future bars', () => {
    const pivotInput = { ...program.inputs[0], indicatorId: 'auto-fibonacci', outputKey: 'swing_high', parameters: { period: 50, confirmation: 3 } };
    const result = runSimpleBacktest({ ...program, inputs: [pivotInput] }, frame(prices), assumptions);
    expect(result).toMatchObject({ status: 'invalid', code: 'CONFIRMED_WITH_DELAY_UNSUPPORTED' });
  });

  it('uses pre-period bars for indicator warm-up but starts trades and ROI inside the selected period', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions, {
      startDate: '2025-01-03', endDate: '2025-01-04',
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.equity.map((point) => point.time)).toEqual(['2025-01-03', '2025-01-04']);
    expect(result.openPosition?.entryTime).toBe('2025-01-04');
    expect(result.metrics.totalReturnPct).toBeCloseTo((12 / 13 - 1) * 100, 8);
  });

  it('does not carry a position from before the selected period', () => {
    const result = runSimpleBacktest(program, frame(prices), assumptions, {
      startDate: '2025-01-04', endDate: '2025-01-06',
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toEqual([]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBe(0);
  });

  it('rejects malformed or empty periods', () => {
    expect(runSimpleBacktest(program, frame(prices), assumptions, { startDate: '2025-1-2', endDate: '2025-01-06' }))
      .toMatchObject({ status: 'invalid', code: 'PERIOD_INVALID' });
    expect(runSimpleBacktest(program, frame(prices), assumptions, { startDate: '2025-02-01', endDate: '2025-02-28' }))
      .toMatchObject({ status: 'unavailable', code: 'PERIOD_NO_DATA' });
  });
});

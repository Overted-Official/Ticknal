import { describe, expect, it } from 'vitest';
import type { MarketBar, TimeSeriesFrame } from '@ticknal/quant-engine/canonical';

import type { SimpleStrategyProgram } from './strategy-program';
import type { AdvancedStrategyProgram } from './strategy-program';
import { runAdvancedBacktest } from './run-advanced-backtest';
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

describe('advanced causal calculation execution', () => {
  const priceFrame = (closes: readonly number[]) => frame(closes.map((close) => ({ open: close, high: close, low: close, close })));
  const advanced = (operation: Extract<AdvancedStrategyProgram['inputs'][number], { kind: 'calculation' }>['operation'], period: number, buyThreshold: number, sellThreshold = -1): AdvancedStrategyProgram => ({
    schemaVersion: 2,
    timeframe: 'D',
    inputs: [
      { id: 'close', kind: 'market', field: 'close' },
      { id: 'calculated', kind: 'calculation', operation, sourceIds: ['close'], period },
    ],
    buy: [[{ id: 'buy', inputId: 'calculated', operator: 'crossesAbove', threshold: buyThreshold }]],
    sell: [[{ id: 'sell', inputId: 'calculated', operator: 'crossesBelow', threshold: sellThreshold }]],
  });

  it('lags values by completed bars and cannot buy from future values', () => {
    const result = runAdvancedBacktest(advanced('lag', 2, 3), priceFrame([1, 2, 4, 8, 9, 10]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-05', entryTime: '2025-01-06', entryPrice: 10 });
  });

  it('uses Wilder RMA rather than EMA smoothing', () => {
    const result = runAdvancedBacktest(advanced('rma', 3, 3), priceFrame([1, 2, 3, 4, 5, 6]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-05', entryTime: '2025-01-06', entryPrice: 6 });
  });

  it('ranks the current value causally with midpoint ties', () => {
    const result = runAdvancedBacktest({
      ...advanced('percentileRank', 3, 80, 70),
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'calculated', kind: 'calculation', operation: 'percentileRank', sourceIds: ['close'], period: 3 },
      ],
    }, priceFrame([1, 2, 2, 3, 2, 2]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toMatchObject([{ entrySignalTime: '2025-01-04', entryTime: '2025-01-05', exitSignalTime: '2025-01-05', exitTime: '2025-01-06' }]);
  });

  it('builds Wilder ATR from high, low, and the prior close without future data', () => {
    const bars = frame([
      { open: 10, high: 11, low: 9, close: 10 },
      { open: 10, high: 11, low: 10, close: 10 },
      { open: 10, high: 11, low: 10, close: 10 },
      { open: 15, high: 16, low: 15, close: 15 },
      { open: 15, high: 16, low: 15, close: 15 },
    ]);
    const inputs: AdvancedStrategyProgram['inputs'] = [
      { id: 'high', kind: 'market', field: 'high' },
      { id: 'low', kind: 'market', field: 'low' },
      { id: 'close', kind: 'market', field: 'close' },
      { id: 'priorClose', kind: 'calculation', operation: 'lag', sourceIds: ['close'], period: 1 },
      { id: 'range', kind: 'calculation', operation: 'subtract', sourceIds: ['high', 'low'] },
      { id: 'highGap', kind: 'calculation', operation: 'subtract', sourceIds: ['high', 'priorClose'] },
      { id: 'highGapAbs', kind: 'calculation', operation: 'absolute', sourceIds: ['highGap'] },
      { id: 'lowGap', kind: 'calculation', operation: 'subtract', sourceIds: ['low', 'priorClose'] },
      { id: 'lowGapAbs', kind: 'calculation', operation: 'absolute', sourceIds: ['lowGap'] },
      { id: 'trueRange', kind: 'calculation', operation: 'max', sourceIds: ['range', 'highGapAbs', 'lowGapAbs'] },
      { id: 'atr', kind: 'calculation', operation: 'rma', sourceIds: ['trueRange'], period: 2 },
    ];
    const program: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D', inputs,
      buy: [[{ id: 'buy', inputId: 'atr', operator: 'crossesAbove', threshold: 3 }]],
      sell: [[{ id: 'sell', inputId: 'atr', operator: 'crossesBelow', threshold: -1 }]],
    };

    const result = runAdvancedBacktest(program, bars, assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-04', entryTime: '2025-01-05', entryPrice: 15 });

    const minimum = runAdvancedBacktest({ ...program, inputs: inputs.map((input) => input.id === 'trueRange' && input.kind === 'calculation' ? { ...input, operation: 'min' } : input) }, bars, assumptions);
    expect(minimum.status).toBe('ok');
    if (minimum.status === 'ok') expect(minimum.openPosition).toBeNull();
  });

  it('rejects a missing calculation period or an extra unary input in direct execution', () => {
    const base = advanced('rma', 2, 3);
    const calculation = base.inputs[1];
    if (calculation.kind !== 'calculation') throw new Error('Expected a calculation fixture');
    const bars = priceFrame([1, 2, 3, 4]);
    expect(runAdvancedBacktest({ ...base, inputs: [base.inputs[0], { ...calculation, period: undefined }] }, bars, assumptions)).toMatchObject({ status: 'invalid' });
    expect(runAdvancedBacktest({ ...base, inputs: [base.inputs[0], { ...calculation, sourceIds: ['close', 'close'] }] }, bars, assumptions)).toMatchObject({ status: 'invalid' });
  });

  it('seeds Wilder RMA from large finite values without overflowing the average', () => {
    const program: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'large', kind: 'constant', value: 1e308 },
        { id: 'smooth', kind: 'calculation', operation: 'rma', sourceIds: ['large'], period: 2 },
      ],
      buy: [[{ id: 'buy', inputId: 'smooth', operator: 'isAbove', threshold: 1e307 }]],
      sell: [[{ id: 'sell', inputId: 'smooth', operator: 'isBelow', threshold: 0 }]],
    };
    const result = runAdvancedBacktest(program, priceFrame([10, 10, 10]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });
});

describe('advanced dynamic rules', () => {
  it('compares two current series and fills the crossover at the following open', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }, { id: 'level', kind: 'constant', value: 11 }],
      buy: [[{ id: 'buy', inputId: 'close', compareInputId: 'level', operator: 'crossesAbove', threshold: 0 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, frame(prices), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
  });

  it('can sell when close falls below the price captured at entry', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'open', kind: 'market', field: 'open' },
        { id: 'entryPrice', kind: 'position-memory', sourceId: 'open', capture: 'entry', update: 'never' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', compareInputId: 'entryPrice', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, frame(prices), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryTime: '2025-01-04', exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });
});

describe('advanced conditional exits', () => {
  it('can anchor a frozen percentage target to the buy-signal close', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12.5, high: 13.3, low: 12.5, close: 13.3 },
      { open: 13.3, high: 13.3, low: 13.3, close: 13.3 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D', inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'distance', kind: 'constant', value: 10 },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'distance', multiplier: 1,
        distanceMode: 'percentOfEntry', targetBase: 'signalClose', freezeAtEntry: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryPrice: 12.5, exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
  it('freezes a percentage target from the last completed signal bar at entry', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 13.5, low: 12, close: 13.5 },
      { open: 13.5, high: 13.5, low: 13.5, close: 13.5 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'close', multiplier: 1,
        distanceMode: 'percentOfEntry', freezeAtEntry: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryPrice: 12, exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
  it('waits for a gate before triggering a reached profit target', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 12, close: 14 },
      { open: 14, high: 16, low: 14, close: 15 },
      { open: 15, high: 15, low: 15, close: 15 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'close', kind: 'market', field: 'close' }, { id: 'distance', kind: 'constant', value: 1 }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'target', kind: 'profit-target', sourceId: 'distance', multiplier: 1,
        gate: { id: 'gate', inputId: 'close', operator: 'isAbove', threshold: 14.5 } }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });

  it('uses the connected volatility series for a trailing stop', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 11, close: 11 },
      { open: 11, high: 16, low: 11, close: 14 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'volatility', kind: 'constant', value: 2 },
        { id: 'trackedHigh', kind: 'rolling-state', sourceId: 'high', operation: 'maximum' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'trail', kind: 'trailing-stop', anchorId: 'trackedHigh', volatilitySourceId: 'volatility', volatilityPeriod: 100, distance: 1 }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });

  it('can defer trailing protection until the position is profitable', () => {
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 15, low: 11, close: 11 },
      { open: 11, high: 16, low: 11, close: 14 },
      { open: 14, high: 14, low: 14, close: 14 },
    ]);
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'volatility', kind: 'constant', value: 2 },
        { id: 'trackedHigh', kind: 'rolling-state', sourceId: 'high', operation: 'maximum' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]], sell: [],
      exitPolicies: [{ id: 'trail', kind: 'trailing-stop', anchorId: 'trackedHigh', volatilitySourceId: 'volatility', volatilityPeriod: 14, distance: 1, requireProfit: true }],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ exitSignalTime: '2025-01-04', exitTime: '2025-01-05' }]);
  });
});

describe('advanced custom oscillator calculations', () => {
  const priceFrame = (closes: readonly number[]) => frame(closes.map((close) => ({ open: close, high: close, low: close, close })));

  it('starts an adaptive rolling median after its minimum observed bars', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'median', kind: 'calculation', operation: 'median', sourceIds: ['close'], period: 3, minPeriod: 2 },
      ],
      buy: [[{ id: 'buy', inputId: 'median', operator: 'isAbove', threshold: 14 }]],
      sell: [[{ id: 'sell', inputId: 'median', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 20, 30, 40]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });

  it('clamps a series to configured bounds before evaluating a rule', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'bounded', kind: 'calculation', operation: 'clamp', sourceIds: ['close'], lowerBound: 0, upperBound: 25 },
      ],
      buy: [[{ id: 'buy', inputId: 'bounded', operator: 'crossesAbove', threshold: 24 }]],
      sell: [[{ id: 'sell', inputId: 'bounded', operator: 'crossesBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 20, 30, 40]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
    const capped = runAdvancedBacktest({ ...model, buy: [[{ id: 'buy', inputId: 'bounded', operator: 'crossesAbove', threshold: 26 }]] }, priceFrame([10, 20, 30, 40]), assumptions);
    if (capped.status === 'ok') expect(capped.openPosition).toBeNull();
  });

  it('calculates population standard deviation over a complete causal window', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'deviation', kind: 'calculation', operation: 'stdDev', sourceIds: ['close'], period: 3 },
      ],
      buy: [[{ id: 'buy', inputId: 'deviation', operator: 'isAbove', threshold: 0.8 }]],
      sell: [[{ id: 'sell', inputId: 'deviation', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([1, 2, 3, 4]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-03', entryTime: '2025-01-04' });
  });

  it('uses a fallback when an earlier formula is unavailable without reading future bars', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'zero', kind: 'constant', value: 0 },
        { id: 'fallback', kind: 'constant', value: 50 },
        { id: 'ratio', kind: 'calculation', operation: 'divide', sourceIds: ['close', 'zero'] },
        { id: 'score', kind: 'calculation', operation: 'coalesce', sourceIds: ['ratio', 'fallback'] },
      ],
      buy: [[{ id: 'buy', inputId: 'score', operator: 'isAbove', threshold: 49 }]],
      sell: [[{ id: 'sell', inputId: 'score', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([10, 11, 12]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-01', entryTime: '2025-01-02' });
  });

  it('supports arctangent when shaping a normalized slope score', () => {
    const model = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'angle', kind: 'calculation', operation: 'atan', sourceIds: ['close'] },
      ],
      buy: [[{ id: 'buy', inputId: 'angle', operator: 'crossesAbove', threshold: 1 }]],
      sell: [[{ id: 'sell', inputId: 'angle', operator: 'crossesBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(model, priceFrame([1, 2, 3]), assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.openPosition).toMatchObject({ entrySignalTime: '2025-01-02', entryTime: '2025-01-03' });
  });
});

describe('company-specific advanced parameters', () => {
  it('uses a ticker override and falls back to the shared default', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'level', kind: 'constant', value: 10, overrides: { COMI: 20 } }],
      buy: [[{ id: 'buy', inputId: 'level', operator: 'isAbove', threshold: 15 }]],
      sell: [[{ id: 'sell', inputId: 'level', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const rows = frame(prices.slice(0, 3));
    const comi = runAdvancedBacktest(program, { ...rows, meta: { ...rows.meta, symbol: 'COMI' } }, assumptions);
    const other = runAdvancedBacktest(program, { ...rows, meta: { ...rows.meta, symbol: 'HRHO' } }, assumptions);
    expect(comi.status).toBe('ok');
    expect(other.status).toBe('ok');
    if (comi.status === 'ok' && other.status === 'ok') {
      expect(comi.openPosition?.entryTime).toBe('2025-01-02');
      expect(other.openPosition).toBeNull();
    }
  });
});

describe('regime-reset calculations', () => {
  it('restarts an anchored running maximum and baseline when the regime changes', () => {
    const original = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 14, high: 14, low: 14, close: 14 },
      { open: 11, high: 11, low: 11, close: 11 },
      { open: 6, high: 6, low: 6, close: 6 },
    ]);
    const bars = original.bars.map((bar, index) => ({ ...bar, volume: [1, 1, 2, 2][index] }));
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'regime', kind: 'market', field: 'volume' },
        { id: 'peak', kind: 'calculation', operation: 'regimeMaximum', sourceIds: ['close', 'regime'] },
        { id: 'baseline', kind: 'calculation', operation: 'regimeStart', sourceIds: ['close', 'regime'] },
        { id: 'progress', kind: 'calculation', operation: 'subtract', sourceIds: ['peak', 'baseline'] },
      ],
      buy: [[{ id: 'buy', inputId: 'progress', operator: 'isAbove', threshold: 3 }]],
      sell: [[{ id: 'sell', inputId: 'progress', operator: 'isBelow', threshold: 1 }]],
    } as AdvancedStrategyProgram;
    const result = runAdvancedBacktest(program, { ...original, bars }, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.trades).toMatchObject([{ entryTime: '2025-01-03', exitSignalTime: '2025-01-03', exitTime: '2025-01-04' }]);
  });
});

describe('advanced execution assumptions', () => {
  it('can fill a signal at its closing price with whole shares', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      execution: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' },
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 0 }]],
    } as AdvancedStrategyProgram;
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 14, high: 14, low: 14, close: 14 },
    ]);
    const result = runAdvancedBacktest(program, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.openPosition).toMatchObject({ entryTime: '2025-01-02', entryPrice: 12 });
      expect(result.openPosition?.maePct).toBe(0);
      expect(result.metrics.totalReturnPct).toBeCloseTo(16.6, 5);
      expect(result.provenance).toMatchObject({ fillPolicy: 'signal-close', shareSizing: 'wholeShares' });
    }
  });

  it('closes at the signal-day close and includes residual cash in portfolio return', () => {
    const model: AdvancedStrategyProgram = {
      schemaVersion: 2, timeframe: 'D',
      execution: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' },
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'crossesAbove', threshold: 11 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 9 }]],
    };
    const rows = frame([
      { open: 10, high: 10, low: 10, close: 10 },
      { open: 10, high: 12, low: 10, close: 12 },
      { open: 12, high: 12, low: 8, close: 8 },
    ]);
    const result = runAdvancedBacktest(model, rows, assumptions);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.trades).toMatchObject([{ entryTime: '2025-01-02', entryPrice: 12,
      exitSignalTime: '2025-01-03', exitTime: '2025-01-03', exitPrice: 8 }]);
    expect(result.openPosition).toBeNull();
    expect(result.metrics.totalReturnPct).toBeCloseTo(-33.2, 8);
  });
});

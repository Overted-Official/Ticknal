import { describe, expect, it } from 'vitest';

import { parseUniverseBacktestRequest } from './parse-universe-backtest-request';

const valid = {
  symbols: [' comi ', 'HRHO'],
  program: {
    schemaVersion: 1, timeframe: 'D',
    inputs: [{ id: 'input-1', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 20 } }],
    buy: [[{ id: 'buy-1', inputId: 'input-1', operator: 'crossesAbove', threshold: 50 }]],
    sell: [[{ id: 'sell-1', inputId: 'input-1', operator: 'crossesBelow', threshold: 50 }]],
  },
  assumptions: { initialCapital: 100_000, feeBps: 15 },
  period: { startDate: '2020-01-01', endDate: '2025-12-31' },
};

describe('parseUniverseBacktestRequest', () => {
  it('normalizes a bounded daily strategy request', () => {
    const result = parseUniverseBacktestRequest(valid);
    expect(result).toMatchObject({ success: true, value: { symbols: ['COMI', 'HRHO'], period: valid.period } });
  });

  it('rejects duplicate and oversized universes', () => {
    expect(parseUniverseBacktestRequest({ ...valid, symbols: ['COMI', ' comi '] }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, symbols: Array.from({ length: 13 }, (_, index) => `T${index}`) }).success).toBe(false);
  });

  it('rejects unbounded or malformed programs before any historical load', () => {
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...valid.program, inputs: Array.from({ length: 9 }, () => valid.program.inputs[0]) } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...valid.program, buy: [] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...valid.program, sell: [[{ ...valid.program.sell[0][0], inputId: 'missing' }]] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...valid.program, timeframe: '1H' } }).success).toBe(false);
  });

  it('rejects invalid assumptions and impossible date periods', () => {
    expect(parseUniverseBacktestRequest({ ...valid, assumptions: { initialCapital: 0, feeBps: 15 } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, period: { startDate: '2025-02-30', endDate: '2025-12-31' } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, period: { startDate: '2025-12-31', endDate: '2020-01-01' } }).success).toBe(false);
  });
});

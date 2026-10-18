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
  it('validates the advanced execution model', () => {
    const program = { schemaVersion: 2, timeframe: 'D',
      execution: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' },
      inputs: [{ id: 'close', kind: 'market', field: 'close' }],
      buy: [[{ id: 'buy', inputId: 'close', operator: 'isAbove', threshold: 10 }]],
      sell: [[{ id: 'sell', inputId: 'close', operator: 'isBelow', threshold: 10 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, execution: { ...program.execution, fillPolicy: 'intrabar-high' } } }).success).toBe(false);
  });
  it('accepts a regime-reset calculation with exactly two prior sources', () => {
    const program = { schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'regime', kind: 'market', field: 'volume' },
        { id: 'peak', kind: 'calculation', operation: 'regimeMaximum', sourceIds: ['close', 'regime'] },
      ],
      buy: [[{ id: 'buy', inputId: 'peak', operator: 'isAbove', threshold: 15 }]],
      sell: [[{ id: 'sell', inputId: 'peak', operator: 'isBelow', threshold: 10 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [...program.inputs.slice(0, 2), { ...program.inputs[2], sourceIds: ['close'] }] } }).success).toBe(false);
  });
  it('accepts bounded ticker overrides and rejects malformed values', () => {
    const program = { schemaVersion: 2, timeframe: 'D',
      inputs: [{ id: 'level', kind: 'constant', value: 10, overrides: { COMI: 20 } }],
      buy: [[{ id: 'buy', inputId: 'level', operator: 'isAbove', threshold: 15 }]],
      sell: [[{ id: 'sell', inputId: 'level', operator: 'isBelow', threshold: 0 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [{ ...program.inputs[0], overrides: { comi: 20 } }] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [{ ...program.inputs[0], overrides: { COMI: Number.POSITIVE_INFINITY } }] } }).success).toBe(false);
  });
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

  it('accepts bounded advanced lag, Wilder smoothing, and causal percentile calculations', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'prior', kind: 'calculation', operation: 'lag', sourceIds: ['close'], period: 1 },
        { id: 'smooth', kind: 'calculation', operation: 'rma', sourceIds: ['prior'], period: 14 },
        { id: 'rank', kind: 'calculation', operation: 'percentileRank', sourceIds: ['smooth'], period: 63 },
      ],
      buy: [[{ id: 'buy', inputId: 'rank', operator: 'crossesAbove', threshold: 30 }]],
      sell: [[{ id: 'sell', inputId: 'rank', operator: 'crossesBelow', threshold: 70 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [
      program.inputs[0], { ...program.inputs[1], period: -1 }, ...program.inputs.slice(2),
    ] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [
      program.inputs[0], { ...program.inputs[1], period: undefined }, ...program.inputs.slice(2),
    ] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [
      program.inputs[0], { ...program.inputs[1], sourceIds: ['close', 'close'] }, ...program.inputs.slice(2),
    ] } }).success).toBe(false);
  });

  it('accepts bounded absolute and cross-series extrema while rejecting unknown math', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'low', kind: 'market', field: 'low' },
        { id: 'gap', kind: 'calculation', operation: 'subtract', sourceIds: ['high', 'low'] },
        { id: 'magnitude', kind: 'calculation', operation: 'absolute', sourceIds: ['gap'] },
        { id: 'ceiling', kind: 'calculation', operation: 'max', sourceIds: ['magnitude', 'high'] },
        { id: 'floor', kind: 'calculation', operation: 'min', sourceIds: ['magnitude', 'low'] },
      ],
      buy: [[{ id: 'buy', inputId: 'ceiling', operator: 'crossesAbove', threshold: 30 }]],
      sell: [[{ id: 'sell', inputId: 'floor', operator: 'crossesBelow', threshold: 70 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: program.inputs.map((input) => input.id === 'ceiling' ? { ...input, operation: 'execute' } : input) } }).success).toBe(false);
  });

  it('validates dynamic comparisons and gated exits before loading history', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'high', kind: 'market', field: 'high' },
        { id: 'distance', kind: 'constant', value: 2 },
        { id: 'entryHigh', kind: 'rolling-state', sourceId: 'high', operation: 'maximum' },
      ],
      buy: [[{ id: 'buy', inputId: 'close', compareInputId: 'distance', operator: 'crossesAbove', threshold: 0 }]],
      sell: [],
      exitPolicies: [
        { id: 'target', kind: 'profit-target', sourceId: 'distance', multiplier: 1,
          gate: { id: 'gate', inputId: 'close', operator: 'isAbove', threshold: 12 } },
        { id: 'trail', kind: 'trailing-stop', anchorId: 'entryHigh', distance: 2, volatilityPeriod: 14,
          volatilitySourceId: 'distance', requireProfit: true },
      ],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, buy: [[{ ...program.buy[0][0], compareInputId: 'missing' }]] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...program.exitPolicies[0], gate: { id: 'bad', inputId: 'missing', operator: 'isAbove', threshold: 0 } }] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...program.exitPolicies[1], volatilitySourceId: 'missing' }] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...program.exitPolicies[1], requireProfit: 'true' }] } }).success).toBe(false);
    const frozenTarget = { ...program.exitPolicies[0], distanceMode: 'percentOfEntry', targetBase: 'signalClose', freezeAtEntry: true };
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [frozenTarget] } }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...frozenTarget, distanceMode: 'percentOfMarket' }] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...frozenTarget, freezeAtEntry: 'true' }] } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, exitPolicies: [{ ...frozenTarget, targetBase: 'intradayLow' }] } }).success).toBe(false);
  });

  it('accepts bounded custom oscillator operations and rejects unsafe clamp bounds', () => {
    const program = {
      schemaVersion: 2, timeframe: 'D',
      inputs: [
        { id: 'close', kind: 'market', field: 'close' },
        { id: 'fallback', kind: 'constant', value: 50 },
        { id: 'bounded', kind: 'calculation', operation: 'clamp', sourceIds: ['close'], lowerBound: 0, upperBound: 100 },
        { id: 'angle', kind: 'calculation', operation: 'atan', sourceIds: ['bounded'] },
        { id: 'deviation', kind: 'calculation', operation: 'stdDev', sourceIds: ['close'], period: 20 },
        { id: 'score', kind: 'calculation', operation: 'coalesce', sourceIds: ['angle', 'fallback'] },
      ],
      buy: [[{ id: 'buy', inputId: 'score', operator: 'isAbove', threshold: 0 }]],
      sell: [[{ id: 'sell', inputId: 'score', operator: 'isBelow', threshold: 0 }]],
    };
    expect(parseUniverseBacktestRequest({ ...valid, program }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: program.inputs.map((input) => input.id === 'bounded' ? { ...input, lowerBound: 200 } : input) } }).success).toBe(false);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: program.inputs.map((input) => input.id === 'bounded' ? { ...input, upperBound: Number.POSITIVE_INFINITY } : input) } }).success).toBe(false);
    const adaptive = { id: 'adaptive', kind: 'calculation', operation: 'median', sourceIds: ['close'], period: 252, minPeriod: 30 };
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [...program.inputs, adaptive] } }).success).toBe(true);
    expect(parseUniverseBacktestRequest({ ...valid, program: { ...program, inputs: [...program.inputs, { ...adaptive, minPeriod: 253 }] } }).success).toBe(false);
  });
});

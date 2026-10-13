import { describe, expect, it } from 'vitest';

import type { SimpleStrategyProgram } from '../strategy-program';
import type { BacktestResult } from '../run-simple-backtest';
import { runSimpleUniverseBacktest } from './run-simple-universe-backtest';

const program: SimpleStrategyProgram = {
  schemaVersion: 1, timeframe: 'D',
  inputs: [{ id: 'sma', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 2 } }],
  buy: [[{ id: 'buy', inputId: 'sma', operator: 'crossesAbove', threshold: 10 }]],
  sell: [[{ id: 'sell', inputId: 'sma', operator: 'crossesBelow', threshold: 10 }]],
};
const assumptions = { initialCapital: 1000, feeBps: 10 };
const period = { startDate: '2025-01-01', endDate: '2025-12-31' };

function success(symbol: string): BacktestResult {
  return {
    status: 'ok', trades: [], equity: [], openPosition: null,
    metrics: { totalReturnPct: symbol === 'COMI' ? 12 : -4, maxDrawdownPct: -6, closedTrades: 3, winRatePct: 50 },
    provenance: {
      sourceRevision: `revision-${symbol}`, adjustmentMode: 'as-stored', adjustmentRevision: null,
      asOf: '2025-12-31', formulaVersions: { 'simple-moving-average': '1.0.0' },
      assumptions, fillPolicy: 'next-session-open',
    },
  };
}

describe('runSimpleUniverseBacktest', () => {
  it('keeps source order, returns compact per-company metrics, and isolates unavailable symbols', async () => {
    const result = await runSimpleUniverseBacktest(
      { symbols: [' comi ', 'HRHO', 'EGAL'], program, assumptions, period },
      async (symbol) => symbol === 'HRHO'
        ? { status: 'unavailable', code: 'HISTORY_UNAVAILABLE' }
        : success(symbol),
    );

    expect(result.results).toEqual([
      { symbol: 'COMI', status: 'ok', metrics: { totalReturnPct: 12, maxDrawdownPct: -6, closedTrades: 3, winRatePct: 50 }, sourceRevision: 'revision-COMI', asOf: '2025-12-31' },
      { symbol: 'HRHO', status: 'unavailable', code: 'HISTORY_UNAVAILABLE' },
      { symbol: 'EGAL', status: 'ok', metrics: { totalReturnPct: -4, maxDrawdownPct: -6, closedTrades: 3, winRatePct: 50 }, sourceRevision: 'revision-EGAL', asOf: '2025-12-31' },
    ]);
    expect(result.summary).toEqual({ requested: 3, completed: 2, unavailable: 1, positive: 1 });
    expect(JSON.stringify(result)).not.toContain('equity');
    expect(JSON.stringify(result)).not.toContain('trades');
  });

  it('never starts more than three company backtests at once', async () => {
    let active = 0;
    let peak = 0;
    const result = await runSimpleUniverseBacktest(
      { symbols: ['COMI', 'HRHO', 'EGAL', 'SWDY', 'EAST', 'FWRY'], program, assumptions, period },
      async (symbol) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return success(symbol);
      },
    );

    expect(peak).toBe(3);
    expect(result.summary.completed).toBe(6);
  });

  it('rejects duplicate or oversized universes before starting any company load', async () => {
    let loads = 0;
    const runner = async (symbol: string) => { loads += 1; return success(symbol); };
    await expect(runSimpleUniverseBacktest(
      { symbols: ['COMI', ' comi '], program, assumptions, period }, runner,
    )).rejects.toThrow('duplicate');
    await expect(runSimpleUniverseBacktest(
      { symbols: Array.from({ length: 13 }, (_, index) => `T${index}`), program, assumptions, period }, runner,
    )).rejects.toThrow('at most 12');
    expect(loads).toBe(0);
  });

  it('turns one failed company load into an unavailable result without failing the batch', async () => {
    const result = await runSimpleUniverseBacktest(
      { symbols: ['COMI', 'HRHO'], program, assumptions, period },
      async (symbol) => {
        if (symbol === 'HRHO') throw new Error('private database detail');
        return success(symbol);
      },
    );
    expect(result.results).toEqual([
      expect.objectContaining({ symbol: 'COMI', status: 'ok' }),
      { symbol: 'HRHO', status: 'unavailable', code: 'BACKTEST_FAILED' },
    ]);
    expect(JSON.stringify(result)).not.toContain('private database detail');
  });
});

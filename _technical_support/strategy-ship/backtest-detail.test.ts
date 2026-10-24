import { describe, expect, it } from 'vitest';
import { parseUniverseBacktestRequest } from '../../src/lib/strategies/server/parse-universe-backtest-request';
import { projectCompanyBacktestDetail } from '../../src/lib/strategies/server/project-company-backtest-detail';
import type { BacktestResult } from '../../src/lib/strategies/run-simple-backtest';
import type { SimpleStrategyProgram } from '../../src/lib/strategies/strategy-program';
import { parseCompanyBacktestResponse } from '../../src/components/platform/strategies/builder/use-simple-company-backtest';

const program: SimpleStrategyProgram = {
  schemaVersion: 1, timeframe: 'D',
  inputs: [{ id: 'sma', kind: 'indicator', indicatorId: 'simple-moving-average', formulaVersion: '1.0.0', outputKey: 'sma', unit: 'price', parameters: { period: 2 } }],
  buy: [[{ id: 'buy', inputId: 'sma', operator: 'crossesAbove', threshold: 10 }]],
  sell: [[{ id: 'sell', inputId: 'sma', operator: 'crossesBelow', threshold: 10 }]],
};
const request = { symbols: ['COMI'], program, assumptions: { initialCapital: 1000, feeBps: 0 }, period: { startDate: '2025-01-01', endDate: '2025-12-31' } };

describe('company detail backtest', () => {
  it('only accepts a detail request for one symbol', () => {
    expect(parseUniverseBacktestRequest({ ...request, detail: true })).toMatchObject({ success: true, value: { detail: true } });
    expect(parseUniverseBacktestRequest({ ...request, symbols: ['COMI', 'EAST'], detail: true }).success).toBe(false);
  });

  it('returns trades, equity, open position and effective assumptions without raw frame data', () => {
    const result: BacktestResult = {
      status: 'ok', metrics: { totalReturnPct: 12, maxDrawdownPct: -7, closedTrades: 1, winRatePct: 100 },
      trades: [{ entrySignalTime: '2025-01-02', entryTime: '2025-01-03', entryPrice: 100, exitSignalTime: '2025-02-02', exitTime: '2025-02-03', exitPrice: 112, entryFee: 0, exitFee: 0, returnPct: 12, maePct: -3, mfePct: 15 }],
      equity: [{ time: '2025-01-03', value: 1000, inPosition: true }, { time: '2025-02-03', value: 1120, inPosition: false }],
      openPosition: { entrySignalTime: '2025-03-02', entryTime: '2025-03-03', entryPrice: 115, unrealizedReturnPct: 2, maePct: -1, mfePct: 4 },
      latestSignal: null,
      provenance: { sourceRevision: 'revision-1', adjustmentMode: 'as-stored', adjustmentRevision: null, asOf: '2025-12-31', formulaVersions: {}, assumptions: { initialCapital: 1000, feeBps: 0 }, fillPolicy: 'next-session-open', shareSizing: 'wholeShares' },
    };
    const projected = projectCompanyBacktestDetail('COMI', result);
    expect(projected).toMatchObject({ symbol: 'COMI', status: 'ok', detail: { trades: [{ returnPct: 12, maePct: -3 }], equity: [{ value: 1000 }, { value: 1120 }], openPosition: { unrealizedReturnPct: 2 }, assumptions: { initialCapital: 1000, feeBps: 0 }, fillPolicy: 'next-session-open' } });
    expect(JSON.stringify(projected)).not.toContain('formulaVersions');
    const parsed = parseCompanyBacktestResponse({ status: 'ok', results: [projected] }, 'COMI');
    expect(parsed).toMatchObject({ status: 'ready', detail: { trades: [{ returnPct: 12 }], equity: [{ value: 1000 }, { value: 1120 }] } });
  });
});

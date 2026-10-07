import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type CompletedTrade,
  type CompletedTradeFrame,
} from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { RISK_PORTFOLIO_DEFINITIONS } from '../../src/canonical/indicators/risk-portfolio';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const IDS = ['RSK-020', 'RSK-021', 'RSK-022', 'RSK-023', 'RSK-024', 'RSK-025', 'RSK-026', 'RSK-027', 'RSK-030'] as const;

function trade(overrides: Partial<CompletedTrade>): CompletedTrade {
  return {
    id: 'win', symbol: 'COMI', side: 'long', entryTime: '2026-01-04', exitTime: '2026-01-05',
    entryPrice: 100, exitPrice: 130, quantity: 1, fees: 0, realizedPnl: 30,
    realizedReturn: 0.3, maximumAdverseExcursion: -0.05, maximumFavorableExcursion: 0.4,
    ...overrides,
  };
}

function tradeFrame(trades: readonly CompletedTrade[]): CompletedTradeFrame {
  return {
    domain: 'completed-trades', trades,
    provenance: {
      sourceId: 'authenticated-trades', sourceType: 'portfolio-ledger', sourceRevision: 'ledger-v1',
      asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

const MIXED = createIndicatorInputBundle({
  completedTrades: tradeFrame([
    trade({ id: 'win' }),
    trade({
      id: 'loss', entryTime: '2026-01-06', exitTime: '2026-01-07', entryPrice: 100,
      exitPrice: 90, realizedPnl: -10, realizedReturn: -0.1,
      maximumAdverseExcursion: -0.2, maximumFavorableExcursion: 0.05,
    }),
  ]),
});

function definition(backlogId: string) {
  const found = RISK_PORTFOLIO_DEFINITIONS.find((candidate) => candidate.backlogId === backlogId);
  if (found === undefined) throw new Error(`Missing definition ${backlogId}`);
  return found;
}

function parameters(backlogId: string): Record<string, unknown> {
  return backlogId === 'RSK-027'
    ? { capitalLossPct: 20, riskPerTradePct: 2 }
    : backlogId === 'RSK-026'
      ? { fraction: 0.5 }
      : {};
}

describe('completed-trade risk metrics', () => {
  it.each(IDS)('%s executes from the authenticated completed-trade ledger', (backlogId) => {
    const result = executeContextualIndicator(
      definition(backlogId), FIVE_BAR_FRAME, parameters(backlogId), MIXED, CONTEXT,
    );
    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs).some((output) => output.some((value) => value !== null)))
      .toBe(true);
  });

  it('matches the hand-calculated mixed win/loss ledger after the second exit', () => {
    const expected: Record<string, number> = {
      'RSK-022': 3,
      'RSK-023': 50,
      'RSK-025': 3,
      'RSK-030': 2,
    };
    const outputKey: Record<string, string> = {
      'RSK-022': 'profit_factor',
      'RSK-023': 'win_rate_pct',
      'RSK-025': 'payoff_ratio',
      'RSK-030': 'recovery_factor',
    };
    for (const [backlogId, value] of Object.entries(expected)) {
      const result = executeContextualIndicator(
        definition(backlogId), FIVE_BAR_FRAME, {}, MIXED, CONTEXT,
      );
      expect(result.outputs[outputKey[backlogId]!]?.at(-1)).toBeCloseTo(value, 12);
    }

    const expectancy = executeContextualIndicator(
      definition('RSK-024'), FIVE_BAR_FRAME, {}, MIXED, CONTEXT,
    );
    expect(expectancy.outputs.expectancy_amount?.at(-1)).toBe(10);
    expect(expectancy.outputs.expectancy_pct?.at(-1)).toBeCloseTo(10, 12);

    const kelly = executeContextualIndicator(
      definition('RSK-026'), FIVE_BAR_FRAME, { fraction: 0.5 }, MIXED, CONTEXT,
    );
    expect(kelly.outputs.full_kelly?.at(-1)).toBeCloseTo(33.33333333333333, 10);
    expect(kelly.outputs.fractional_kelly?.at(-1)).toBeCloseTo(16.666666666666664, 10);
  });

  it('never includes the later losing trade before its exit', () => {
    const result = executeContextualIndicator(
      definition('RSK-023'), FIVE_BAR_FRAME, {}, MIXED, CONTEXT,
    );

    expect(result.outputs.win_rate_pct).toEqual([null, 100, 100, 50, 50]);
    expect(result.outputs.sample_count).toEqual([0, 1, 1, 2, 2]);
  });

  it('keeps zero-loss ratios finite-safe and handles an empty ledger', () => {
    const onlyWin = createIndicatorInputBundle({ completedTrades: tradeFrame([trade({})]) });
    const profitFactor = executeContextualIndicator(
      definition('RSK-022'), FIVE_BAR_FRAME, {}, onlyWin, CONTEXT,
    );
    expect(profitFactor.outputs.profit_factor?.at(-1)).toBeNull();

    const empty = executeContextualIndicator(
      definition('RSK-023'), FIVE_BAR_FRAME, {}, createIndicatorInputBundle({ completedTrades: tradeFrame([]) }), CONTEXT,
    );
    expect(empty.status).toBe('ok');
    expect(empty.outputs.sample_count).toEqual([0, 0, 0, 0, 0]);
  });

  it('rejects an invalid trade chronology as unavailable', () => {
    const invalid = createIndicatorInputBundle({
      completedTrades: tradeFrame([trade({ entryTime: '2026-01-08', exitTime: '2026-01-07' })]),
    });
    const result = executeContextualIndicator(
      definition('RSK-023'), FIVE_BAR_FRAME, {}, invalid, CONTEXT,
    );
    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('INPUT_TIMESTAMP_ORDER');
  });
});

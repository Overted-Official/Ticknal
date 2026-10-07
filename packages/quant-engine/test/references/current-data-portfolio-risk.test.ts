import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type NumericSeriesFrame,
  type PortfolioInputFrame,
} from '../../src/canonical/contracts';
import { executeContextualIndicator } from '../../src/canonical/execution/execute-contextual-indicator';
import { RISK_PORTFOLIO_DEFINITIONS } from '../../src/canonical/indicators/risk-portfolio';
import { FIVE_BAR_FRAME } from './five-bar-frame';

const CONTEXT = { calculatedAt: '2026-01-08T12:01:00.000Z' } as const;
const IDS = ['RSK-031', 'RSK-032', 'RSK-033', 'RSK-034', 'RSK-035'] as const;

function series(role: string, values: readonly number[]): NumericSeriesFrame {
  return {
    domain: 'numeric-series', role, unit: 'price',
    points: FIVE_BAR_FRAME.bars.map((bar, index) => ({ time: bar.time, value: values[index]! })),
    provenance: {
      sourceId: `${role}-fixture`, sourceType: 'market-prices', sourceRevision: `${role}-v1`,
      symbol: role, asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

function portfolio(marketValues = [60, 40]): PortfolioInputFrame {
  return {
    domain: 'portfolio', cash: 0, totalValue: marketValues.reduce((sum, value) => sum + value, 0),
    benchmarkSymbol: 'EGX30',
    holdings: [
      { symbol: 'AAA', quantity: 6, marketPrice: 10, marketValue: marketValues[0]!, quoteCurrency: 'EGP' },
      { symbol: 'BBB', quantity: 4, marketPrice: 10, marketValue: marketValues[1]!, quoteCurrency: 'EGP' },
    ],
    provenance: {
      sourceId: 'authenticated-portfolio', sourceType: 'portfolio-valuation', sourceRevision: 'positions-v1',
      portfolioRevision: 'valuation-v1', asOf: '2026-01-08T12:00:00.000Z', receivedAt: '2026-01-08T12:00:00.000Z',
    },
  };
}

function inputs(portfolioFrame = portfolio()) {
  return createIndicatorInputBundle({
    portfolio: portfolioFrame,
    seriesByRole: {
      'holding:AAA': series('AAA', [100, 102, 101, 104, 106]),
      'holding:BBB': series('BBB', [100, 101, 103, 102, 105]),
      benchmark: series('EGX30', [100, 101, 102, 103, 104]),
    },
  });
}

function definition(backlogId: string) {
  const found = RISK_PORTFOLIO_DEFINITIONS.find((candidate) => candidate.backlogId === backlogId);
  if (found === undefined) throw new Error(`Missing definition ${backlogId}`);
  return found;
}

function parameters(backlogId: string): Record<string, unknown> {
  return backlogId === 'RSK-035'
    ? { period: 3, annualization: 252, stressCorrelation: 0.8 }
    : { period: 3, annualization: 252 };
}

describe('portfolio risk metrics', () => {
  it.each(IDS)('%s executes from tenant-scoped holdings and return series', (backlogId) => {
    const result = executeContextualIndicator(
      definition(backlogId), FIVE_BAR_FRAME, parameters(backlogId), inputs(), CONTEXT,
    );
    expect(result.status).toBe('ok');
    expect(Object.values(result.outputs).some((output) => output.some((value) => value !== null)))
      .toBe(true);
  });

  it('calculates two-holding HHI and effective holdings by hand', () => {
    const result = executeContextualIndicator(
      definition('RSK-033'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, inputs(), CONTEXT,
    );
    expect(result.outputs.hhi).toEqual([0.52, 0.52, 0.52, 0.52, 0.52]);
    expect(result.outputs.effective_holdings?.[0]).toBeCloseTo(1 / 0.52, 12);
  });

  it('returns one for one-asset concentration and diversification', () => {
    const one: PortfolioInputFrame = {
      ...portfolio([100, 0]), totalValue: 100,
      holdings: [{ symbol: 'AAA', quantity: 10, marketPrice: 10, marketValue: 100, quoteCurrency: 'EGP' }],
    };
    const oneInputs = createIndicatorInputBundle({
      portfolio: one,
      seriesByRole: {
        'holding:AAA': series('AAA', [100, 102, 101, 104, 106]),
        benchmark: series('EGX30', [100, 101, 102, 103, 104]),
      },
    });
    const concentration = executeContextualIndicator(
      definition('RSK-033'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, oneInputs, CONTEXT,
    );
    const diversification = executeContextualIndicator(
      definition('RSK-034'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, oneInputs, CONTEXT,
    );
    expect(concentration.outputs.hhi?.at(-1)).toBe(1);
    expect(diversification.outputs.diversification_ratio?.at(-1)).toBeCloseTo(1, 12);
  });

  it('marks non-positive portfolio value and missing holding history unavailable', () => {
    const invalidValue = executeContextualIndicator(
      definition('RSK-033'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, inputs(portfolio([0, 0])), CONTEXT,
    );
    expect(invalidValue.status).toBe('unavailable');

    const missingHistory = createIndicatorInputBundle({
      portfolio: portfolio(),
      seriesByRole: { benchmark: series('EGX30', [100, 101, 102, 103, 104]) },
    });
    const result = executeContextualIndicator(
      definition('RSK-034'), FIVE_BAR_FRAME, { period: 3, annualization: 252 }, missingHistory, CONTEXT,
    );
    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'DATA_CAPABILITY_MISSING',
      fields: expect.objectContaining({ role: 'holding:AAA' }),
    }));
  });
});

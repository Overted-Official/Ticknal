import { describe, expect, it } from 'vitest';

import {
  createIndicatorInputBundle,
  type NumericSeriesFrame,
} from '@ticknal/quant-engine/canonical';
import { FIVE_BAR_FRAME } from '../../../../packages/quant-engine/test/references/five-bar-frame';
import { parseContextualEvaluationRequest } from './contextual-request';
import {
  ContextualAuthorizationError,
  evaluateContextualIndicators,
  type ContextualIndicatorLoaders,
} from './evaluate-contextual-indicators';

function selection(instanceId: string, definitionId: string, parameters: Record<string, unknown> = {}) {
  return {
    instanceId, definitionId, formulaVersion: '1.0.0' as const, parameters,
    visibleOutputs: [] as string[], placementOverrides: {},
  };
}

function series(role: string, values = [210, 216, 228, 220, 230]): NumericSeriesFrame {
  return {
    domain: 'numeric-series', role, unit: 'price',
    points: FIVE_BAR_FRAME.bars.map((bar, index) => ({ time: bar.time, value: values[index]! })),
    provenance: {
      sourceId: role, sourceType: 'test', sourceRevision: `${role}-v1`, symbol: role,
      asOf: '2026-01-08', receivedAt: '2026-01-08',
    },
  };
}

function loaders(overrides: Partial<ContextualIndicatorLoaders> = {}) {
  const numericCalls: string[] = [];
  let m2Calls = 0;
  const value: ContextualIndicatorLoaders & { numericCalls: string[]; m2Calls: () => number } = {
    loadPrimaryFrame: async () => ({ status: 'ok', frame: FIVE_BAR_FRAME }),
    loadNumericSeries: async ({ role, symbol }) => {
      numericCalls.push(`${role}:${symbol}`);
      return series(role);
    },
    loadM2Series: async () => {
      m2Calls += 1;
      return series('m2', [100, 101, 103, 106, 110]);
    },
    loadMacroSeries: async (role) => series(role),
    loadCompletedTrades: async () => null,
    loadPortfolio: async () => null,
    loadModelOutputs: async () => ({}),
    loadIndicatorOutputs: async () => ({}),
    ...overrides,
    numericCalls,
    m2Calls: () => m2Calls,
  };
  return value;
}

describe('contextual request validation', () => {
  it('normalizes a valid request and rejects malformed selections', () => {
    expect(parseContextualEvaluationRequest({
      symbol: ' comi ', timeframe: 'd',
      selections: [selection('one', 'close-price')],
    })).toEqual(expect.objectContaining({ success: true, value: expect.objectContaining({ symbol: 'COMI', timeframe: 'D' }) }));
    expect(parseContextualEvaluationRequest({
      symbol: 'COMI', timeframe: 'D', selections: [{ definitionId: 'close-price' }],
    })).toEqual(expect.objectContaining({ success: false }));
  });
});

describe('contextual indicator evaluation', () => {
  it('deduplicates comparison-series loads and preserves mixed selection order', async () => {
    const source = loaders();
    const result = await evaluateContextualIndicators({
      symbol: 'COMI', timeframe: 'D',
      selections: [
        selection('local', 'close-price'),
        selection('ratio-a', 'relative-price-ratio', { comparisonSymbol: 'EGX30' }),
        selection('ratio-b', 'relative-price-ratio', { comparisonSymbol: 'EGX30' }),
      ],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null });

    expect(result.map((item) => item.instanceId)).toEqual(['local', 'ratio-a', 'ratio-b']);
    expect(result.every((item) => item.execution.result.status === 'ok')).toBe(true);
    expect(source.numericCalls).toEqual(['comparison:EGX30']);
  });

  it('deduplicates one market series used under different contextual roles', async () => {
    const source = loaders();
    const result = await evaluateContextualIndicators({
      symbol: 'COMI', timeframe: 'D',
      selections: [
        selection('beta', 'rolling-beta', { period: 3, annualization: 252, benchmarkSymbol: 'EGX30' }),
        selection('ratio', 'relative-price-ratio', { comparisonSymbol: 'EGX30' }),
      ],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null });

    expect(result.every((item) => item.execution.result.status === 'ok')).toBe(true);
    expect(source.numericCalls).toHaveLength(1);
  });

  it('loads M2 once and makes it available to the M2 indicator', async () => {
    const source = loaders();
    const result = await evaluateContextualIndicators({
      symbol: 'EGX30', timeframe: 'D',
      selections: [selection('m2', 'egypt-m2-liquidity-growth', { monthPeriod: 1, yearPeriod: 2 })],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null });

    expect(source.m2Calls()).toBe(1);
    expect(result[0]?.execution.result.status).toBe('ok');
  });

  it('rejects portfolio or trade data access without an authenticated user', async () => {
    const source = loaders();
    await expect(evaluateContextualIndicators({
      symbol: 'COMI', timeframe: 'D',
      selections: [selection('portfolio', 'portfolio-beta', { period: 3, annualization: 252 })],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null }))
      .rejects.toBeInstanceOf(ContextualAuthorizationError);
  });

  it('returns the canonical missing-role diagnostic when a requested source is unavailable', async () => {
    const source = loaders({ loadNumericSeries: async () => null });
    const result = await evaluateContextualIndicators({
      symbol: 'COMI', timeframe: 'D',
      selections: [selection('corr', 'rolling-correlation', { period: 3, comparisonSymbol: 'MISSING' })],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null });

    expect(result[0]?.execution.result.status).toBe('unavailable');
    expect(result[0]?.execution.result.diagnostics[0]).toEqual(expect.objectContaining({
      code: 'DATA_CAPABILITY_MISSING',
    }));
  });

  it('accepts loader-provided contextual bundles without mutating them', async () => {
    const bundle = createIndicatorInputBundle({ seriesByRole: { comparison: series('comparison') } });
    const source = loaders({ loadNumericSeries: async () => bundle.seriesByRole.comparison! });
    await evaluateContextualIndicators({
      symbol: 'COMI', timeframe: 'D', selections: [selection('ratio', 'relative-price-ratio', { comparisonSymbol: 'EGX30' })],
    }, source, { calculatedAt: '2026-01-08T12:01:00.000Z', userId: null });
    expect(Object.isFrozen(bundle.seriesByRole.comparison)).toBe(true);
  });
});

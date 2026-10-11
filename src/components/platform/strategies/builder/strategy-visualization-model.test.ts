import { describe, expect, it } from 'vitest';

import { createEmptyStrategyDraft } from './strategy-builder-model';
import { getStrategyVisualizationModel } from './strategy-visualization-model';

describe('strategy visualization model', () => {
  it('returns null for an incomplete custom draft', () => {
    const draft = createEmptyStrategyDraft();
    const result = getStrategyVisualizationModel({
      strategyId: draft.id,
      ticker: 'COMI',
      draft,
      advancedNodes: [],
      indicators: [],
    });
    expect(result).toBeNull();
  });

  it('produces valid OHLC points and legend mappings for protected Typhon strategy', () => {
    const draft = createEmptyStrategyDraft();
    const result = getStrategyVisualizationModel({
      strategyId: 'psi',
      ticker: 'COMI',
      draft,
      advancedNodes: [],
      indicators: [],
    });

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.ticker).toBe('COMI');
    expect(result.points).toHaveLength(52);
    expect(result.panes).toHaveLength(2);
    expect(result.markers.length).toBeGreaterThan(0);
    expect(result.legendItems.length).toBeGreaterThanOrEqual(4);

    for (const point of result.points) {
      expect(point.high).toBeGreaterThanOrEqual(Math.max(point.open, point.close));
      expect(point.low).toBeLessThanOrEqual(Math.min(point.open, point.close));
      expect(point.low).toBeGreaterThan(0);
      expect(point.volume).toBeGreaterThan(0);
    }

    const buyItem = result.legendItems.find((item) => item.kind === 'signal' && item.color === 'var(--plt-profit)');
    const sellItem = result.legendItems.find((item) => item.kind === 'signal' && item.color === 'var(--plt-risk)');
    expect(buyItem?.id).toBe('typhon-entry');
    expect(sellItem?.id).toBe('typhon-aym-target');
  });

  it('generates visualization for completed custom strategy draft', () => {
    const draft = {
      ...createEmptyStrategyDraft(),
      buyRules: [{ id: 'b1', indicatorId: 'rsi', period: 14, operator: 'crossesAbove' as const, value: 30, connector: 'and' as const }],
      sellRules: [{ id: 's1', indicatorId: 'rsi', period: 14, operator: 'crossesBelow' as const, value: 70, connector: 'and' as const }],
    };

    const result = getStrategyVisualizationModel({
      strategyId: draft.id,
      ticker: 'SWDY',
      draft,
      advancedNodes: [],
      indicators: [{ id: 'rsi', backlogId: 'M-1', name: 'RSI', description: 'desc', category: 'Momentum', available: true }],
    });

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.ticker).toBe('SWDY');
    expect(result.panes[0].name).toBe('RSI');
    const buyMarker = result.markers.find((m) => m.side === 'buy');
    expect(buyMarker?.blockId).toBe('b1');
  });

  it('generates valid distinct visualization models for all major EGX tickers', () => {
    const draft = createEmptyStrategyDraft();
    const tickers = ['COMI', 'SWDY', 'EAST', 'TMGH', 'FWRY', 'ETEL', 'ORAS', 'AMOC', 'ESRS'];

    for (const ticker of tickers) {
      const result = getStrategyVisualizationModel({
        strategyId: 'psi',
        ticker,
        draft,
        advancedNodes: [],
        indicators: [],
      });

      expect(result).not.toBeNull();
      expect(result?.ticker).toBe(ticker);
      expect(result?.points).toHaveLength(52);
      expect(result?.points[0].open).toBeGreaterThan(0);
      expect(result?.points[0].close).toBeGreaterThan(0);
    }
  });
});

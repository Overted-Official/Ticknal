import { describe, expect, it } from 'vitest';
import { getStrategyVisualizationModel } from '../../src/components/platform/strategies/builder/strategy-visualization-model';
import { createAdvancedDraftNodes, TYPHON_BLUEPRINT_NODES } from '../../src/components/platform/strategies/builder/advanced-strategy-model';
import { createEmptyStrategyDraft } from '../../src/components/platform/strategies/builder/strategy-builder-model';

const indicators = [{ id: 'rsi', backlogId: 'MOM-001', name: 'RSI', description: 'Momentum', category: 'momentum', available: true }];
const completeDraft = { ...createEmptyStrategyDraft(), buyRules: [{ id: 'b', indicatorId: 'rsi', period: 14, operator: 'crossesAbove' as const, value: 30, connector: 'and' as const }], sellRules: [{ id: 's', indicatorId: 'missing', period: 14, operator: 'crossesBelow' as const, value: 70, connector: 'and' as const }] };

describe('strategy visualization model', () => {
  it('is deterministic, chronological, and anchors markers to real points', () => {
    const input = { strategyId: 'psi', ticker: 'COMI', draft: completeDraft, advancedNodes: TYPHON_BLUEPRINT_NODES, indicators };
    const first = getStrategyVisualizationModel(input)!;
    expect(first).toEqual(getStrategyVisualizationModel(input));
    expect(first.points.map((point) => point.date)).toEqual([...first.points.map((point) => point.date)].sort());
    expect(first.markers.every((marker) => first.points.some((point) => point.date === marker.date))).toBe(true);
    expect(first.panes.map((pane) => pane.name).join(' ')).toMatch(/Master Index.*EMA/);
  });

  it('returns null for incomplete custom drafts and stable unknown panes for complete drafts', () => {
    expect(getStrategyVisualizationModel({ strategyId: 'custom-draft', ticker: 'SWDY', draft: createEmptyStrategyDraft(), advancedNodes: createAdvancedDraftNodes(), indicators })).toBeNull();
    const model = getStrategyVisualizationModel({ strategyId: 'custom-draft', ticker: 'EAST', draft: completeDraft, advancedNodes: createAdvancedDraftNodes(), indicators })!;
    expect(model.panes.map((pane) => pane.name)).toEqual(['RSI', 'Unknown indicator']);
    expect(model.panes[1].values).toEqual(getStrategyVisualizationModel({ strategyId: 'custom-draft', ticker: 'EAST', draft: completeDraft, advancedNodes: createAdvancedDraftNodes(), indicators })!.panes[1].values);
  });
});

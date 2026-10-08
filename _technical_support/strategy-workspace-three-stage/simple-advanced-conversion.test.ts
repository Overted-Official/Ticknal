import { describe, expect, it } from 'vitest';

import {
  createAdvancedNodeFromTemplate,
  hasAdvancedOnlyFeatures,
  projectSimpleDraftIntoAdvancedNodes,
} from '../../src/components/platform/strategies/builder/advanced-builder-state';
import {
  ADVANCED_BLOCK_TEMPLATES,
  createAdvancedDraftNodes,
  type AdvancedStrategyNode,
} from '../../src/components/platform/strategies/builder/advanced-strategy-model';
import type {
  StrategyBuilderIndicatorOption,
  StrategyDraft,
} from '../../src/components/platform/strategies/builder/strategy-builder-model';

const INDICATORS: readonly StrategyBuilderIndicatorOption[] = [{
  id: 'rsi',
  backlogId: 'MOM-001',
  name: 'Relative Strength Index',
  description: 'Momentum oscillator',
  category: 'momentum',
  available: true,
}];

const DRAFT: StrategyDraft = {
  id: 'custom-draft',
  name: 'Projection test',
  buyRules: [{
    id: 'buy-rsi',
    indicatorId: 'rsi',
    period: 7,
    operator: 'crossesAbove',
    value: 30,
    connector: 'and',
  }],
  sellRules: [{
    id: 'sell-unknown',
    indicatorId: 'missing-indicator',
    period: 21,
    operator: 'crossesBelow',
    value: 70,
    connector: 'or',
  }],
};

function nodeById(nodes: readonly AdvancedStrategyNode[], id: string): AdvancedStrategyNode {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Missing node ${id}`);
  return node;
}

describe('simple to advanced projection', () => {
  it('preserves every simple rule parameter and connects each action terminal', () => {
    const nodes = projectSimpleDraftIntoAdvancedNodes(DRAFT, INDICATORS, createAdvancedDraftNodes());

    expect(nodeById(nodes, 'simple-buy-buy-rsi')).toMatchObject({
      customName: 'Relative Strength Index',
      parameters: {
        sourceRuleId: 'buy-rsi',
        actionSide: 'buy',
        indicatorId: 'rsi',
        indicatorName: 'Relative Strength Index',
        period: '7',
        operator: 'crossesAbove',
        compareValue: '30',
        connector: 'and',
      },
    });
    expect(nodeById(nodes, 'simple-sell-sell-unknown')).toMatchObject({
      customName: 'Unknown indicator',
      parameters: {
        sourceRuleId: 'sell-unknown',
        actionSide: 'sell',
        indicatorId: 'missing-indicator',
        indicatorName: 'Unknown indicator',
        period: '21',
        operator: 'crossesBelow',
        compareValue: '70',
        connector: 'or',
      },
    });
    expect(nodeById(nodes, 'custom-buy-logic').connections).toContain('simple-buy-buy-rsi');
    expect(nodeById(nodes, 'custom-sell-logic').connections).toContain('simple-sell-sell-unknown');
  });

  it('is idempotent, updates projected rules, and preserves manual nodes and connections', () => {
    const conditionTemplate = ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'condition')!;
    const manualNode: AdvancedStrategyNode = {
      ...createAdvancedNodeFromTemplate(conditionTemplate, 'manual-buy'),
      parameters: { actionSide: 'buy', operator: 'isAbove', compareValue: '50' },
    };
    const starting = [...createAdvancedDraftNodes(), manualNode].map((node) => node.id === 'custom-buy-logic'
      ? { ...node, connections: ['manual-buy'] }
      : node);
    const first = projectSimpleDraftIntoAdvancedNodes(DRAFT, INDICATORS, starting);
    const updatedDraft: StrategyDraft = {
      ...DRAFT,
      buyRules: [{ ...DRAFT.buyRules[0], period: 10, value: 35 }],
    };
    const second = projectSimpleDraftIntoAdvancedNodes(updatedDraft, INDICATORS, first);

    expect(second.filter((node) => node.id === 'simple-buy-buy-rsi')).toHaveLength(1);
    expect(nodeById(second, 'simple-buy-buy-rsi').parameters).toMatchObject({ period: '10', compareValue: '35' });
    expect(nodeById(second, 'manual-buy')).toEqual(manualNode);
    expect(nodeById(second, 'custom-buy-logic').connections).toEqual(['manual-buy', 'simple-buy-buy-rsi']);
  });

  it('removes only projected nodes whose source rules were deleted', () => {
    const first = projectSimpleDraftIntoAdvancedNodes(DRAFT, INDICATORS, createAdvancedDraftNodes());
    const next = projectSimpleDraftIntoAdvancedNodes({ ...DRAFT, sellRules: [] }, INDICATORS, first);

    expect(next.some((node) => node.id === 'simple-sell-sell-unknown')).toBe(false);
    expect(next.some((node) => node.id === 'simple-buy-buy-rsi')).toBe(true);
    expect(nodeById(next, 'custom-sell-logic').connections).not.toContain('simple-sell-sell-unknown');
  });

  it('detects advanced-only features without mutating the node collection', () => {
    const projected = projectSimpleDraftIntoAdvancedNodes(DRAFT, INDICATORS, createAdvancedDraftNodes());
    const snapshot = structuredClone(projected);
    const advancedTemplateIds = ['weighted-composite', 'priority-trigger', 'position-memory', 'dynamic-target', 'condition'];

    expect(hasAdvancedOnlyFeatures(projected)).toBe(false);
    for (const templateId of advancedTemplateIds) {
      const template = ADVANCED_BLOCK_TEMPLATES.find((candidate) => candidate.id === templateId)!;
      const node = createAdvancedNodeFromTemplate(template, `manual-${templateId}`);
      expect(hasAdvancedOnlyFeatures([...projected, node])).toBe(true);
    }
    expect(projected).toEqual(snapshot);
  });
});

import { describe, expect, it } from 'vitest';

import { createAdvancedDraftNodes } from './advanced-strategy-model';
import { moveAdvancedNode, projectSimpleDraftIntoAdvancedNodes, reconcileSimpleDraftFromFlow } from './advanced-builder-state';
import { addRuleToDraft, createEmptyStrategyDraft } from './strategy-builder-model';

const indicator = { id: 'rsi', formulaVersion: '1.0.0', backlogId: 'MOM-001', name: 'RSI', description: 'Momentum', category: 'Momentum', available: true, defaultParameters: { period: 14 }, outputs: [{ key: 'rsi', kind: 'number' as const, unit: 'percent' as const }], requiredCapabilities: [] };

describe('simple strategy flow editing', () => {
  it('saves the connector and comparison edited on a rule card', () => {
    const draft = addRuleToDraft(createEmptyStrategyDraft(), 'buy', indicator);
    const nodes = projectSimpleDraftIntoAdvancedNodes(draft, [indicator], createAdvancedDraftNodes());
    const edited = nodes.map((node) => node.parameters?.sourceRuleId
      ? { ...node, parameters: { ...node.parameters, connector: 'or', compareValue: '55' } }
      : node);

    expect(reconcileSimpleDraftFromFlow(draft, edited).buyRules[0]).toMatchObject({ connector: 'or', value: 55 });
  });

  it('removes only the rule whose card was deleted', () => {
    const draft = addRuleToDraft(addRuleToDraft(createEmptyStrategyDraft(), 'buy', indicator), 'sell', indicator);
    const nodes = projectSimpleDraftIntoAdvancedNodes(draft, [indicator], createAdvancedDraftNodes());
    const retained = nodes.filter((node) => node.parameters?.actionSide !== 'buy');

    expect(reconcileSimpleDraftFromFlow(draft, retained).buyRules).toEqual([]);
    expect(reconcileSimpleDraftFromFlow(draft, retained).sellRules).toHaveLength(1);
  });

  it('round-trips the selected output through an editable flow card', () => {
    const draft = addRuleToDraft(createEmptyStrategyDraft(), 'buy', indicator);
    const nodes = projectSimpleDraftIntoAdvancedNodes(draft, [indicator], createAdvancedDraftNodes());
    const edited = nodes.map((node) => node.parameters?.sourceRuleId
      ? { ...node, parameters: { ...node.parameters, outputKey: 'signal' } }
      : node);

    expect(reconcileSimpleDraftFromFlow(draft, edited).buyRules[0].outputKey).toBe('signal');
  });
});

describe('advanced stage ordering', () => {
  it('keeps protected source cards fixed while allowing other cards to reorder within a stage', () => {
    const protectedSource = createAdvancedDraftNodes()[0];
    const first = { ...protectedSource, id: 'first-indicator', protected: false };
    const second = { ...protectedSource, id: 'second-indicator', protected: false };
    const nodes = [protectedSource, first, second];

    const reordered = moveAdvancedNode(nodes, second.id, 'up');
    expect(reordered.map((node) => node.id)).toEqual([protectedSource.id, second.id, first.id]);
    expect(moveAdvancedNode(reordered, second.id, 'up')).toBe(reordered);
    expect(moveAdvancedNode(nodes, protectedSource.id, 'down')).toBe(nodes);
  });
});

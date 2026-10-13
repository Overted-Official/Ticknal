import { describe, expect, it } from 'vitest';

import { createAdvancedDraftNodes, TYPHON_BLUEPRINT_NODES, type AdvancedStrategyNode } from './advanced-strategy-model';
import { projectSimpleDraftIntoAdvancedNodes } from './advanced-builder-state';
import { createEmptyStrategyDraft } from './strategy-builder-model';
import { buildStrategyFlow, canRemoveOptionalStage, getCanvasStage, getEdgeAttachment, getStageTemplateIds } from './strategy-flow-model';

describe('strategy flow stages', () => {
  it('places advanced cards inside fixed stages and omits redundant output cards', () => {
    const flow = buildStrategyFlow(TYPHON_BLUEPRINT_NODES, true, 'advanced');

    expect(flow.stages.map((stage) => stage.id)).toEqual(['data', 'indicators', 'calculations', 'buy', 'position', 'sell']);
    expect(flow.nodes.find((node) => node.id === 'typhon-rsi')?.parentId).toBe('stage-indicators');
    const data = flow.stages.find((stage) => stage.id === 'data')!;
    const indicators = flow.stages.find((stage) => stage.id === 'indicators')!;
    const calculations = flow.stages.find((stage) => stage.id === 'calculations')!;
    expect(indicators.position.x).toBeGreaterThanOrEqual(data.position.x + data.width);
    expect(indicators.position.y).toBe(data.position.y);
    expect(indicators.height).toBe(data.height);
    expect(calculations.position.x).toBeGreaterThanOrEqual(indicators.position.x + indicators.width);
    expect(flow.nodes.find((node) => node.id === 'typhon-master-index')?.parentId).toBe('stage-calculations');
    expect(flow.nodes.find((node) => node.id === 'typhon-aym-target')?.parentId).toBe('stage-sell');
    expect(flow.nodes.some((node) => node.id === 'typhon-sell-logic')).toBe(false);
    expect(flow.edges.some((edge) => edge.target === 'typhon-sell-logic')).toBe(false);
    expect(flow.nodes.every((node) => node.extent === 'parent')).toBe(true);
  });

  it('shows only buy and sell rule stages in simple mode', () => {
    const rules: AdvancedStrategyNode[] = [
      { id: 'buy-rsi', stage: 'entry', kind: 'decision', title: { en: 'RSI buy', ar: 'شراء' }, summary: { en: 'Buy', ar: 'شراء' }, parameters: { sourceRuleId: 'rsi-buy', actionSide: 'buy' } },
      { id: 'sell-rsi', stage: 'entry', kind: 'decision', title: { en: 'RSI sell', ar: 'بيع' }, summary: { en: 'Sell', ar: 'بيع' }, parameters: { sourceRuleId: 'rsi-sell', actionSide: 'sell' } },
    ];
    const flow = buildStrategyFlow([...createAdvancedDraftNodes(), ...rules], false, 'simple');

    expect(flow.stages.map((stage) => stage.id)).toEqual(['buy', 'sell']);
    expect(flow.nodes.map((node) => [node.id, node.parentId])).toEqual([
      ['buy-rsi', 'stage-buy'],
      ['sell-rsi', 'stage-sell'],
    ]);
    expect(flow.edges).toEqual([]);
  });

  it('shows protected strategy entry and exit conditions in simple mode without exposing calculations', () => {
    const flow = buildStrategyFlow(TYPHON_BLUEPRINT_NODES, true, 'simple');

    expect(flow.nodes.map((node) => node.id)).toEqual(['typhon-entry', 'typhon-aym-target', 'typhon-atr-trail']);
  });

  it('keeps optional stages visible when explicitly enabled and prevents removing populated stages', () => {
    const nodes = createAdvancedDraftNodes();
    const flow = buildStrategyFlow(nodes, false, 'advanced', ['calculations', 'position']);

    expect(flow.stages.map((stage) => stage.id)).toEqual(['data', 'indicators', 'calculations', 'buy', 'position', 'sell']);
    expect(canRemoveOptionalStage(nodes, 'calculations')).toBe(true);
    expect(canRemoveOptionalStage(TYPHON_BLUEPRINT_NODES, 'calculations')).toBe(false);
    expect(getCanvasStage(TYPHON_BLUEPRINT_NODES[2], 'advanced')).toBe('indicators');
  });

  it('offers only cards that belong to the selected advanced stage', () => {
    expect(getStageTemplateIds('data')).toEqual(['market-input', 'parameter']);
    expect(getStageTemplateIds('indicators')).toEqual(['indicator']);
    expect(getStageTemplateIds('calculations')).toEqual(['weighted-composite', 'transform', 'rolling-statistic', 'math-operation']);
    expect(getStageTemplateIds('buy')).toEqual(['condition', 'priority-trigger']);
    expect(getStageTemplateIds('position')).toEqual(['position-memory', 'rolling-state']);
    expect(getStageTemplateIds('sell')).toEqual(['sell-condition', 'dynamic-target', 'trailing-exit']);
  });

  it('promotes a simple sell rule into the sell stage when switching to advanced', () => {
    const draft = { ...createEmptyStrategyDraft(), sellRules: [{ id: 'sell-rsi', indicatorId: 'rsi', period: 14, operator: 'crossesBelow' as const, value: 70, connector: 'or' as const }] };
    const nodes = projectSimpleDraftIntoAdvancedNodes(draft, [{ id: 'rsi', formulaVersion: '1.0.0', backlogId: 'MOM-001', name: 'RSI', description: 'Momentum', category: 'Momentum', available: true, defaultParameters: { period: 14 }, outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }], requiredCapabilities: [] }], createAdvancedDraftNodes());

    expect(nodes.find((node) => node.parameters?.sourceRuleId === 'sell-rsi')).toMatchObject({ stage: 'exit', kind: 'exit' });
  });
});

describe('strategy connection attachments', () => {
  const upper = { x: 370, y: 260, width: 248, height: 170 };
  const lower = { x: 370, y: 550, width: 248, height: 90 };

  it('connects stacked cards from the upper bottom to the lower top', () => {
    expect(getEdgeAttachment(upper, lower)).toEqual({ sourceHandle: 'out-bottom', targetHandle: 'in-top' });
  });

  it('reverses the vertical attachment when a card is dragged above its source', () => {
    expect(getEdgeAttachment(lower, upper)).toEqual({ sourceHandle: 'out-top', targetHandle: 'in-bottom' });
  });

  it('keeps cross-column connections horizontal even when cards differ in height', () => {
    expect(getEdgeAttachment({ x: 32, y: 650, width: 248, height: 170 }, upper)).toEqual({ sourceHandle: 'out-right', targetHandle: 'in-left' });
  });

  it('connects a right-hand source to a left-hand target on their facing sides', () => {
    expect(getEdgeAttachment({ x: 700, y: 260, width: 248, height: 170 }, upper)).toEqual({ sourceHandle: 'out-left', targetHandle: 'in-right' });
  });
});

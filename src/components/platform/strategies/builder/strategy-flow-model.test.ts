import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AdvancedNodeEditor from './AdvancedNodeEditor';
import AdvancedBlockLibraryModal from './AdvancedBlockLibraryModal';
import { shouldStopStudioSelectKeyPropagation } from './StudioSelect';
import { ADVANCED_BLOCK_TEMPLATES, createAdvancedDraftNodes, TYPHON_BLUEPRINT_NODES, type AdvancedStrategyNode } from './advanced-strategy-model';
import { projectSimpleDraftIntoAdvancedNodes } from './advanced-builder-state';
import { createEmptyStrategyDraft } from './strategy-builder-model';
import { buildStrategyFlow, canRemoveOptionalStage, getCanvasStage, getEdgeAttachment, getReadableStrategyViewport, getStageTemplateIds } from './strategy-flow-model';

describe('strategy flow stages', () => {
  it('offers explicit execution choices and warns about signal-close assumptions', () => {
    const template = ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === 'execution-policy')!;
    expect(getStageTemplateIds('data')).toContain('execution-policy');
    const node: AdvancedStrategyNode = { id: 'execution', stage: 'inputs', kind: 'input', templateId: 'execution-policy', title: template.title, summary: template.description, parameters: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' } };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Fill timing');
    expect(markup).toContain('Share sizing');
    expect(markup).toContain('optimistic');
  });
  it('labels value and regime inputs on a regime calculation card', () => {
    const node: AdvancedStrategyNode = {
      id: 'peak', stage: 'signal', kind: 'calculation', templateId: 'math-operation',
      title: { en: 'Math operation', ar: 'عملية حسابية' }, summary: { en: 'Peak', ar: 'قمة' },
      parameters: { operation: 'regimeMaximum' }, connections: [],
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Value to track');
    expect(markup).toContain('Regime identifier');
  });
  it('offers company overrides on a reusable value card', () => {
    const node: AdvancedStrategyNode = {
      id: 'level', stage: 'inputs', kind: 'input', templateId: 'parameter',
      title: { en: 'Reusable value', ar: 'قيمة قابلة لإعادة الاستخدام' },
      summary: { en: 'A value', ar: 'قيمة' },
      parameters: { value: '10', symbolOverrides: '[{"symbol":"COMI","value":20}]' },
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Company-specific values');
    expect(markup).toContain('COMI');
    expect(markup).toContain('Add company');
  });
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
    expect(flow.stages.every((stage) => stage.width >= 340)).toBe(true);
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
    expect(getStageTemplateIds('data')).toEqual(['market-input', 'parameter', 'execution-policy']);
    expect(getStageTemplateIds('indicators')).toEqual(['indicator']);
    expect(getStageTemplateIds('calculations')).toEqual(['weighted-composite', 'condition-score', 'ticker-select', 'formula', 'formula-output', 'rbf-model', 'transform', 'rolling-statistic', 'math-operation']);
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

describe('strategy studio editor controls', () => {
  it('shows explicit bounds for a custom clamped signal', () => {
    const node: AdvancedStrategyNode = {
      id: 'bounded', stage: 'signal', kind: 'calculation', templateId: 'transform',
      title: { en: 'Transform', ar: 'تحويل' }, summary: { en: 'Bound a value', ar: 'تحديد قيمة' },
      parameters: { method: 'clamp', lowerBound: '0', upperBound: '100' },
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('Lower bound');
    expect(markup).toContain('Upper bound');
    expect(markup).not.toContain('>Period<');
  });

  it('shows a calculation as the selected trailing volatility source', () => {
    const atr: AdvancedStrategyNode = {
      id: 'atr', stage: 'signal', kind: 'calculation', templateId: 'transform', customName: 'My ATR',
      title: { en: 'Transform', ar: 'تحويل' }, summary: { en: 'ATR value', ar: 'قيمة ATR' },
    };
    const tracked: AdvancedStrategyNode = {
      id: 'tracked', stage: 'state', kind: 'state', templateId: 'rolling-state',
      title: { en: 'Tracked high', ar: 'قمة متتبعة' }, summary: { en: 'High', ar: 'قمة' },
    };
    const trail: AdvancedStrategyNode = {
      id: 'trail', stage: 'exit', kind: 'exit', templateId: 'trailing-exit',
      title: { en: 'Trailing stop', ar: 'وقف متحرك' }, summary: { en: 'Trail', ar: 'وقف' },
      connections: ['tracked'], parameters: { volatilitySourceId: 'atr', distance: '2' },
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node: trail, nodes: [atr, tracked, trail], indicators: [], locale: 'en', onChange: () => {},
    }));
    expect(markup).toContain('My ATR');
    expect(markup).toContain('Volatility source');
  });
  it('labels the advanced block library with the stage receiving the card', () => {
    const markup = renderToStaticMarkup(createElement(AdvancedBlockLibraryModal, {
      templateIds: ['transform'],
      title: { en: 'Calculations', ar: 'الحسابات' },
      search: { en: 'Search cards', ar: 'ابحث عن بطاقة' },
      locale: 'en',
      onAdd: () => {},
      onClose: () => {},
    }));

    expect(markup).toContain('Block library');
    expect(markup).toContain('Add to Calculations');
    expect(markup).toContain('strategy-library-panel');
  });

  it('isolates select-menu keys from workflow canvas shortcuts', () => {
    expect(['ArrowDown', 'ArrowUp', 'Enter', 'Delete'].every(shouldStopStudioSelectKeyPropagation)).toBe(true);
    expect(shouldStopStudioSelectKeyPropagation('Tab')).toBe(false);
  });

  it('renders branded dropdown triggers instead of native selects', () => {
    const node: AdvancedStrategyNode = {
      id: 'market-input-test', stage: 'inputs', kind: 'input', templateId: 'market-input',
      title: { en: 'Market data', ar: 'بيانات السوق' }, summary: { en: 'OHLCV', ar: 'الأسعار' },
      parameters: { series: 'ohlcv', field: 'close' },
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));

    expect(markup).not.toContain('<select');
    expect(markup.match(/aria-haspopup="listbox"/g)).toHaveLength(2);
  });

  it('stacks indicator settings fields so names are not compressed into two columns', () => {
    const node: AdvancedStrategyNode = {
      id: 'indicator-test', stage: 'inputs', kind: 'input', templateId: 'indicator',
      title: { en: 'Indicator', ar: 'مؤشر' }, summary: { en: 'Technical signal', ar: 'إشارة فنية' },
      parameters: { period: '14' },
    };
    const markup = renderToStaticMarkup(createElement(AdvancedNodeEditor, {
      node, nodes: [node], indicators: [], locale: 'en', onChange: () => {},
    }));

    expect(markup).toContain('class="flex flex-col gap-3"');
  });
});

describe('strategy viewport readability', () => {
  it('starts a multi-stage workflow at readable zoom with the first stage visible', () => {
    const viewport = getReadableStrategyViewport({ x: -350, y: 10, zoom: 0.35 }, { x: 32, y: 24, width: 2252, height: 700 }, 6);
    expect(viewport.zoom).toBeGreaterThanOrEqual(0.75);
    expect(viewport.x + 32 * viewport.zoom).toBeCloseTo(24);
    expect(viewport.y + 24 * viewport.zoom).toBeCloseTo(16);
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

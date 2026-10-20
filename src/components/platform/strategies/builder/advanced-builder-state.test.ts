import { describe, expect, it } from 'vitest';

import { ADVANCED_BLOCK_TEMPLATES, createAdvancedDraftNodes } from './advanced-strategy-model';
import { createAdvancedIndicatorNode, createAdvancedNodeFromTemplate, createMarketInputBundle, duplicateAdvancedModule, makeConditionScoreChanges, moveAdvancedNode, projectSimpleDraftIntoAdvancedNodes, reconcileSimpleDraftFromFlow, updateMarketInputBundle } from './advanced-builder-state';
import { compileAdvancedStrategy } from './compile-advanced-strategy';
import { addRuleToDraft, createEmptyStrategyDraft } from './strategy-builder-model';
import { parseSavedStrategy } from '../../../../lib/strategies/server/parse-saved-strategy';
import { parseUniverseBacktestRequest } from '../../../../lib/strategies/server/parse-universe-backtest-request';

const indicator = { id: 'rsi', formulaVersion: '1.0.0', backlogId: 'MOM-001', name: 'RSI', description: 'Momentum', category: 'Momentum', available: true, defaultParameters: { period: 14 }, outputs: [{ key: 'rsi', kind: 'number' as const, unit: 'percent' as const }], requiredCapabilities: [] };

describe('simple strategy flow editing', () => {
  it('adds the shared market source only when a blank draft gains a rule', () => {
    const blank = createEmptyStrategyDraft();
    expect(projectSimpleDraftIntoAdvancedNodes(blank, [indicator], [])).toEqual([]);
    const withRule = projectSimpleDraftIntoAdvancedNodes(addRuleToDraft(blank, 'buy', indicator), [indicator], []);
    expect(withRule.map((node) => node.id)).toContain('custom-market-data');
    expect(withRule.find((node) => node.parameters?.sourceRuleId)?.connections).toEqual(['custom-market-data']);
  });
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

describe('advanced draft editing', () => {
  const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;

  it('joins a newly created second buy rule with AND as shown in its settings', () => {
    const close = { ...createAdvancedNodeFromTemplate(template('market-input'), 'close'), parameters: { series: 'ohlcv', field: 'close' } };
    const first = { ...createAdvancedNodeFromTemplate(template('condition'), 'first'), connections: ['close'] };
    const second = { ...createAdvancedNodeFromTemplate(template('condition'), 'second'), connections: ['close'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['close'] };
    const result = compileAdvancedStrategy([close, first, second, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.buy.map((branch) => branch.map((rule) => rule.id))).toEqual([['first', 'second']]);
  });

  it('retains OR semantics for older saved rules with no connector', () => {
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const old = (id: string) => ({ ...createAdvancedNodeFromTemplate(template('condition'), id), connections: ['close'], parameters: { operator: 'crossesAbove', compareMode: 'value', compareValue: '0' } });
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['close'] };
    const result = compileAdvancedStrategy([close, old('first'), old('second'), sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.buy.map((branch) => branch.map((rule) => rule.id))).toEqual([['first'], ['second']]);
  });

  it('adds and removes OHLCV fields without changing retained connections', () => {
    const bundle = createMarketInputBundle(['high', 'low', 'close'], 'bundle');
    const consumer = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['bundle-high'] };
    const changed = updateMarketInputBundle([...bundle, consumer], 'bundle', ['open', 'high', 'close']);
    expect(changed?.filter((node) => node.moduleId === 'bundle').map((node) => node.parameters?.field).sort()).toEqual(['close', 'high', 'open']);
    expect(changed?.find((node) => node.id === 'buy')?.connections).toEqual(['bundle-high']);
    expect(updateMarketInputBundle([...bundle, consumer], 'bundle', ['low', 'close'])).toBeNull();
  });

  it('duplicates a module with fresh IDs and remapped internal links', () => {
    const source = createMarketInputBundle(['high', 'low'], 'market');
    const first = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'calc-a'), moduleId: 'module', moduleName: 'Spread', connections: ['market-high'] };
    const second = { ...createAdvancedNodeFromTemplate(template('transform'), 'calc-b'), moduleId: 'module', moduleName: 'Spread', connections: ['calc-a'] };
    const cloned = duplicateAdvancedModule([...source, first, second], 'module', 'module-copy');
    expect(cloned).not.toBeNull();
    const copies = cloned!.filter((node) => node.moduleId === 'module-copy');
    expect(copies).toHaveLength(2);
    expect(copies[0].connections).toEqual(['market-high']);
    expect(copies[1].connections).toEqual([copies[0].id]);
    expect(copies[1].moduleName).toBe('Spread copy');
  });

  it('starts a copied rule module as a separate branch and keeps its internal AND', () => {
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const first = { ...createAdvancedNodeFromTemplate(template('condition'), 'level-1'), moduleId: 'levels', moduleName: 'Levels', connections: ['close'], parameters: { operator: 'crossesAbove', compareMode: 'value', compareValue: '30', connector: 'and' } };
    const second = { ...createAdvancedNodeFromTemplate(template('condition'), 'level-2'), moduleId: 'levels', moduleName: 'Levels', connections: ['close'], parameters: { operator: 'crossesAbove', compareMode: 'value', compareValue: '50', connector: 'and' } };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['close'] };
    const copied = duplicateAdvancedModule([close, first, second, sell], 'levels', 'levels-copy');
    const result = compileAdvancedStrategy(copied!, []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.buy.map((branch) => branch.length)).toEqual([2, 2]);
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

describe('advanced indicator selection', () => {
  it('creates a configured indicator card directly from a library selection', () => {
    const node = createAdvancedIndicatorNode(indicator, 'selected-rsi');

    expect(node).toMatchObject({
      id: 'selected-rsi',
      templateId: 'indicator',
      customName: 'RSI',
      parameters: {
        indicatorId: 'rsi',
        indicatorName: 'RSI',
        indicatorBacklogId: 'MOM-001',
        period: '14',
        outputKey: 'rsi',
      },
    });
  });

  it('leaves multi-output indicators awaiting an explicit output choice', () => {
    const node = createAdvancedIndicatorNode({
      ...indicator,
      outputs: [
        { key: 'macd', kind: 'number', unit: 'price' },
        { key: 'signal', kind: 'number', unit: 'price' },
      ],
      defaultParameters: { fast: 12, slow: 26 },
    }, 'selected-macd');

    expect(node.parameters).toMatchObject({ indicatorId: 'rsi', indicatorName: 'RSI' });
    expect(node.parameters).not.toHaveProperty('outputKey');
    expect(node.parameters).not.toHaveProperty('period');
  });

  it('passes edited indicator-specific parameters into the executable program', () => {
    const catalogItem = { ...indicator, defaultParameters: { fast: 12, slow: 26 }, outputs: [{ key: 'macd', kind: 'number' as const, unit: 'price' as const }] };
    const market = createAdvancedNodeFromTemplate(ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'market-input')!, 'market');
    const configured = createAdvancedIndicatorNode(catalogItem, 'macd');
    const signal = { ...configured, connections: ['market'], parameters: { ...configured.parameters, fast: '9', slow: '21' } };
    const buy = { ...createAdvancedNodeFromTemplate(ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'condition')!, 'buy'), connections: ['macd'] };
    const sell = { ...createAdvancedNodeFromTemplate(ADVANCED_BLOCK_TEMPLATES.find((template) => template.id === 'sell-condition')!, 'sell'), connections: ['macd'] };
    const result = compileAdvancedStrategy([market, signal, buy, sell], [catalogItem]);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'macd')).toMatchObject({ parameters: { fast: 9, slow: 21 } });
    const invalid = compileAdvancedStrategy([market, { ...signal, parameters: { ...signal.parameters, fast: 'abc' } }, buy, sell], [catalogItem]);
    expect(invalid.status).toBe('invalid');
  });
});

describe('advanced causal calculations', () => {
  it('compiles a reusable weighted condition score from ordinary market inputs', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const score = { ...createAdvancedNodeFromTemplate(template('condition-score'), 'score'), connections: ['close'], parameters: { conditions: JSON.stringify([
      { inputId: 'close', operator: 'gt', threshold: 10, weight: 1 },
      { inputId: 'close', operator: 'gte', threshold: 12, weight: 3 },
    ]) } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['score'], parameters: { operator: 'crossesAbove', compareMode: 'value', compareValue: '50' } };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['score'], parameters: { operator: 'crossesBelow', compareMode: 'value', compareValue: '50' } };
    const result = compileAdvancedStrategy([close, score, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'score')).toMatchObject({ kind: 'condition-score', conditions: [
      { inputId: 'close', operator: 'gt', threshold: 10, weight: 1 },
      { inputId: 'close', operator: 'gte', threshold: 12, weight: 3 },
    ] });
  });
  it('saves a score with twelve independent series comparisons', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const sources = Array.from({ length: 24 }, (_, index) => createAdvancedNodeFromTemplate(template('market-input'), `source-${index}`));
    const conditions = Array.from({ length: 12 }, (_, index) => ({ inputId: `source-${index}`, compareInputId: `source-${index + 12}`, operator: 'gt', threshold: 0, weight: 1 }));
    const score = { ...createAdvancedNodeFromTemplate(template('condition-score'), 'score'), connections: sources.map((source) => source.id), parameters: { conditions: JSON.stringify(conditions) } };
    const draft = { ...createEmptyStrategyDraft(), id: 'custom-score', name: 'Score' };
    expect(parseSavedStrategy({ id: draft.id, name: draft.name, mode: 'advanced', draft, nodes: [...sources, score] }).success).toBe(true);
  });
  it('keeps visual connections aligned with comparisons edited inside a score card', () => {
    const changes = makeConditionScoreChanges({}, [
      { inputId: 'close', operator: 'gt', threshold: '10', weight: '2' },
      { inputId: 'rsi', compareInputId: 'close', operator: 'lte', threshold: '0', weight: '1' },
    ]);
    expect(changes.connections).toEqual(['close', 'rsi']);
    expect(JSON.parse(changes.parameters.conditions)).toHaveLength(2);
  });
  it('remaps score comparisons when their source and score card are duplicated together', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const source = { ...createAdvancedNodeFromTemplate(template('transform'), 'smooth'), moduleId: 'module', moduleName: 'Signal', connections: ['close'] };
    const score = { ...createAdvancedNodeFromTemplate(template('condition-score'), 'score'), moduleId: 'module', moduleName: 'Signal', connections: ['smooth'], parameters: { conditions: '[{"inputId":"smooth","operator":"gt","threshold":10,"weight":1}]' } };
    const copied = duplicateAdvancedModule([market, source, score], 'module', 'module-copy');
    expect(copied).not.toBeNull();
    const copiedSource = copied!.find((node) => node.moduleId === 'module-copy' && node.templateId === 'transform')!;
    const copiedScore = copied!.find((node) => node.moduleId === 'module-copy' && node.templateId === 'condition-score')!;
    expect(copiedScore.connections).toEqual([copiedSource.id]);
    expect(JSON.parse(copiedScore.parameters!.conditions)[0].inputId).toBe(copiedSource.id);
  });
  it('compiles a per-company choice between two calculated profiles', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const alternate = { ...createAdvancedNodeFromTemplate(template('transform'), 'alternate'), connections: ['close'], parameters: { method: 'ema', period: '3' } };
    const profile = { ...createAdvancedNodeFromTemplate(template('ticker-select'), 'profile'), connections: ['close', 'alternate'], parameters: { defaultSourceId: 'close', alternateSourceId: 'alternate', alternateSymbols: '["TMGH"]' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['profile'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['profile'] };
    const result = compileAdvancedStrategy([close, alternate, profile, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'profile')).toMatchObject({ kind: 'ticker-select', defaultSourceId: 'close', alternateSourceId: 'alternate', alternateSymbols: ['TMGH'] });
  });
  it('compiles a first-bar EMA seed selected in Studio', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const ema = { ...createAdvancedNodeFromTemplate(template('transform'), 'ema'), connections: ['close'], parameters: { method: 'ema', period: '3', seedMode: 'first' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['ema'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['ema'] };
    const result = compileAdvancedStrategy([close, ema, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'ema')).toMatchObject({ seedMode: 'first' });
  });
  it('does not send an EMA-only seed after changing the card to SMA', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const smoothing = { ...createAdvancedNodeFromTemplate(template('transform'), 'smoothing'), connections: ['close'], parameters: { method: 'sma', period: '3', seedMode: 'first' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['smoothing'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['smoothing'] };
    const result = compileAdvancedStrategy([close, smoothing, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'smoothing')).not.toHaveProperty('seedMode');
  });
  it('compiles lag, Wilder smoothing, and rolling percentile from calculation cards', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'market');
    const lag = { ...createAdvancedNodeFromTemplate(template('transform'), 'lag'), connections: ['market'], parameters: { method: 'lag', period: '2' } };
    const rma = { ...createAdvancedNodeFromTemplate(template('transform'), 'rma'), connections: ['lag'], parameters: { method: 'rma', period: '3' } };
    const percentile = { ...createAdvancedNodeFromTemplate(template('rolling-statistic'), 'rank'), connections: ['rma'], parameters: { operation: 'percentileRank', period: '63' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['rank'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['rank'] };

    const result = compileAdvancedStrategy([market, lag, rma, percentile, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.program.inputs.filter((input) => input.kind === 'calculation')).toMatchObject([
      { id: 'lag', operation: 'lag', sourceIds: ['market'], period: 2 },
      { id: 'rma', operation: 'rma', sourceIds: ['lag'], period: 3 },
      { id: 'rank', operation: 'percentileRank', sourceIds: ['rma'], period: 63 },
    ]);
  });

  it('compiles absolute difference and extrema across connected values', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const high = { ...createAdvancedNodeFromTemplate(template('market-input'), 'high'), parameters: { series: 'ohlcv', field: 'high' } };
    const low = { ...createAdvancedNodeFromTemplate(template('market-input'), 'low'), parameters: { series: 'ohlcv', field: 'low' } };
    const difference = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'difference'), connections: ['high', 'low'], parameters: { operation: 'subtract' } };
    const absolute = { ...createAdvancedNodeFromTemplate(template('transform'), 'absolute'), connections: ['difference'], parameters: { method: 'absolute', period: '' } };
    const maximum = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'maximum'), connections: ['absolute', 'high'], parameters: { operation: 'max' } };
    const minimum = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'minimum'), connections: ['absolute', 'low'], parameters: { operation: 'min' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['maximum'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['minimum'] };

    const result = compileAdvancedStrategy([high, low, difference, absolute, maximum, minimum, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.program.inputs.filter((input) => input.kind === 'calculation')).toMatchObject([
      { id: 'difference', operation: 'subtract' },
      { id: 'absolute', operation: 'absolute', sourceIds: ['difference'] },
      { id: 'maximum', operation: 'max', sourceIds: ['absolute', 'high'] },
      { id: 'minimum', operation: 'min', sourceIds: ['absolute', 'low'] },
    ]);
    expect(result.program.inputs.find((input) => input.id === 'absolute')).not.toHaveProperty('period');
  });

  it('rejects extra sources on a unary calculation instead of silently ignoring them', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const high = createAdvancedNodeFromTemplate(template('market-input'), 'high');
    const low = createAdvancedNodeFromTemplate(template('market-input'), 'low');
    const lag = { ...createAdvancedNodeFromTemplate(template('transform'), 'lag'), connections: ['high', 'low'], parameters: { method: 'lag', period: '1' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['lag'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['lag'] };
    expect(compileAdvancedStrategy([high, low, lag, buy, sell], []).status).toBe('invalid');
  });
});

describe('advanced dynamic comparisons', () => {
  it('compiles a sell rule against a remembered entry value', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = { ...createAdvancedNodeFromTemplate(template('market-input'), 'close'), parameters: { series: 'ohlcv', field: 'close' } };
    const open = { ...createAdvancedNodeFromTemplate(template('market-input'), 'open'), parameters: { series: 'ohlcv', field: 'open' } };
    const entry = { ...createAdvancedNodeFromTemplate(template('position-memory'), 'entry'), connections: ['open'] };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['close'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['close'], parameters: { compareMode: 'series', compareInputId: 'entry', operator: 'isBelow', compareValue: '0' } };
    const result = compileAdvancedStrategy([close, open, entry, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.sell[0][0]).toMatchObject({ inputId: 'close', compareInputId: 'entry', operator: 'isBelow', threshold: 0 });
    expect(compileAdvancedStrategy([close, open, entry, buy, { ...sell, parameters: { ...sell.parameters, compareInputId: 'missing' } }], []).status).toBe('invalid');
  });
});

describe('advanced conditional exit cards', () => {
  it('compiles a signal-time percentage target', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['close'] };
    const target = { ...createAdvancedNodeFromTemplate(template('dynamic-target'), 'target'), connections: ['close'], parameters: { multiplier: '8', distanceMode: 'percentOfEntry', targetBase: 'signalClose', freezeAtEntry: 'true' } };
    const result = compileAdvancedStrategy([close, buy, target], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.exitPolicies).toMatchObject([{ id: 'target', distanceMode: 'percentOfEntry', targetBase: 'signalClose', freezeAtEntry: true, multiplier: 8 }]);
  });
  it('compiles a gated target and a custom-volatility trailing stop', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const high = createAdvancedNodeFromTemplate(template('market-input'), 'high');
    const distance = createAdvancedNodeFromTemplate(template('parameter'), 'distance');
    const tracked = { ...createAdvancedNodeFromTemplate(template('rolling-state'), 'tracked'), connections: ['high'] };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['close'] };
    const target = { ...createAdvancedNodeFromTemplate(template('dynamic-target'), 'target'), connections: ['distance'], parameters: { multiplier: '1', gateInputId: 'close', gateOperator: 'isAbove', gateThreshold: '14' } };
    const trail = { ...createAdvancedNodeFromTemplate(template('trailing-exit'), 'trail'), connections: ['tracked'], parameters: { distance: '2', volatilityPeriod: '14', volatilitySourceId: 'distance', requireProfit: 'true' } };
    const result = compileAdvancedStrategy([close, high, distance, tracked, buy, target, trail], []);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.program.exitPolicies).toMatchObject([
      { id: 'target', gate: { inputId: 'close', operator: 'isAbove', threshold: 14 } },
      { id: 'trail', volatilitySourceId: 'distance', requireProfit: true },
    ]);
  });
});

describe('advanced custom oscillator cards', () => {
  it('compiles bounded transforms, volatility, and fallback calculations', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const close = createAdvancedNodeFromTemplate(template('market-input'), 'close');
    const fallback = createAdvancedNodeFromTemplate(template('parameter'), 'fallback');
    const bounded = { ...createAdvancedNodeFromTemplate(template('transform'), 'bounded'), connections: ['close'], parameters: { method: 'clamp', lowerBound: '0', upperBound: '100' } };
    const angle = { ...createAdvancedNodeFromTemplate(template('transform'), 'angle'), connections: ['bounded'], parameters: { method: 'atan' } };
    const deviation = { ...createAdvancedNodeFromTemplate(template('rolling-statistic'), 'deviation'), connections: ['close'], parameters: { operation: 'stdDev', period: '20' } };
    const score = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'score'), connections: ['angle', 'fallback'], parameters: { operation: 'coalesce' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['score'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['deviation'] };
    const result = compileAdvancedStrategy([close, fallback, bounded, angle, deviation, score, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.filter((input) => input.kind === 'calculation')).toMatchObject([
      { id: 'bounded', operation: 'clamp', lowerBound: 0, upperBound: 100 },
      { id: 'angle', operation: 'atan' },
      { id: 'deviation', operation: 'stdDev', period: 20 },
      { id: 'score', operation: 'coalesce', sourceIds: ['angle', 'fallback'] },
    ]);
  });
});

describe('advanced workflow capacity', () => {
  it('compiles an optional execution assumptions card', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'market');
    const execution = { ...createAdvancedNodeFromTemplate(template('execution-policy'), 'execution'), parameters: { fillPolicy: 'signal-close', shareSizing: 'wholeShares' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['market'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['market'] };
    const result = compileAdvancedStrategy([market, execution, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.execution).toEqual({ fillPolicy: 'signal-close', shareSizing: 'wholeShares' });
    const duplicate = { ...execution, id: 'execution-2' };
    expect(compileAdvancedStrategy([market, execution, duplicate, buy, sell], []).status).toBe('invalid');
  });
  it('compiles regime-anchored calculations from two ordered sources', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const value = createAdvancedNodeFromTemplate(template('market-input'), 'value');
    const regime = { ...createAdvancedNodeFromTemplate(template('market-input'), 'regime'), parameters: { field: 'volume' } };
    const peak = { ...createAdvancedNodeFromTemplate(template('math-operation'), 'peak'), connections: ['value', 'regime'], parameters: { operation: 'regimeMaximum' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['peak'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['peak'] };
    const result = compileAdvancedStrategy([value, regime, peak, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'peak')).toMatchObject({ operation: 'regimeMaximum', sourceIds: ['value', 'regime'] });
    expect(compileAdvancedStrategy([value, regime, { ...peak, connections: ['value'] }, buy, sell], []).status).toBe('invalid');
  });
  it('compiles and saves ticker-specific reusable values', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const level = { ...createAdvancedNodeFromTemplate(template('parameter'), 'level'), parameters: { value: '10', symbolOverrides: '[{"symbol":"comi","value":20},{"symbol":"HRHO","value":12}]' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['level'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['level'] };
    const result = compileAdvancedStrategy([level, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs[0]).toMatchObject({ value: 10, overrides: { COMI: 20, HRHO: 12 } });
    const duplicate = { ...level, parameters: { ...level.parameters, symbolOverrides: '[{"symbol":"comi","value":20},{"symbol":"COMI","value":12}]' } };
    expect(compileAdvancedStrategy([duplicate, buy, sell], []).status).toBe('invalid');
    const draft = { ...createEmptyStrategyDraft(), id: 'custom-profiles', name: 'Profiles' };
    expect(parseSavedStrategy({ id: 'custom-profiles', name: 'Profiles', mode: 'advanced', draft, nodes: [level, buy, sell] }).success).toBe(true);
  });
  it('compiles an adaptive median with a shorter startup history', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'market');
    const median = { ...createAdvancedNodeFromTemplate(template('rolling-statistic'), 'median'), connections: ['market'], parameters: { operation: 'median', period: '252', minPeriod: '30' } };
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['median'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['median'] };
    const result = compileAdvancedStrategy([market, median, buy, sell], []);
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.program.inputs.find((input) => input.id === 'median')).toMatchObject({ operation: 'median', period: 252, minPeriod: 30 });
  });
  it('compiles, validates, and saves a graph with more than 48 cards', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'market');
    const calculations = Array.from({ length: 50 }, (_, index) => ({
      ...createAdvancedNodeFromTemplate(template('transform'), `step-${index}`),
      connections: [index === 0 ? 'market' : `step-${index - 1}`],
      parameters: { method: 'absolute' },
    }));
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['step-49'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['step-49'] };
    const nodes = [market, ...calculations, buy, sell];
    const compiled = compileAdvancedStrategy(nodes, []);
    expect(compiled.status).toBe('ready');
    if (compiled.status !== 'ready') return;
    expect(parseUniverseBacktestRequest({
      symbols: ['COMI'], program: compiled.program,
      assumptions: { initialCapital: 1000, feeBps: 0 },
      period: { startDate: '2020-01-01', endDate: '2025-12-31' },
    }).success).toBe(true);
    const draft = { ...createEmptyStrategyDraft(), id: 'custom-large', name: 'Large' };
    expect(parseSavedStrategy({ id: 'custom-large', name: 'Large', mode: 'advanced', draft, nodes }).success).toBe(true);
  });

  it('rejects an expensive collection of long rolling windows', () => {
    const template = (id: string) => ADVANCED_BLOCK_TEMPLATES.find((item) => item.id === id)!;
    const market = createAdvancedNodeFromTemplate(template('market-input'), 'market');
    const calculations = Array.from({ length: 10 }, (_, index) => ({
      ...createAdvancedNodeFromTemplate(template('rolling-statistic'), `window-${index}`),
      connections: [index === 0 ? 'market' : `window-${index - 1}`],
      parameters: { operation: 'median', period: '1000' },
    }));
    const buy = { ...createAdvancedNodeFromTemplate(template('condition'), 'buy'), connections: ['window-9'] };
    const sell = { ...createAdvancedNodeFromTemplate(template('sell-condition'), 'sell'), connections: ['window-9'] };
    expect(compileAdvancedStrategy([market, ...calculations, buy, sell], []).status).toBe('invalid');
  });
});

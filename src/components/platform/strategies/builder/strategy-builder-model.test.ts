import { describe, expect, it } from 'vitest';

import {
  addRuleToDraft,
  createEmptyStrategyDraft,
  filterIndicatorOptions,
  isSimpleRuleIndicatorSupported,
  isStrategyDraftTestable,
  localizeIndicatorCatalog,
  removeRuleFromDraft,
  updateStrategyRule,
  type StrategyBuilderIndicatorOption,
} from './strategy-builder-model';

const INDICATORS: readonly StrategyBuilderIndicatorOption[] = [
  {
    id: 'relative-strength-index',
    formulaVersion: '1.0.0',
    backlogId: 'MOM-001',
    name: 'Relative Strength Index',
    description: 'Measures momentum on a bounded scale.',
    category: 'Momentum',
    available: true,
    defaultParameters: { period: 14 },
    outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
    requiredCapabilities: [],
  },
  {
    id: 'moving-average-convergence-divergence',
    formulaVersion: '1.0.0',
    backlogId: 'MOM-002',
    name: 'Moving Average Convergence Divergence',
    description: 'Compares fast and slow moving averages.',
    category: 'Momentum',
    available: true,
    defaultParameters: { fast: 12, slow: 26 },
    outputs: [{ key: 'macd', kind: 'number', unit: 'price' }, { key: 'signal', kind: 'number', unit: 'price' }],
    requiredCapabilities: [],
  },
  {
    id: 'egypt-investor-flow',
    formulaVersion: '1.0.0',
    backlogId: 'EGY-031',
    name: 'Egypt Investor Flow',
    description: 'Tracks local and foreign investor flows.',
    category: 'Egypt',
    available: false,
    defaultParameters: {},
    outputs: [],
    requiredCapabilities: ['market-flow'],
  },
];

describe('strategy builder model', () => {
  it('derives localized display metadata from stable catalog identities', () => {
    const catalog = [{
      id: 'relative-strength-index',
      formulaVersion: '1.0.0',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
      defaultParameters: { period: 14 },
      outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
      requiredCapabilities: [],
      name: { en: 'Relative Strength Index', ar: 'مؤشر القوة النسبية' },
      description: { en: 'Momentum oscillator.', ar: 'مذبذب الزخم.' },
    }] as const;

    expect(localizeIndicatorCatalog(catalog, 'ar')).toEqual([{
      id: 'relative-strength-index',
      formulaVersion: '1.0.0',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
      defaultParameters: { period: 14 },
      outputs: [{ key: 'rsi', kind: 'number', unit: 'percent' }],
      requiredCapabilities: [],
      name: 'مؤشر القوة النسبية',
      description: 'مذبذب الزخم.',
    }]);
  });

  it('filters the indicator picker by query and category without exposing unavailable indicators', () => {
    expect(filterIndicatorOptions(INDICATORS, 'strength', 'Momentum')).toEqual([
      INDICATORS[0],
    ]);
    expect(filterIndicatorOptions(INDICATORS, 'investor', 'all')).toEqual([]);
  });

  it('limits simple-rule choices to numeric indicators whose current controls can configure them', () => {
    expect(isSimpleRuleIndicatorSupported(INDICATORS[0])).toBe(true);
    expect(isSimpleRuleIndicatorSupported(INDICATORS[1])).toBe(false);
    expect(isSimpleRuleIndicatorSupported(INDICATORS[2])).toBe(false);
    expect(isSimpleRuleIndicatorSupported({ ...INDICATORS[0], repaintBehavior: 'confirmed-with-delay' })).toBe(false);
  });

  it('adds an indicator as a configurable buy rule only once per side', () => {
    const draft = createEmptyStrategyDraft();
    const added = addRuleToDraft(draft, 'buy', INDICATORS[0]);
    const duplicate = addRuleToDraft(added, 'buy', INDICATORS[0]);

    expect(duplicate.buyRules).toEqual([{
      id: 'buy-relative-strength-index-1',
      indicatorId: 'relative-strength-index',
      outputKey: 'rsi',
      period: 14,
      operator: 'crossesAbove',
      value: 30,
      connector: 'and',
    }]);
  });

  it('prefills the canonical period and single output when metadata is available', () => {
    const metadata = { ...INDICATORS[0], defaultParameters: { period: 21 }, outputs: [{ key: 'rsi', kind: 'number' as const, unit: 'percent' as const }] };
    const added = addRuleToDraft(createEmptyStrategyDraft(), 'buy', metadata);
    expect(added.buyRules[0]).toMatchObject({ period: 21, outputKey: 'rsi' });
  });

  it('allows the same indicator to have independent buy and sell rules', () => {
    const buyDraft = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const completeDraft = addRuleToDraft(buyDraft, 'sell', INDICATORS[0]);

    expect(completeDraft.buyRules).toHaveLength(1);
    expect(completeDraft.sellRules).toHaveLength(1);
    expect(isStrategyDraftTestable(completeDraft)).toBe(true);
  });

  it('updates a rule without changing the other side', () => {
    const withBuy = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const draft = addRuleToDraft(withBuy, 'sell', INDICATORS[1]);
    const updated = updateStrategyRule(draft, 'buy', 'buy-relative-strength-index-1', {
      period: 21,
      operator: 'crossesBelow',
      value: 70,
      connector: 'or',
    });

    expect(updated.buyRules[0]).toMatchObject({ period: 21, operator: 'crossesBelow', value: 70, connector: 'or' });
    expect(updated.sellRules).toEqual(draft.sellRules);
  });

  it('removes only the requested rule', () => {
    const first = addRuleToDraft(createEmptyStrategyDraft(), 'buy', INDICATORS[0]);
    const draft = addRuleToDraft(first, 'buy', INDICATORS[1]);
    const updated = removeRuleFromDraft(draft, 'buy', 'buy-relative-strength-index-1');

    expect(updated.buyRules.map((rule) => rule.indicatorId)).toEqual([INDICATORS[1].id]);
    expect(isStrategyDraftTestable(updated)).toBe(false);
  });
});

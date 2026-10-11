import { describe, expect, it } from 'vitest';

import {
  addRuleToDraft,
  createEmptyStrategyDraft,
  filterIndicatorOptions,
  isStrategyDraftTestable,
  localizeIndicatorCatalog,
  removeRuleFromDraft,
  updateStrategyRule,
  type StrategyBuilderIndicatorOption,
} from './strategy-builder-model';

const INDICATORS: readonly StrategyBuilderIndicatorOption[] = [
  {
    id: 'relative-strength-index',
    backlogId: 'MOM-001',
    name: 'Relative Strength Index',
    description: 'Measures momentum on a bounded scale.',
    category: 'Momentum',
    available: true,
  },
  {
    id: 'moving-average-convergence-divergence',
    backlogId: 'MOM-002',
    name: 'Moving Average Convergence Divergence',
    description: 'Compares fast and slow moving averages.',
    category: 'Momentum',
    available: true,
  },
  {
    id: 'egypt-investor-flow',
    backlogId: 'EGY-031',
    name: 'Egypt Investor Flow',
    description: 'Tracks local and foreign investor flows.',
    category: 'Egypt',
    available: false,
  },
];

describe('strategy builder model', () => {
  it('derives localized display metadata from stable catalog identities', () => {
    const catalog = [{
      id: 'relative-strength-index',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
      name: { en: 'Relative Strength Index', ar: 'مؤشر القوة النسبية' },
      description: { en: 'Momentum oscillator.', ar: 'مذبذب الزخم.' },
    }] as const;

    expect(localizeIndicatorCatalog(catalog, 'ar')).toEqual([{
      id: 'relative-strength-index',
      backlogId: 'MOM-001',
      category: 'momentum',
      available: true,
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

  it('adds an indicator as a configurable buy rule only once per side', () => {
    const draft = createEmptyStrategyDraft();
    const added = addRuleToDraft(draft, 'buy', INDICATORS[0]);
    const duplicate = addRuleToDraft(added, 'buy', INDICATORS[0]);

    expect(duplicate.buyRules).toEqual([{
      id: 'buy-relative-strength-index-1',
      indicatorId: 'relative-strength-index',
      period: 14,
      operator: 'crossesAbove',
      value: 30,
      connector: 'and',
    }]);
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

export interface StrategyBuilderIndicatorOption {
  readonly id: string;
  readonly backlogId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly available: boolean;
}

export interface StrategyBuilderIndicatorCatalogItem {
  readonly id: string;
  readonly backlogId: string;
  readonly category: string;
  readonly available: boolean;
  readonly name: Readonly<Record<'en' | 'ar', string>>;
  readonly description: Readonly<Record<'en' | 'ar', string>>;
}

export interface StrategyDraft {
  readonly id: 'custom-draft';
  readonly name: string;
  readonly buyRules: readonly StrategyRule[];
  readonly sellRules: readonly StrategyRule[];
}

export type StrategyRuleSide = 'buy' | 'sell';
export type StrategyRuleConnector = 'and' | 'or';
export type StrategyRuleOperator = 'crossesAbove' | 'crossesBelow' | 'isAbove' | 'isBelow';

export interface StrategyRule {
  readonly id: string;
  readonly indicatorId: string;
  readonly period: number;
  readonly operator: StrategyRuleOperator;
  readonly value: number;
  readonly connector: StrategyRuleConnector;
}

export function createEmptyStrategyDraft(): StrategyDraft {
  return {
    id: 'custom-draft',
    name: 'Untitled strategy',
    buyRules: [],
    sellRules: [],
  };
}

export function filterIndicatorOptions(
  indicators: readonly StrategyBuilderIndicatorOption[],
  query: string,
  category: string,
): readonly StrategyBuilderIndicatorOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return indicators.filter((indicator) => {
    if (!indicator.available) return false;
    if (category !== 'all' && indicator.category !== category) return false;
    if (!normalizedQuery) return true;
    return [indicator.name, indicator.description, indicator.backlogId, indicator.category]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export function addRuleToDraft(
  draft: StrategyDraft,
  side: StrategyRuleSide,
  indicator: StrategyBuilderIndicatorOption,
): StrategyDraft {
  const key = side === 'buy' ? 'buyRules' : 'sellRules';
  const rules = draft[key];
  if (!indicator.available || rules.some((rule) => rule.indicatorId === indicator.id)) return draft;

  const nextRule: StrategyRule = {
    id: `${side}-${indicator.id}-${rules.length + 1}`,
    indicatorId: indicator.id,
    period: 14,
    operator: 'crossesAbove',
    value: 30,
    connector: 'and',
  };

  return { ...draft, [key]: [...rules, nextRule] };
}

export function updateStrategyRule(
  draft: StrategyDraft,
  side: StrategyRuleSide,
  ruleId: string,
  changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>>,
): StrategyDraft {
  const key = side === 'buy' ? 'buyRules' : 'sellRules';
  return { ...draft, [key]: draft[key].map((rule) => rule.id === ruleId ? { ...rule, ...changes } : rule) };
}

export function removeRuleFromDraft(draft: StrategyDraft, side: StrategyRuleSide, ruleId: string): StrategyDraft {
  const key = side === 'buy' ? 'buyRules' : 'sellRules';
  return { ...draft, [key]: draft[key].filter((rule) => rule.id !== ruleId) };
}

export function isStrategyDraftTestable(draft: StrategyDraft): boolean {
  return draft.buyRules.length > 0 && draft.sellRules.length > 0;
}

export function localizeIndicatorCatalog(
  catalog: readonly StrategyBuilderIndicatorCatalogItem[],
  locale: 'en' | 'ar',
): readonly StrategyBuilderIndicatorOption[] {
  return catalog.map((indicator) => ({
    id: indicator.id,
    backlogId: indicator.backlogId,
    name: indicator.name[locale],
    description: indicator.description[locale],
    category: indicator.category,
    available: indicator.available,
  }));
}

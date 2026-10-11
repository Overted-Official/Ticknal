import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { StrategyBuilderIndicatorOption, StrategyRule, StrategyRuleSide } from './strategy-builder-model';

export type StrategyInspectorTab =
  | 'configure'
  | 'learn'
  | 'visualizer'
  | 'formula'
  | 'signals'
  | 'output'
  | 'usage';

export type StrategyInspectorTarget =
  | { readonly kind: 'simple-rule'; readonly side: StrategyRuleSide; readonly rule: StrategyRule; readonly indicator: StrategyBuilderIndicatorOption | null }
  | { readonly kind: 'advanced-node'; readonly node: AdvancedStrategyNode };

export type StrategyInspectorChange =
  | { readonly kind: 'simple-rule'; readonly changes: Partial<Pick<StrategyRule, 'period' | 'operator' | 'value' | 'connector'>> }
  | { readonly kind: 'advanced-node'; readonly changes: Partial<Pick<AdvancedStrategyNode, 'customName' | 'outputName' | 'connections' | 'parameters'>> };

export function isInspectorReadOnly(target: StrategyInspectorTarget): boolean {
  return target.kind === 'advanced-node' && Boolean(target.node.protected);
}

export function getInspectorName(target: StrategyInspectorTarget, locale: 'en' | 'ar'): string {
  if (target.kind === 'simple-rule') return target.indicator?.name ?? (locale === 'ar' ? 'مؤشر غير معروف' : 'Unknown indicator');
  return target.node.customName || target.node.title[locale];
}

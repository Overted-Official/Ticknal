import type { TimeSeriesIndicatorDefinition } from '../contracts';
import { PRICE_RETURN_DEFINITIONS } from '../indicators/price-return/manifest';
import { TREND_DEFINITIONS } from '../indicators/trend';
import { MOMENTUM_DEFINITIONS } from '../indicators/momentum';
import { VOLATILITY_DEFINITIONS } from '../indicators/volatility';
import { PRICE_ACTION_DEFINITIONS } from '../indicators/price-action';
import { MARKET_STRUCTURE_DEFINITIONS } from '../indicators/market-structure';
import { VOLUME_FLOW_DEFINITIONS, VOLUME_FLOW_OPERATIONAL_DEFINITIONS } from '../indicators/volume-flow';
import { QUANTITATIVE_DEFINITIONS, QUANTITATIVE_OPERATIONAL_DEFINITIONS } from '../indicators/quantitative';
import { CYCLE_DEFINITIONS, CYCLE_OPERATIONAL_DEFINITIONS } from '../indicators/cycles';
import { RISK_PORTFOLIO_DEFINITIONS, RISK_PORTFOLIO_OPERATIONAL_DEFINITIONS } from '../indicators/risk-portfolio';
import { BREADTH_DEFINITIONS, BREADTH_OPERATIONAL_DEFINITIONS } from '../indicators/breadth';
import { RELATIVE_INTERMARKET_DEFINITIONS, RELATIVE_INTERMARKET_OPERATIONAL_DEFINITIONS } from '../indicators/relative-intermarket';
import { EGYPT_DEFINITIONS, EGYPT_OPERATIONAL_DEFINITIONS } from '../indicators/egypt';
import { TICKNAL_COMPOSITE_DEFINITIONS, TICKNAL_COMPOSITE_OPERATIONAL_DEFINITIONS } from '../indicators/ticknal-composites';

export function composeCategoryRegistry(
  categories: readonly (readonly TimeSeriesIndicatorDefinition<object>[])[],
): readonly TimeSeriesIndicatorDefinition<object>[] {
  const backlogIds = new Set<string>();
  const canonicalIds = new Set<string>();
  const definitions: TimeSeriesIndicatorDefinition<object>[] = [];

  for (const category of categories) {
    for (const definition of category) {
      if (backlogIds.has(definition.backlogId)) {
        throw new Error(`Duplicate indicator backlog ID: ${definition.backlogId}`);
      }
      if (canonicalIds.has(definition.id)) {
        throw new Error(`Duplicate indicator canonical ID: ${definition.id}`);
      }
      backlogIds.add(definition.backlogId);
      canonicalIds.add(definition.id);
      definitions.push(definition);
    }
  }

  const knownCanonicalIds = new Set(canonicalIds);
  for (const definition of definitions) {
    for (const dependency of definition.metadata.dependencies) {
      if (!knownCanonicalIds.has(dependency)) {
        throw new Error(`Unknown dependency ${dependency} for ${definition.id}`);
      }
    }
  }

  return Object.freeze(definitions);
}

export const CANONICAL_INDICATOR_REGISTRY = composeCategoryRegistry([
  PRICE_RETURN_DEFINITIONS,
  TREND_DEFINITIONS,
  MOMENTUM_DEFINITIONS,
  VOLATILITY_DEFINITIONS,
  PRICE_ACTION_DEFINITIONS,
  MARKET_STRUCTURE_DEFINITIONS,
  VOLUME_FLOW_DEFINITIONS,
  QUANTITATIVE_DEFINITIONS,
  CYCLE_DEFINITIONS,
  RISK_PORTFOLIO_DEFINITIONS,
  BREADTH_DEFINITIONS,
  RELATIVE_INTERMARKET_DEFINITIONS,
  EGYPT_DEFINITIONS,
  TICKNAL_COMPOSITE_DEFINITIONS,
]);

const OPERATIONAL_IDENTITIES = new Set<string>();
for (const definition of [
  ...PRICE_RETURN_DEFINITIONS,
  ...TREND_DEFINITIONS,
  ...MOMENTUM_DEFINITIONS,
  ...VOLATILITY_DEFINITIONS,
  ...PRICE_ACTION_DEFINITIONS,
  ...MARKET_STRUCTURE_DEFINITIONS,
  ...VOLUME_FLOW_OPERATIONAL_DEFINITIONS,
  ...QUANTITATIVE_OPERATIONAL_DEFINITIONS,
  ...CYCLE_OPERATIONAL_DEFINITIONS,
  ...RISK_PORTFOLIO_OPERATIONAL_DEFINITIONS,
  ...BREADTH_OPERATIONAL_DEFINITIONS,
  ...RELATIVE_INTERMARKET_OPERATIONAL_DEFINITIONS,
  ...EGYPT_OPERATIONAL_DEFINITIONS,
  ...TICKNAL_COMPOSITE_OPERATIONAL_DEFINITIONS,
]) {
  OPERATIONAL_IDENTITIES.add(definition.id);
  OPERATIONAL_IDENTITIES.add(definition.backlogId);
}

export function isIndicatorOperational(idOrBacklogId: string): boolean {
  return OPERATIONAL_IDENTITIES.has(idOrBacklogId);
}

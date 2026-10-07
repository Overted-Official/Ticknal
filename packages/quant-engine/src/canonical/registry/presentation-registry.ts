import type {
  CanonicalIndicatorCatalogEntry,
  IndicatorPresentationEntry,
  TimeSeriesIndicatorDefinition,
} from '../contracts';
import { PRICE_RETURN_DEFINITIONS } from '../indicators/price-return/manifest';
import { PRICE_RETURN_PRESENTATION_ENTRIES } from '../indicators/price-return/presentation';
import { TREND_DEFINITIONS, TREND_PRESENTATION_ENTRIES } from '../indicators/trend';
import { MOMENTUM_DEFINITIONS, MOMENTUM_PRESENTATION_ENTRIES } from '../indicators/momentum';
import { VOLATILITY_DEFINITIONS, VOLATILITY_PRESENTATION_ENTRIES } from '../indicators/volatility';
import { PRICE_ACTION_DEFINITIONS, PRICE_ACTION_PRESENTATION_ENTRIES } from '../indicators/price-action';
import { MARKET_STRUCTURE_DEFINITIONS, MARKET_STRUCTURE_PRESENTATION_ENTRIES } from '../indicators/market-structure';
import { VOLUME_FLOW_DEFINITIONS, VOLUME_FLOW_PRESENTATION_ENTRIES } from '../indicators/volume-flow';
import { QUANTITATIVE_DEFINITIONS, QUANTITATIVE_PRESENTATION_ENTRIES } from '../indicators/quantitative';
import { CYCLE_DEFINITIONS, CYCLE_PRESENTATION_ENTRIES } from '../indicators/cycles';
import { RISK_PORTFOLIO_DEFINITIONS, RISK_PORTFOLIO_PRESENTATION_ENTRIES } from '../indicators/risk-portfolio';
import { BREADTH_DEFINITIONS, BREADTH_PRESENTATION_ENTRIES } from '../indicators/breadth';
import { RELATIVE_INTERMARKET_DEFINITIONS, RELATIVE_INTERMARKET_PRESENTATION_ENTRIES } from '../indicators/relative-intermarket';
import { EGYPT_DEFINITIONS, EGYPT_PRESENTATION_ENTRIES } from '../indicators/egypt';
import { TICKNAL_COMPOSITE_DEFINITIONS, TICKNAL_COMPOSITE_PRESENTATION_ENTRIES } from '../indicators/ticknal-composites';

function freezeCatalogEntry(
  presentation: IndicatorPresentationEntry,
  definition: TimeSeriesIndicatorDefinition<object>,
): CanonicalIndicatorCatalogEntry {
  return Object.freeze({
    ...presentation,
    name: Object.freeze({ ...presentation.name }),
    description: Object.freeze({ ...definition.metadata.description }),
    parameters: Object.freeze([...presentation.parameters]),
    defaultParameters: Object.freeze({ ...presentation.defaultParameters }),
    visuals: Object.freeze([...presentation.visuals]),
    category: definition.metadata.category,
    tags: Object.freeze([...definition.metadata.tags]),
    requiredFields: Object.freeze([...definition.metadata.requiredFields]),
    outputs: Object.freeze([...definition.metadata.outputs]),
    minimumHistory: definition.metadata.minimumHistory,
    definition,
  });
}

export function composePresentationRegistry(
  entries: readonly IndicatorPresentationEntry[],
  definitions: readonly TimeSeriesIndicatorDefinition<object>[],
): readonly CanonicalIndicatorCatalogEntry[] {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const seenIds = new Set<string>();
  const seenBacklogIds = new Set<string>();
  const catalog: CanonicalIndicatorCatalogEntry[] = [];

  for (const entry of entries) {
    if (seenIds.has(entry.id) || seenBacklogIds.has(entry.backlogId)) {
      throw new Error(`Duplicate presentation identity: ${entry.id}/${entry.backlogId}`);
    }
    seenIds.add(entry.id);
    seenBacklogIds.add(entry.backlogId);

    const definition = definitionsById.get(entry.id);
    if (!definition || definition.backlogId !== entry.backlogId) {
      throw new Error(`Presentation definition mismatch: ${entry.id}`);
    }
    if (definition.formulaVersion !== entry.formulaVersion) {
      throw new Error(`Presentation formula version mismatch: ${entry.id}`);
    }
    if (!definition.parseParameters(entry.defaultParameters).success) {
      throw new Error(`Invalid default parameters: ${entry.id}`);
    }

    const outputKeys = new Set(definition.metadata.outputs.map((output) => output.key));
    const visualKeys = new Set<string>();
    for (const visual of entry.visuals) {
      if (!outputKeys.has(visual.outputKey)) {
        throw new Error(`Unknown visual output ${visual.outputKey} for ${entry.id}`);
      }
      if (visualKeys.has(visual.outputKey)) {
        throw new Error(`Duplicate visual output ${visual.outputKey} for ${entry.id}`);
      }
      if (visual.allowedSurfaces && !visual.allowedSurfaces.includes(visual.surface as 'overlay' | 'pane')) {
        throw new Error(`Default surface is not allowed for ${entry.id}:${visual.outputKey}`);
      }
      visualKeys.add(visual.outputKey);
    }
    for (const outputKey of outputKeys) {
      if (!visualKeys.has(outputKey)) {
        throw new Error(`Missing visual output ${outputKey} for ${entry.id}`);
      }
    }

    catalog.push(freezeCatalogEntry(entry, definition));
  }

  if (catalog.length !== definitions.length) {
    throw new Error(`Presentation registry coverage mismatch: ${catalog.length}/${definitions.length}`);
  }
  return Object.freeze(catalog);
}

export const CANONICAL_PRESENTATION_REGISTRY = composePresentationRegistry(
  Object.freeze([...PRICE_RETURN_PRESENTATION_ENTRIES, ...TREND_PRESENTATION_ENTRIES, ...MOMENTUM_PRESENTATION_ENTRIES, ...VOLATILITY_PRESENTATION_ENTRIES, ...PRICE_ACTION_PRESENTATION_ENTRIES, ...MARKET_STRUCTURE_PRESENTATION_ENTRIES, ...VOLUME_FLOW_PRESENTATION_ENTRIES, ...QUANTITATIVE_PRESENTATION_ENTRIES, ...CYCLE_PRESENTATION_ENTRIES, ...RISK_PORTFOLIO_PRESENTATION_ENTRIES, ...BREADTH_PRESENTATION_ENTRIES, ...RELATIVE_INTERMARKET_PRESENTATION_ENTRIES, ...EGYPT_PRESENTATION_ENTRIES, ...TICKNAL_COMPOSITE_PRESENTATION_ENTRIES]),
  Object.freeze([...PRICE_RETURN_DEFINITIONS, ...TREND_DEFINITIONS, ...MOMENTUM_DEFINITIONS, ...VOLATILITY_DEFINITIONS, ...PRICE_ACTION_DEFINITIONS, ...MARKET_STRUCTURE_DEFINITIONS, ...VOLUME_FLOW_DEFINITIONS, ...QUANTITATIVE_DEFINITIONS, ...CYCLE_DEFINITIONS, ...RISK_PORTFOLIO_DEFINITIONS, ...BREADTH_DEFINITIONS, ...RELATIVE_INTERMARKET_DEFINITIONS, ...EGYPT_DEFINITIONS, ...TICKNAL_COMPOSITE_DEFINITIONS]),
);

const CATALOG_BY_IDENTITY = new Map<string, CanonicalIndicatorCatalogEntry>();
for (const entry of CANONICAL_PRESENTATION_REGISTRY) {
  CATALOG_BY_IDENTITY.set(entry.id, entry);
  CATALOG_BY_IDENTITY.set(entry.backlogId, entry);
}

export function getIndicatorCatalogEntry(
  idOrBacklogId: string,
): CanonicalIndicatorCatalogEntry | undefined {
  return CATALOG_BY_IDENTITY.get(idOrBacklogId);
}

export function listIndicatorCatalogEntries(): readonly CanonicalIndicatorCatalogEntry[] {
  return CANONICAL_PRESENTATION_REGISTRY;
}

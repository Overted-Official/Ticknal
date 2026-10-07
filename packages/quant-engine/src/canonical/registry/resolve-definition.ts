import type { TimeSeriesIndicatorDefinition } from '../contracts';
import { CANONICAL_INDICATOR_REGISTRY } from './category-registry';

const DEFINITIONS_BY_IDENTITY = new Map<string, TimeSeriesIndicatorDefinition<object>>();
for (const definition of CANONICAL_INDICATOR_REGISTRY) {
  DEFINITIONS_BY_IDENTITY.set(definition.id, definition);
  DEFINITIONS_BY_IDENTITY.set(definition.backlogId, definition);
}

export function getIndicatorDefinition(
  idOrBacklogId: string,
): TimeSeriesIndicatorDefinition<object> | undefined {
  return DEFINITIONS_BY_IDENTITY.get(idOrBacklogId);
}

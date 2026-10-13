import { getIndicatorDefinition } from '@ticknal/quant-engine/canonical';
import { getIndicatorBrowserEntries } from '../chart/canonical/browser-model';
import type { StrategyBuilderIndicatorCatalogItem } from './builder/strategy-builder-model';

export function getStrategyIndicatorCatalog(): readonly StrategyBuilderIndicatorCatalogItem[] {
  const englishEntries = getIndicatorBrowserEntries('en');
  const arabicByBacklogId = new Map(
    getIndicatorBrowserEntries('ar').map((entry) => [entry.backlogId, entry]),
  );
  return englishEntries
    .filter((entry) => entry.enabled && entry.operational)
    .map((entry) => {
      const arabic = arabicByBacklogId.get(entry.backlogId);
      const definition = getIndicatorDefinition(entry.definitionId ?? entry.backlogId);
      return {
        id: entry.definitionId ?? entry.backlogId,
        backlogId: entry.backlogId,
        category: entry.category,
        available: Boolean(definition),
        formulaVersion: definition?.formulaVersion ?? 'unavailable',
        defaultParameters: definition?.metadata.defaultParameters ?? {},
        outputs: definition?.metadata.outputs.map((output) => ({ key: output.key, kind: output.kind, unit: output.unit })) ?? [],
        requiredCapabilities: definition?.metadata.requiredCapabilities ?? [],
        repaintBehavior: definition?.metadata.repaintBehavior,
        name: { en: entry.name, ar: arabic?.name ?? entry.name },
        description: { en: entry.description, ar: arabic?.description ?? entry.description },
      };
    });
}

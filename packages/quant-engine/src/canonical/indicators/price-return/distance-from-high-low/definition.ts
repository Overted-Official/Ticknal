import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeDistanceFromHighLow } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const DISTANCE_FROM_HIGH_LOW_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-017',
  id: 'distance-from-high-low',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Distance from high or low',
    description: Object.freeze({ en: 'How far price sits below a rolling high or above a rolling low.', ar: 'المسافة النسبية بين سعر الإغلاق وأعلى قمة وأدنى قاع في النافذة المحددة.' }),
    category: 'price-return',
    tags: Object.freeze(['price', 'rolling']),
    requiredFields: Object.freeze(["high","low","close"] as const),
    outputs: Object.freeze([
      {
        key: 'distance_from_high_pct',
        label: 'Distance from high',
        kind: 'number',
        unit: 'percent',
        placement: 'pane',
        nullable: true,
      },
      {
        key: 'distance_from_low_pct',
        label: 'Distance from low',
        kind: 'number',
        unit: 'percent',
        placement: 'pane',
        nullable: true,
      },
    ] as const),
    minimumHistory: 20,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({ lookback: 20 }),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters: (raw: Readonly<Record<string, unknown>>) => parseLookbackParameters(raw, 20),
  compute: computeDistanceFromHighLow,
});

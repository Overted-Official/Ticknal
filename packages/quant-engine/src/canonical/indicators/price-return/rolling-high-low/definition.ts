import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeRollingHighLow } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const ROLLING_HIGH_LOW_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-016',
  id: 'rolling-high-low',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Rolling high and low',
    description: Object.freeze({ en: 'Highest or lowest value in a selected window.', ar: 'أعلى قمة وأدنى قاع خلال عدد محدد من الفترات.' }),
    category: 'price-return',
    tags: Object.freeze(['price', 'rolling']),
    requiredFields: Object.freeze(["high","low"] as const),
    outputs: Object.freeze([
      {
        key: 'highest',
        label: 'Highest',
        kind: 'number',
        unit: 'price',
        placement: 'overlay',
        nullable: true,
      },
      {
        key: 'lowest',
        label: 'Lowest',
        kind: 'number',
        unit: 'price',
        placement: 'overlay',
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
  compute: computeRollingHighLow,
});

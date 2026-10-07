import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeHighLowRangePercentage } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const HIGH_LOW_RANGE_PERCENTAGE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-014',
  id: 'high-low-range-percentage',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'High-low range percentage',
    description: Object.freeze({
      en: 'Bar range relative to price.',
      ar: 'نطاق أعلى وأدنى سعر كنسبة من سعر الإغلاق.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(["high","low","close"] as const),
    outputs: Object.freeze([
      {
        key: 'range_pct',
        label: 'Range %',
        kind: 'number',
        unit: 'percent',
        placement: 'pane',
        nullable: false,
      },
    ] as const),
    minimumHistory: 1,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({}),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters: parseNoParameters,
  compute: computeHighLowRangePercentage,
});

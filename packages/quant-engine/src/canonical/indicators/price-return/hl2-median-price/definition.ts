import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeHl2MedianPrice } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const HL2_MEDIAN_PRICE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-004',
  id: 'hl2-median-price',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'HL2 median price',
    description: Object.freeze({
      en: 'Midpoint between each bar\'s high and low.',
      ar: 'منتصف المسافة بين أعلى وأدنى سعر في الفترة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["high","low"] as const),
    outputs: Object.freeze([
    {
      key: 'hl2',
      label: 'HL2',
      kind: 'number',
      unit: 'price',
      placement: 'overlay',
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
  compute: computeHl2MedianPrice,
});

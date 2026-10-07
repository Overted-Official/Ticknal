import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeHlc3TypicalPrice } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const HLC3_TYPICAL_PRICE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-005',
  id: 'hlc3-typical-price',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'HLC3 typical price',
    description: Object.freeze({
      en: 'Average of high, low, and close.',
      ar: 'متوسط أعلى سعر وأدنى سعر وسعر الإغلاق في الفترة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["high","low","close"] as const),
    outputs: Object.freeze([
    {
      key: 'hlc3',
      label: 'HLC3',
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
  compute: computeHlc3TypicalPrice,
});

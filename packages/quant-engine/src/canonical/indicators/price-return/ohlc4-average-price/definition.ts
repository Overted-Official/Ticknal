import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeOhlc4AveragePrice } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const OHLC4_AVERAGE_PRICE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-006',
  id: 'ohlc4-average-price',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'OHLC4 average price',
    description: Object.freeze({
      en: 'Average of open, high, low, and close.',
      ar: 'متوسط أسعار الافتتاح والأعلى والأدنى والإغلاق في الفترة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["open","high","low","close"] as const),
    outputs: Object.freeze([
    {
      key: 'ohlc4',
      label: 'OHLC4',
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
  compute: computeOhlc4AveragePrice,
});

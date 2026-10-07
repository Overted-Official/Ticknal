import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeClosePrice } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const CLOSE_PRICE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-001',
  id: 'close-price',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Close price',
    description: Object.freeze({
      en: 'The final traded price of each bar.',
      ar: 'آخر سعر تداول مسجل في كل فترة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["close"] as const),
    outputs: Object.freeze([
    {
      key: 'close',
      label: 'Close',
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
  compute: computeClosePrice,
});

import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeOpenPrice } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const OPEN_PRICE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-002',
  id: 'open-price',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Open price',
    description: Object.freeze({
      en: 'The first traded price of each bar.',
      ar: 'أول سعر تداول مسجل في كل فترة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["open"] as const),
    outputs: Object.freeze([
    {
      key: 'open',
      label: 'Open',
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
  compute: computeOpenPrice,
});

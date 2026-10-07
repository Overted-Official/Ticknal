import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeWeightedClose } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const WEIGHTED_CLOSE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-007',
  id: 'weighted-close',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Weighted close',
    description: Object.freeze({
      en: 'Close-weighted average price for the bar.',
      ar: 'متوسط يعطي سعر الإغلاق وزناً مضاعفاً مع أعلى وأدنى سعر.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["high","low","close"] as const),
    outputs: Object.freeze([
    {
      key: 'hlcc4',
      label: 'HLCC4',
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
  compute: computeWeightedClose,
});

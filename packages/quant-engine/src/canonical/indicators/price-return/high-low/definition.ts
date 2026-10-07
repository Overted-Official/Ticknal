import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeHighLow } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const HIGH_LOW_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-003',
  id: 'high-low',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'High and low',
    description: Object.freeze({
      en: 'The highest and lowest price reached in each bar.',
      ar: 'أعلى وأدنى سعر تم تسجيلهما في كل فترة، والفارق بينهما.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'source']),
    requiredFields: Object.freeze(["high","low"] as const),
    outputs: Object.freeze([
    {
      key: 'high',
      label: 'High',
      kind: 'number',
      unit: 'price',
      placement: 'overlay',
      nullable: false,
    },
    {
      key: 'low',
      label: 'Low',
      kind: 'number',
      unit: 'price',
      placement: 'overlay',
      nullable: false,
    },
    {
      key: 'range',
      label: 'Range',
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
  compute: computeHighLow,
});

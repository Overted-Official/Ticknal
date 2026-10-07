import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeTrueRange } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const TRUE_RANGE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-015',
  id: 'true-range',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'True range',
    description: Object.freeze({
      en: 'Range adjusted for overnight gaps.',
      ar: 'نطاق الحركة بعد احتساب الفجوة عن سعر الإغلاق السابق.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(["high","low","close"] as const),
    outputs: Object.freeze([
      {
        key: 'true_range',
        label: 'True range',
        kind: 'number',
        unit: 'price',
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
  compute: computeTrueRange,
});

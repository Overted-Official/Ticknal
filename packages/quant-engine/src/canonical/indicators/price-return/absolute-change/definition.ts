import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeAbsoluteChange } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const ABSOLUTE_CHANGE_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-008',
  id: 'absolute-change',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Absolute change',
    description: Object.freeze({
      en: 'How many price units the asset gained or lost.',
      ar: 'مقدار ارتفاع أو انخفاض سعر الإغلاق بوحدات السعر خلال عدد محدد من الفترات.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(['close'] as const),
    outputs: Object.freeze([
      {
        key: 'change',
        label: 'Change',
        kind: 'number',
        unit: 'price',
        placement: 'pane',
        nullable: true,
      },
    ] as const),
    minimumHistory: 2,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({ lookback: 1 }),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters: (raw: Readonly<Record<string, unknown>>) => parseLookbackParameters(raw, 1),
  compute: computeAbsoluteChange,
});

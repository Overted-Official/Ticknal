import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computePercentageChange } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const PERCENTAGE_CHANGE_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-009',
  id: 'percentage-change',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Percentage change',
    description: Object.freeze({
      en: 'The percentage gain or loss over a chosen lookback.',
      ar: 'نسبة ارتفاع أو انخفاض سعر الإغلاق خلال عدد محدد من الفترات.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(['close'] as const),
    outputs: Object.freeze([
      {
        key: 'return_pct',
        label: 'Return %',
        kind: 'number',
        unit: 'percent',
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
  compute: computePercentageChange,
});

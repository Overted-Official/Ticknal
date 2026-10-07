import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeGapPercentage } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const GAP_PERCENTAGE_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-012',
  id: 'gap-percentage',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Gap percentage',
    description: Object.freeze({
      en: 'Difference between today\'s open and the previous close.',
      ar: 'الفارق النسبي بين سعر افتتاح الفترة وسعر إغلاق الفترة السابقة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(["open","close"] as const),
    outputs: Object.freeze([
      {
        key: 'gap_pct',
        label: 'Gap %',
        kind: 'number',
        unit: 'percent',
        placement: 'pane',
        nullable: true,
      },
      {
        key: 'direction',
        label: 'Direction',
        kind: 'category',
        unit: 'category',
        placement: 'pane',
        nullable: true,
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
  compute: computeGapPercentage,
});

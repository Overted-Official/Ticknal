import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeIntrabarReturn } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const INTRABAR_RETURN_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-013',
  id: 'intrabar-return',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Intrabar return',
    description: Object.freeze({
      en: 'Change from open to close within each bar.',
      ar: 'نسبة حركة السعر من الافتتاح إلى الإغلاق داخل الفترة نفسها.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(["open","close"] as const),
    outputs: Object.freeze([
      {
        key: 'body_return_pct',
        label: 'Body return %',
        kind: 'number',
        unit: 'percent',
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
  compute: computeIntrabarReturn,
});

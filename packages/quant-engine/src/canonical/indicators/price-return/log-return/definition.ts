import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeLogReturn } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const LOG_RETURN_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-010',
  id: 'log-return',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Log return',
    description: Object.freeze({
      en: 'Continuously compounded return used by quantitative indicators.',
      ar: 'العائد اللوغاريتمي المستمر بين سعرين يفصل بينهما عدد محدد من الفترات.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return']),
    requiredFields: Object.freeze(['close'] as const),
    outputs: Object.freeze([
      {
        key: 'log_return',
        label: 'Log return',
        kind: 'number',
        unit: 'decimal-return',
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
  compute: computeLogReturn,
});

import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computeDrawdownSeries } from './logic';
import { parseNoParameters, type NoParameters } from '../shared/parse-no-parameters';

export const DRAWDOWN_SERIES_DEFINITION: TimeSeriesIndicatorDefinition<NoParameters> = Object.freeze({
  backlogId: 'PRC-018',
  id: 'drawdown-series',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Drawdown series',
    description: Object.freeze({
      en: 'Decline from the running peak at every point in time.',
      ar: 'نسبة تراجع سعر الإغلاق عن أعلى إغلاق مسجل حتى تلك النقطة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'risk', 'drawdown']),
    requiredFields: Object.freeze(['close'] as const),
    outputs: Object.freeze([
      { key: 'peak', label: 'Running peak', kind: 'number', unit: 'price', placement: 'overlay', nullable: false },
      { key: 'drawdown_pct', label: 'Drawdown %', kind: 'number', unit: 'percent', placement: 'pane', nullable: false },
    ] as const),
    minimumHistory: 1,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({}),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters: parseNoParameters,
  compute: computeDrawdownSeries,
});

import type { TimeSeriesIndicatorDefinition } from '../../../contracts';
import { computePricePercentileRank } from './logic';
import { parseLookbackParameters, type LookbackParameters } from '../shared/parse-lookback-parameters';

export const PRICE_PERCENTILE_RANK_DEFINITION: TimeSeriesIndicatorDefinition<LookbackParameters> = Object.freeze({
  backlogId: 'PRC-019',
  id: 'price-percentile-rank',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Price percentile rank',
    description: Object.freeze({ en: 'Where current price sits within its recent range.', ar: 'موضع سعر الإغلاق بين أدنى وأعلى إغلاق ضمن نافذة متحركة.' }),
    category: 'price-return',
    tags: Object.freeze(['price', 'rolling']),
    requiredFields: Object.freeze(["close"] as const),
    outputs: Object.freeze([
      {
        key: 'percentile_0_100',
        label: 'Close position 0–100',
        kind: 'number',
        unit: 'rank',
        placement: 'pane',
        nullable: true,
      },
    ] as const),
    minimumHistory: 20,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({ lookback: 20 }),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters: (raw: Readonly<Record<string, unknown>>) => parseLookbackParameters(raw, 20),
  compute: computePricePercentileRank,
});

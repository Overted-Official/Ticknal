import {
  createDiagnostic,
  type ParameterParseResult,
  type TimeSeriesIndicatorDefinition,
} from '../../../contracts';
import { parsePositiveSafeIntegerLookback } from '../../../core/parameters/parse-lookback';
import {
  computeRollingVwapSource,
  ROLLING_VWAP_SOURCES,
  type RollingVwapSource,
  type RollingVwapSourceParameters,
} from './logic';

function parseParameters(
  raw: Readonly<Record<string, unknown>>,
): ParameterParseResult<RollingVwapSourceParameters> {
  const unknown = Object.keys(raw).filter((key) => key !== 'lookback' && key !== 'source');
  if (unknown.length > 0) {
    return {
      success: false,
      diagnostics: [
        createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.unknown', {
          parameters: unknown.sort(),
        }),
      ],
    };
  }

  const lookback = parsePositiveSafeIntegerLookback(raw.lookback, 20);
  if (!lookback.success) return lookback;

  const source = raw.source ?? 'hlc3';
  if (
    typeof source !== 'string'
    || !ROLLING_VWAP_SOURCES.includes(source as RollingVwapSource)
  ) {
    return {
      success: false,
      diagnostics: [
        createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.priceSource', {
          source,
          accepted: ROLLING_VWAP_SOURCES,
        }),
      ],
    };
  }

  return {
    success: true,
    value: { lookback: lookback.value, source: source as RollingVwapSource },
  };
}

export const ROLLING_VWAP_SOURCE_DEFINITION: TimeSeriesIndicatorDefinition<RollingVwapSourceParameters> = Object.freeze({
  backlogId: 'PRC-020',
  id: 'rolling-vwap-source',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Rolling VWAP source',
    description: Object.freeze({
      en: 'Price weighted by volume over a fixed window.',
      ar: 'متوسط السعر المرجح بحجم التداول خلال نافذة متحركة ثابتة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'volume', 'rolling']),
    requiredFields: Object.freeze(['open', 'high', 'low', 'close', 'volume'] as const),
    outputs: Object.freeze([
      {
        key: 'rolling_vwap',
        label: 'Rolling VWAP',
        kind: 'number',
        unit: 'price',
        placement: 'overlay',
        nullable: true,
      },
    ] as const),
    minimumHistory: 20,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({ lookback: 20, source: 'hlc3' }),
    dependencies: Object.freeze([]),
    references: Object.freeze([
      'https://www.tradingview.com/pine-script-docs/concepts/chart-information/',
      'https://www.tradingview.com/pine-script-reference/v6/',
    ]),
  }),
  parseParameters,
  compute: computeRollingVwapSource,
});

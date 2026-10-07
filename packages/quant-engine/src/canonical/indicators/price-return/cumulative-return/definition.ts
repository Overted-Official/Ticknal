import {
  createDiagnostic,
  type ParameterParseResult,
  type TimeSeriesIndicatorDefinition,
} from '../../../contracts';
import {
  computeCumulativeReturn,
  type CumulativeReturnParameters,
} from './logic';

function parseParameters(
  raw: Readonly<Record<string, unknown>>,
): ParameterParseResult<CumulativeReturnParameters> {
  const unknown = Object.keys(raw).filter((key) => key !== 'anchor');
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

  const anchor = raw.anchor ?? 'first-observation';
  const valid = anchor === 'first-observation'
    || (typeof anchor === 'string' && anchor.length > 0)
    || (typeof anchor === 'number' && Number.isFinite(anchor));
  return valid
    ? { success: true, value: { anchor: anchor as CumulativeReturnParameters['anchor'] } }
    : {
        success: false,
        diagnostics: [
          createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.validAnchor', { anchor }),
        ],
      };
}

export const CUMULATIVE_RETURN_DEFINITION: TimeSeriesIndicatorDefinition<CumulativeReturnParameters> = Object.freeze({
  backlogId: 'PRC-011',
  id: 'cumulative-return',
  formulaVersion: '1.0.0',
  definitionSchemaVersion: 1,
  metadata: Object.freeze({
    name: 'Cumulative return',
    description: Object.freeze({
      en: 'Total compounded return from a selected starting point.',
      ar: 'إجمالي العائد المتراكم منذ نقطة بداية محددة.',
    }),
    category: 'price-return',
    tags: Object.freeze(['price', 'return', 'anchored']),
    requiredFields: Object.freeze(['close'] as const),
    outputs: Object.freeze([
      {
        key: 'cumulative_return',
        label: 'Cumulative return',
        kind: 'number',
        unit: 'percent',
        placement: 'pane',
        nullable: true,
      },
    ] as const),
    minimumHistory: 1,
    repaintBehavior: 'provisional-latest',
    confirmationDelay: 0,
    defaultParameters: Object.freeze({ anchor: 'first-observation' }),
    dependencies: Object.freeze([]),
    references: Object.freeze(['https://www.tradingview.com/pine-script-docs/concepts/chart-information/']),
  }),
  parseParameters,
  compute: computeCumulativeReturn,
});

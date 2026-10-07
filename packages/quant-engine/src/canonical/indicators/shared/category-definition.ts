import {
  createDiagnostic,
  EMPTY_INDICATOR_INPUT_BUNDLE,
  type IndicatorOutputDefinition,
  type IndicatorOutputs,
  type IndicatorInputBundle,
  type IndicatorInputCapability,
  type MarketField,
  type Diagnostic,
  type ParameterParseResult,
  type TimeSeriesFrame,
  type TimeSeriesIndicatorDefinition,
} from '../../contracts';

export type CategoryParameterRule =
  | { readonly kind: 'integer'; readonly min: number; readonly max: number }
  | { readonly kind: 'number'; readonly min: number; readonly max: number }
  | { readonly kind: 'select'; readonly values: readonly string[] }
  | { readonly kind: 'string'; readonly minLength?: number }
  | { readonly kind: 'boolean' };

export interface CategoryIndicatorSpec<P extends Record<string, unknown>> {
  readonly backlogId: string;
  readonly id: string;
  readonly category: string;
  readonly name: string;
  readonly description: Readonly<{ en: string; ar: string }>;
  readonly requiredFields: readonly MarketField[];
  readonly requiredCapabilities?: readonly IndicatorInputCapability[];
  readonly defaults: Readonly<P>;
  readonly parameterRules: Readonly<Record<keyof P & string, CategoryParameterRule>>;
  readonly outputs: readonly IndicatorOutputDefinition[];
  readonly minimumHistory: number;
  readonly tags?: readonly string[];
  readonly dependencies?: readonly string[];
  readonly repaintBehavior?: 'none' | 'provisional-latest' | 'confirmed-with-delay';
  readonly confirmationDelay?: number;
  readonly references?: readonly string[];
  readonly compute: (
    frame: TimeSeriesFrame,
    parameters: Readonly<P>,
    inputs: IndicatorInputBundle,
  ) => IndicatorOutputs;
  readonly availability?: (
    frame: TimeSeriesFrame,
    parameters: Readonly<P>,
    inputs: IndicatorInputBundle,
  ) => Diagnostic | null;
}

function validParameter(value: unknown, rule: CategoryParameterRule): boolean {
  switch (rule.kind) {
    case 'integer':
      return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= rule.min
        && value <= rule.max;
    case 'number':
      return typeof value === 'number'
        && Number.isFinite(value)
        && value >= rule.min
        && value <= rule.max;
    case 'select':
      return typeof value === 'string' && rule.values.includes(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string' && value.length >= (rule.minLength ?? 1);
  }
}

export function defineCategoryIndicator<P extends Record<string, unknown>>(
  spec: CategoryIndicatorSpec<P>,
): TimeSeriesIndicatorDefinition<P> {
  const allowedParameters = new Set(Object.keys(spec.parameterRules));
  const parseParameters = (
    raw: Readonly<Record<string, unknown>>,
  ): ParameterParseResult<P> => {
    const unknown = Object.keys(raw).filter((parameter) => !allowedParameters.has(parameter));
    if (unknown.length > 0) {
      return {
        success: false,
        diagnostics: [createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.unknown', {
          parameters: unknown,
        })],
      };
    }

    const value = { ...spec.defaults, ...raw } as P;
    for (const [parameter, rule] of Object.entries(spec.parameterRules)) {
      if (!validParameter(value[parameter], rule)) {
        return {
          success: false,
          diagnostics: [createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.invalid', {
            parameter,
            value: value[parameter],
            rule,
          })],
        };
      }
    }
    return { success: true, value };
  };

  return Object.freeze({
    backlogId: spec.backlogId,
    id: spec.id,
    formulaVersion: '1.0.0',
    definitionSchemaVersion: 1,
    metadata: Object.freeze({
      name: spec.name,
      description: spec.description,
      category: spec.category,
      tags: Object.freeze([...(spec.tags ?? [])]),
      requiredFields: Object.freeze([...spec.requiredFields]),
      requiredCapabilities: Object.freeze([...(spec.requiredCapabilities ?? [])]),
      outputs: Object.freeze([...spec.outputs]),
      defaultParameters: Object.freeze({ ...spec.defaults }),
      dependencies: Object.freeze([...(spec.dependencies ?? [])]),
      minimumHistory: spec.minimumHistory,
      repaintBehavior: spec.repaintBehavior ?? 'none',
      confirmationDelay: spec.confirmationDelay ?? 0,
      references: Object.freeze([...(spec.references ?? [])]),
    }),
    parseParameters,
    compute(
      frame: TimeSeriesFrame,
      parameters: P,
      inputs: IndicatorInputBundle = EMPTY_INDICATOR_INPUT_BUNDLE,
    ) {
      const unavailable = spec.availability?.(frame, parameters, inputs) ?? null;
      if (unavailable !== null) {
        return { status: 'unavailable' as const, diagnostics: [unavailable] };
      }
      return { status: 'ok' as const, outputs: spec.compute(frame, parameters, inputs) };
    },
  });
}

import {
  createDiagnostic,
  type ParameterParseResult,
} from '../../../contracts';
import { parsePositiveSafeIntegerLookback } from '../../../core/parameters/parse-lookback';

export interface LookbackParameters {
  readonly lookback: number;
}

export function parseLookbackParameters(
  raw: Readonly<Record<string, unknown>>,
  defaultValue: number,
): ParameterParseResult<LookbackParameters> {
  const unknownParameters = Object.keys(raw).filter((key) => key !== 'lookback');
  if (unknownParameters.length > 0) {
    return {
      success: false,
      diagnostics: [
        createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.unknown', {
          parameters: unknownParameters.sort(),
        }),
      ],
    };
  }

  const parsed = parsePositiveSafeIntegerLookback(raw.lookback, defaultValue);
  return parsed.success
    ? { success: true, value: { lookback: parsed.value } }
    : parsed;
}

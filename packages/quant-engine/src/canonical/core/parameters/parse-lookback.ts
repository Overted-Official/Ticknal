import { createDiagnostic, type ParameterParseResult } from '../../contracts';

export function parsePositiveSafeIntegerLookback(
  raw: unknown,
  defaultValue: number,
  parameter = 'lookback',
): ParameterParseResult<number> {
  if (!Number.isSafeInteger(defaultValue) || defaultValue <= 0) {
    throw new RangeError('default lookback must be a positive safe integer');
  }

  const value = raw === undefined ? defaultValue : raw;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return { success: true, value };
  }

  return {
    success: false,
    diagnostics: [
      createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.positiveSafeInteger', {
        parameter,
        value,
      }),
    ],
  };
}

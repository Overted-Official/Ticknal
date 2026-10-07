import {
  createDiagnostic,
  type ParameterParseResult,
} from '../../../contracts';

export type NoParameters = Record<string, never>;

export function parseNoParameters(
  raw: Readonly<Record<string, unknown>>,
): ParameterParseResult<NoParameters> {
  return Object.keys(raw).length === 0
    ? { success: true, value: {} }
    : {
        success: false,
        diagnostics: [
          createDiagnostic('PARAMETER_INVALID', 'indicator.parameter.noneExpected', {
            parameters: Object.keys(raw).sort(),
          }),
        ],
      };
}

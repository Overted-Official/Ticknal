export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCode =
  | 'INPUT_DUPLICATE_TIMESTAMP'
  | 'INPUT_TIMESTAMP_ORDER'
  | 'INPUT_INVALID_TIMESTAMP'
  | 'INPUT_NON_FINITE'
  | 'INPUT_INVALID_OHLC'
  | 'INPUT_NEGATIVE_VOLUME'
  | 'INPUT_NEGATIVE_TRADES'
  | 'INPUT_SOURCE_REVISION_MISSING'
  | 'INPUT_TIMEFRAME_MISMATCH'
  | 'INPUT_FIELD_COUNTS_MISMATCH'
  | 'INPUT_FIELD_COVERAGE_MISMATCH'
  | 'PARAMETER_INVALID'
  | 'DATA_FIELD_MISSING'
  | 'DATA_CAPABILITY_MISSING'
  | 'DATA_FREQUENCY_UNAVAILABLE'
  | 'HISTORY_INSUFFICIENT'
  | 'NUMERIC_DIVIDE_BY_ZERO'
  | 'NUMERIC_DOMAIN_ERROR'
  | 'OUTPUT_INVARIANT_FAILED';

export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly messageKey: string;
  readonly fields?: Readonly<Record<string, unknown>>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export function createDiagnostic(
  code: DiagnosticCode,
  messageKey: string,
  fields?: Readonly<Record<string, unknown>>,
  severity: DiagnosticSeverity = 'error',
): Diagnostic {
  return fields === undefined
    ? { code, severity, messageKey }
    : { code, severity, messageKey, fields };
}

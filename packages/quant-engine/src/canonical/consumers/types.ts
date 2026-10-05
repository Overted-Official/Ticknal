import type {
  Diagnostic,
  ExecutionContext,
  IndicatorExecutionIdentity,
  IndicatorInputProvenance,
  IndicatorOutputKind,
  IndicatorOutputPlacement,
  IndicatorOutputUnit,
  IndicatorOutputValue,
  IndicatorResult,
  IndicatorResultCoverage,
  IndicatorResultStatus,
  ObservationTime,
  TimeSeriesFrame,
} from '../contracts';

export interface CanonicalConsumerEvidence {
  readonly identity: IndicatorExecutionIdentity;
  readonly normalizedParameters: Readonly<Record<string, unknown>> | null;
  readonly provenance: IndicatorInputProvenance;
  readonly executionFingerprint: string;
  readonly calculatedAt: string;
  readonly resultFinality: IndicatorResult['resultFinality'];
  readonly coverage: IndicatorResultCoverage;
}

export interface CanonicalNumericPoint {
  readonly time: ObservationTime;
  readonly value: number | null;
}

export interface CanonicalNumericSeries {
  readonly outputKey: string;
  readonly label: string;
  readonly kind: 'number';
  readonly unit: IndicatorOutputUnit;
  readonly placement: IndicatorOutputPlacement;
  readonly points: readonly CanonicalNumericPoint[];
}

export interface CanonicalConsumerPoint {
  readonly time: ObservationTime;
  readonly value: IndicatorOutputValue;
}

export interface CanonicalConsumerSeries {
  readonly outputKey: string;
  readonly label: string;
  readonly kind: IndicatorOutputKind;
  readonly unit: IndicatorOutputUnit;
  readonly placement: IndicatorOutputPlacement;
  readonly points: readonly CanonicalConsumerPoint[];
}

export interface CanonicalConsumerResult {
  readonly status: IndicatorResultStatus;
  readonly series: readonly CanonicalConsumerSeries[];
  readonly evidence: CanonicalConsumerEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export interface CanonicalConsumerRequest {
  readonly definitionId: string;
  readonly formulaVersion: '1.0.0';
  readonly frame: TimeSeriesFrame;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly context: ExecutionContext;
}

export interface CanonicalOutputConsumerRequest extends CanonicalConsumerRequest {
  readonly outputKey: string;
}

export interface CanonicalRuleSeriesResult {
  readonly status: IndicatorResultStatus;
  readonly outputKey: string;
  readonly points: readonly CanonicalNumericPoint[];
  readonly evidence: CanonicalConsumerEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export interface CanonicalScanValueResult {
  readonly status: IndicatorResultStatus;
  readonly outputKey: string;
  readonly time: ObservationTime | null;
  readonly value: number | null;
  readonly evidence: CanonicalConsumerEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export type AlertComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq-within-tolerance';

export interface AlertComparisonRequest extends CanonicalOutputConsumerRequest {
  readonly operator: AlertComparisonOperator;
  readonly threshold: number;
  readonly tolerance?: number;
}

export interface AlertComparisonResult {
  readonly evaluation: 'match' | 'no-match' | 'not-evaluable';
  readonly outputKey: string;
  readonly time: ObservationTime | null;
  readonly value: number | null;
  readonly threshold: number;
  readonly operator: AlertComparisonOperator;
  readonly reason: 'latest-observation-provisional' | 'value-unavailable' | null;
  readonly evidence: CanonicalConsumerEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export function consumerEvidence(result: IndicatorResult): CanonicalConsumerEvidence {
  return {
    identity: result.identity,
    normalizedParameters: result.normalizedParameters,
    provenance: result.provenance,
    executionFingerprint: result.executionFingerprint,
    calculatedAt: result.calculatedAt,
    resultFinality: result.resultFinality,
    coverage: result.coverage,
  };
}

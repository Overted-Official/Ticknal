import type { Diagnostic } from './diagnostic';
import type { IndicatorOutputs } from './definition';
import type { ContextualInputProvenance } from './contextual-inputs';
import type { BarFinality, MarketFrameMeta, ObservationTime } from './market';

export type IndicatorResultStatus = 'ok' | 'unavailable' | 'invalid';

export interface IndicatorExecutionIdentity {
  readonly backlogId: string;
  readonly id: string;
  readonly formulaVersion: '1.0.0';
  readonly definitionSchemaVersion: 1;
}

export interface IndicatorInputProvenance {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly exchange: string;
  readonly requestedTimeframe: string;
  readonly effectiveTimeframe: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly sourceRevision: string;
  readonly adjustmentMode: MarketFrameMeta['adjustmentMode'];
  readonly adjustmentRevision: string | null;
  readonly asOf: string;
  readonly receivedAt: string;
  readonly transformations: MarketFrameMeta['transformations'];
}

export interface IndicatorResultCoverage {
  readonly barCount: number;
  readonly firstObservation: ObservationTime | null;
  readonly lastObservation: ObservationTime | null;
  readonly sessionCompleteness: MarketFrameMeta['sessionCompleteness'];
  readonly continuityStatus: MarketFrameMeta['continuityStatus'];
}

export interface IndicatorResult {
  readonly status: IndicatorResultStatus;
  readonly identity: IndicatorExecutionIdentity;
  readonly normalizedParameters: Readonly<Record<string, unknown>> | null;
  readonly observationTimes: readonly ObservationTime[];
  readonly outputs: IndicatorOutputs;
  readonly provenance: IndicatorInputProvenance;
  readonly contextualProvenance: readonly ContextualInputProvenance[];
  readonly executionFingerprint: string;
  readonly calculatedAt: string;
  readonly resultFinality: BarFinality;
  readonly coverage: IndicatorResultCoverage;
  readonly diagnostics: readonly Diagnostic[];
}

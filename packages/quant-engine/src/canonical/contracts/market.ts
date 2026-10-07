export type ObservationTime = string | number;
export type BarFinality = 'final' | 'provisional';
export type FieldCoverage = 'observed' | 'partial' | 'unavailable';
export type AdjustmentMode =
  | 'raw'
  | 'split-adjusted'
  | 'total-return-adjusted'
  | 'as-stored';

export type MarketField = 'open' | 'high' | 'low' | 'close' | 'volume' | 'trades';

export interface FieldObservationSummary {
  readonly coverage: FieldCoverage;
  readonly observedCount: number;
  readonly missingCount: number;
}

export type MarketFieldSummaries = Readonly<Record<MarketField, FieldObservationSummary>>;

export interface MarketFrameTransformation {
  readonly kind:
    | 'aggregation'
    | 'resampling'
    | 'corporate-action-adjustment'
    | 'currency-conversion'
    | 'filtering'
    | 'other';
  readonly description: string;
  readonly fromTimeframe?: string;
  readonly toTimeframe?: string;
}

export interface MarketFrameMeta {
  readonly instrumentId: string;
  readonly symbol: string;
  readonly exchange: string;
  readonly assetClass: string;
  readonly quoteCurrency: string;
  readonly requestedTimeframe: string;
  readonly effectiveTimeframe: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly sourceRevision: string;
  readonly asOf: string;
  readonly receivedAt: string;
  readonly timezone: string;
  readonly exchangeCalendar: string;
  readonly sessionDefinition: string;
  readonly adjustmentMode: AdjustmentMode;
  readonly adjustmentRevision: string | null;
  readonly sessionCompleteness: 'complete' | 'partial';
  readonly continuityStatus: 'continuous' | 'gapped' | 'unknown';
  readonly fields: MarketFieldSummaries;
  readonly transformations: readonly MarketFrameTransformation[];
}

export interface MarketBar {
  readonly time: ObservationTime;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number | null;
  readonly trades: number | null;
  readonly finality: BarFinality;
}

export interface TimeSeriesFrame {
  readonly domain: 'time-series';
  readonly meta: MarketFrameMeta;
  readonly bars: readonly MarketBar[];
}

export interface ExecutionContext {
  readonly calculatedAt: string;
}

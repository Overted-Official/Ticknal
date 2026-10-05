import type {
  CanonicalConsumerPoint,
  CanonicalConsumerResult,
  Diagnostic,
  IndicatorColorRole,
  IndicatorOutputKind,
  IndicatorOutputUnit,
  IndicatorReferenceLevel,
  IndicatorVisualRenderer,
  IndicatorVisualSurface,
  LocalizedText,
  ObservationTime,
} from '@ticknal/quant-engine/canonical';

export interface CanonicalIndicatorSelection {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly formulaVersion: '1.0.0';
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly visibleOutputs: readonly string[];
  readonly placementOverrides: Readonly<Record<string, 'overlay' | 'pane'>>;
}

export interface CanonicalChartVisual {
  readonly id: string;
  readonly instanceId: string;
  readonly definitionId: string;
  readonly outputKey: string;
  readonly indicatorName: LocalizedText;
  readonly outputLabel: string;
  readonly surface: IndicatorVisualSurface;
  readonly renderer: IndicatorVisualRenderer;
  readonly colorRole: IndicatorColorRole;
  readonly lineWidth?: 1 | 2 | 3 | 4;
  readonly paneGroup?: string;
  readonly referenceLevels: readonly IndicatorReferenceLevel[];
  readonly kind: IndicatorOutputKind;
  readonly unit: IndicatorOutputUnit;
  readonly points: readonly CanonicalConsumerPoint[];
  readonly latestValue: number | boolean | string | null;
}

export interface CanonicalChartExecution {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly result: CanonicalConsumerResult;
  readonly visuals: readonly CanonicalChartVisual[];
  /** @deprecated Transitional projection for the legacy main-chart host. */
  readonly lines: readonly CanonicalChartLine[];
}

export interface CanonicalChartLine {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly lineWidth: number;
  readonly data: readonly { readonly time: ObservationTime; readonly value: number }[];
}

/** @deprecated Replaced by registry-driven CanonicalIndicatorSelection. */
export type CanonicalChartIndicatorId =
  | 'close-price'
  | 'open-price'
  | 'high-low'
  | 'hl2-median-price'
  | 'hlc3-typical-price'
  | 'ohlc4-average-price'
  | 'weighted-close'
  | 'rolling-high-low'
  | 'rolling-vwap-source';

/** @deprecated Removed with the legacy nine-indicator registry. */
export interface CanonicalChartRegistryEntry {
  readonly id: CanonicalChartIndicatorId;
  readonly backlogId: string;
  readonly formulaVersion: '1.0.0';
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly outputColors: Readonly<Record<string, string>>;
}

export interface CanonicalIndicatorViewState {
  readonly status: 'loading' | 'ok' | 'unavailable' | 'error';
  readonly asOf?: string;
  readonly provisional?: boolean;
  readonly diagnostics?: readonly Diagnostic[];
  readonly message?: string;
}

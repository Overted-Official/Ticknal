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
}

export interface CanonicalIndicatorViewState {
  readonly status: 'loading' | 'ok' | 'unavailable' | 'error';
  readonly asOf?: string;
  readonly provisional?: boolean;
  readonly diagnostics?: readonly Diagnostic[];
  readonly message?: string;
}

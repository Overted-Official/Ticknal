import type {
  IndicatorOutputDefinition,
  TimeSeriesIndicatorDefinition,
} from './definition';
import type { MarketField } from './market';

export interface LocalizedText {
  readonly en: string;
  readonly ar: string;
}

export interface IndicatorParameterOption {
  readonly value: string;
  readonly label: LocalizedText;
}

export type IndicatorParameterDefinition =
  | {
      readonly kind: 'integer';
      readonly key: string;
      readonly label: LocalizedText;
      readonly defaultValue: number;
      readonly min: number;
      readonly max: number;
      readonly step: number;
    }
  | {
      readonly kind: 'number';
      readonly key: string;
      readonly label: LocalizedText;
      readonly defaultValue: number;
      readonly min: number;
      readonly max: number;
      readonly step: number;
    }
  | {
      readonly kind: 'select';
      readonly key: string;
      readonly label: LocalizedText;
      readonly defaultValue: string;
      readonly options: readonly IndicatorParameterOption[];
    }
  | {
      readonly kind: 'symbol' | 'text';
      readonly key: string;
      readonly label: LocalizedText;
      readonly defaultValue: string;
      readonly placeholder?: LocalizedText;
    }
  | {
      readonly kind: 'anchor-date';
      readonly key: string;
      readonly label: LocalizedText;
      readonly defaultValue: 'first-observation';
      readonly allowFirstObservation: true;
    };

export type IndicatorVisualSurface = 'overlay' | 'pane' | 'market' | 'card' | 'legend';
export type IndicatorVisualRenderer =
  | 'line'
  | 'area'
  | 'histogram'
  | 'band'
  | 'marker'
  | 'state-region'
  | 'value'
  | 'category'
  | 'ranked-table'
  | 'distribution';
export type IndicatorColorRole =
  | 'primary'
  | 'secondary'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'muted';

export interface IndicatorReferenceLevel {
  readonly value: number;
  readonly label?: LocalizedText;
  readonly colorRole?: IndicatorColorRole;
  readonly lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface IndicatorVisualDescriptor {
  readonly outputKey: string;
  readonly surface: IndicatorVisualSurface;
  readonly allowedSurfaces?: readonly ('overlay' | 'pane')[];
  readonly renderer: IndicatorVisualRenderer;
  readonly colorRole: IndicatorColorRole;
  readonly lineWidth?: 1 | 2 | 3 | 4;
  readonly paneGroup?: string;
  readonly referenceLevels?: readonly IndicatorReferenceLevel[];
}

export interface IndicatorPresentationEntry {
  readonly backlogId: string;
  readonly id: string;
  readonly formulaVersion: '1.0.0';
  readonly name: LocalizedText;
  readonly parameters: readonly IndicatorParameterDefinition[];
  readonly defaultParameters: Readonly<Record<string, unknown>>;
  readonly visuals: readonly IndicatorVisualDescriptor[];
}

export interface CanonicalIndicatorCatalogEntry extends IndicatorPresentationEntry {
  readonly description: LocalizedText;
  readonly category: string;
  readonly tags: readonly string[];
  readonly requiredFields: readonly MarketField[];
  readonly outputs: readonly IndicatorOutputDefinition[];
  readonly minimumHistory: number;
  readonly definition: TimeSeriesIndicatorDefinition<object>;
}

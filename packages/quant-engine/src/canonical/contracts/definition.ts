import type { Diagnostic } from './diagnostic';
import type { IndicatorInputBundle, IndicatorInputCapability } from './contextual-inputs';
import type { MarketField, TimeSeriesFrame } from './market';

export type IndicatorOutputKind = 'number' | 'boolean' | 'category';
export type IndicatorOutputUnit =
  | 'price'
  | 'percent'
  | 'decimal-return'
  | 'count'
  | 'volume'
  | 'shares'
  | 'rank'
  | 'probability'
  | 'dimensionless'
  | 'boolean'
  | 'category';
export type IndicatorOutputPlacement = 'overlay' | 'pane' | 'event' | 'hidden';

export interface IndicatorOutputDefinition {
  readonly key: string;
  readonly label: string;
  readonly kind: IndicatorOutputKind;
  readonly unit: IndicatorOutputUnit;
  readonly placement: IndicatorOutputPlacement;
  readonly nullable: boolean;
}

export interface IndicatorMetadata {
  readonly name: string;
  readonly description: Readonly<{ en: string; ar: string }>;
  readonly category: string;
  readonly tags: readonly string[];
  readonly requiredFields: readonly MarketField[];
  readonly requiredCapabilities?: readonly IndicatorInputCapability[];
  readonly outputs: readonly IndicatorOutputDefinition[];
  readonly defaultParameters: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
  readonly minimumHistory: number;
  readonly repaintBehavior: 'none' | 'provisional-latest' | 'confirmed-with-delay';
  readonly confirmationDelay: number;
  readonly references: readonly string[];
}

export type IndicatorOutputValue = number | boolean | string | null;
export type IndicatorOutputSeries = readonly IndicatorOutputValue[];
export type IndicatorOutputs = Readonly<Record<string, IndicatorOutputSeries>>;

export type ParameterParseResult<P> =
  | { readonly success: true; readonly value: P }
  | { readonly success: false; readonly diagnostics: readonly Diagnostic[] };

export type ComputationResult =
  | {
      readonly status: 'ok';
      readonly outputs: IndicatorOutputs;
      readonly diagnostics?: readonly Diagnostic[];
    }
  | {
      readonly status: 'invalid' | 'unavailable';
      readonly diagnostics: readonly Diagnostic[];
    };

export interface TimeSeriesIndicatorDefinition<P extends object> {
  readonly backlogId: string;
  readonly id: string;
  readonly formulaVersion: '1.0.0';
  readonly definitionSchemaVersion: 1;
  readonly metadata: IndicatorMetadata;
  parseParameters(raw: Readonly<Record<string, unknown>>): ParameterParseResult<P>;
  compute(
    frame: TimeSeriesFrame,
    parameters: P,
    inputs?: IndicatorInputBundle,
  ): ComputationResult;
}

import type { IndicatorOutputUnit } from '@ticknal/quant-engine/canonical';

export type StrategyComparisonOperator = 'crossesAbove' | 'crossesBelow' | 'isAbove' | 'isBelow';

export interface StrategyProgramInput {
  readonly id: string;
  readonly kind: 'indicator';
  readonly indicatorId: string;
  readonly formulaVersion: string;
  readonly outputKey: string;
  readonly unit: IndicatorOutputUnit;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface StrategyProgramPredicate {
  readonly id: string;
  readonly inputId: string;
  readonly operator: StrategyComparisonOperator;
  readonly threshold: number;
}

export interface SimpleStrategyProgram {
  readonly schemaVersion: 1;
  readonly timeframe: 'D';
  readonly inputs: readonly StrategyProgramInput[];
  readonly buy: readonly (readonly StrategyProgramPredicate[])[];
  readonly sell: readonly (readonly StrategyProgramPredicate[])[];
}

export type AdvancedProgramInput =
  | { readonly id: string; readonly kind: 'market'; readonly field: 'open' | 'high' | 'low' | 'close' | 'volume' }
  | { readonly id: string; readonly kind: 'constant'; readonly value: number }
  | StrategyProgramInput
  | { readonly id: string; readonly kind: 'calculation'; readonly operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'weighted' | 'ema' | 'sma' | 'wma' | 'normalize' | 'minimum' | 'maximum' | 'mean' | 'median'; readonly sourceIds: readonly string[]; readonly period?: number; readonly weights?: readonly number[]; readonly normalization?: 'zeroToHundred' | 'zScore' | 'minMax' | 'none' };

export interface AdvancedStrategyProgram {
  readonly schemaVersion: 2;
  readonly timeframe: 'D';
  readonly inputs: readonly AdvancedProgramInput[];
  readonly buy: readonly (readonly StrategyProgramPredicate[])[];
  readonly sell: readonly (readonly StrategyProgramPredicate[])[];
}

export type ExecutableStrategyProgram = SimpleStrategyProgram | AdvancedStrategyProgram;

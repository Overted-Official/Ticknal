import type { IndicatorOutputUnit } from '@ticknal/quant-engine/canonical';
import { compileFormula, type FormulaDefinition } from './formula-engine';
import { validRbfModel, type RbfModel } from './rbf-model';

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
  /** Compare left minus this series against threshold when present. */
  readonly compareInputId?: string;
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
  | ({ readonly id: string; readonly kind: 'formula' } & FormulaDefinition)
  | { readonly id: string; readonly kind: 'formula-output'; readonly sourceId: string; readonly outputKey: string }
  | { readonly id: string; readonly kind: 'rbf-model'; readonly sourceIds: readonly string[]; readonly model: RbfModel }
  | { readonly id: string; readonly kind: 'market'; readonly field: 'open' | 'high' | 'low' | 'close' | 'volume' }
  | { readonly id: string; readonly kind: 'constant'; readonly value: number; readonly overrides?: Readonly<Record<string, number>> }
  | StrategyProgramInput
  | { readonly id: string; readonly kind: 'position-memory'; readonly sourceId: string; readonly capture: 'entry' | 'exit'; readonly update: 'eachBar' | 'never' }
  | { readonly id: string; readonly kind: 'rolling-state'; readonly sourceId: string; readonly operation: 'minimum' | 'maximum' }
  | { readonly id: string; readonly kind: 'calculation'; readonly operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'min' | 'max' | 'coalesce' | 'weighted' | 'ema' | 'rma' | 'lag' | 'absolute' | 'atan' | 'clamp' | 'sma' | 'wma' | 'normalize' | 'minimum' | 'maximum' | 'mean' | 'median' | 'stdDev' | 'percentileRank' | 'regimeStart' | 'regimeMaximum' | 'regimeMinimum'; readonly sourceIds: readonly string[]; readonly period?: number; readonly minPeriod?: number; readonly weights?: readonly number[]; readonly normalization?: 'zeroToHundred' | 'zScore' | 'minMax' | 'none'; readonly lowerBound?: number; readonly upperBound?: number };

export const MAX_ADVANCED_PROGRAM_INPUTS = 96;
export const MAX_ADVANCED_WORKFLOW_NODES = 128;
export const MAX_ADVANCED_WORK_UNITS_PER_BAR = 12_000;
export const MAX_ADVANCED_PROGRAM_BYTES = 131_072;
export const MAX_STRATEGY_REQUEST_BYTES = 262_144;

export function estimateAdvancedWorkPerBar(inputs: readonly AdvancedProgramInput[]): number {
  return inputs.reduce((total, input) => {
    if (input.kind === 'formula') { try { return total + compileFormula(input).cost; } catch { return MAX_ADVANCED_WORK_UNITS_PER_BAR + 1; } }
    if (input.kind === 'rbf-model') return validRbfModel(input.model, input.sourceIds.length)
      ? total + input.sourceIds.length * input.model.vectors.length * 3 : MAX_ADVANCED_WORK_UNITS_PER_BAR + 1;
    if (input.kind === 'indicator') return total + 100;
    if (input.kind !== 'calculation') return total + 1;
    const period = input.period ?? 1;
    if (input.operation === 'median') return total + period * Math.ceil(Math.log2(period + 1));
    if (input.operation === 'percentileRank') return total + period * 2;
    if (['minimum', 'maximum', 'mean', 'sma', 'wma', 'stdDev'].includes(input.operation)) return total + period;
    return total + input.sourceIds.length;
  }, 0);
}

export type AdvancedExitPolicy =
  | { readonly id: string; readonly kind: 'profit-target'; readonly sourceId: string; readonly multiplier: number; readonly distanceMode?: 'absolute' | 'percentOfEntry'; readonly targetBase?: 'entryPrice' | 'signalClose'; readonly freezeAtEntry?: boolean; readonly requireProfit?: boolean; readonly gate?: StrategyProgramPredicate }
  | { readonly id: string; readonly kind: 'trailing-stop'; readonly anchorId: string; readonly distance: number; readonly volatilityPeriod: number; readonly volatilitySourceId?: string; readonly requireProfit?: boolean; readonly gate?: StrategyProgramPredicate };

export interface StrategyExecutionPolicy {
  readonly fillPolicy: 'next-session-open' | 'signal-close';
  readonly shareSizing: 'fractional' | 'wholeShares';
  readonly feeBps?: number;
  readonly slippageBps?: number;
  readonly valuation?: 'net-liquidation' | 'net-liquidation-linear-costs';
}

export function validExecutionPolicy(value: StrategyExecutionPolicy): boolean {
  return ['next-session-open', 'signal-close'].includes(value.fillPolicy)
    && ['fractional', 'wholeShares'].includes(value.shareSizing)
    && (value.feeBps === undefined || Number.isFinite(value.feeBps) && value.feeBps >= 0 && value.feeBps <= 1000)
    && (value.slippageBps === undefined || Number.isFinite(value.slippageBps) && value.slippageBps >= 0 && value.slippageBps <= 1000)
    && (value.valuation === undefined || ['net-liquidation', 'net-liquidation-linear-costs'].includes(value.valuation));
}

export interface AdvancedStrategyProgram {
  readonly schemaVersion: 2;
  readonly timeframe: 'D';
  readonly execution?: StrategyExecutionPolicy;
  readonly inputs: readonly AdvancedProgramInput[];
  readonly buy: readonly (readonly StrategyProgramPredicate[])[];
  readonly sell: readonly (readonly StrategyProgramPredicate[])[];
  readonly exitPolicies?: readonly AdvancedExitPolicy[];
}

export type ExecutableStrategyProgram = SimpleStrategyProgram | AdvancedStrategyProgram;

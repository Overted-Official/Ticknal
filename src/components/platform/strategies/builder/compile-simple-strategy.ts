import type { IndicatorOutputUnit } from '@ticknal/quant-engine/canonical';
import type { SimpleStrategyProgram, StrategyProgramInput, StrategyProgramPredicate } from '../../../../lib/strategies/strategy-program';

import type { StrategyDraft, StrategyRule } from './strategy-builder-model';

export type { SimpleStrategyProgram, StrategyProgramInput, StrategyProgramPredicate } from '../../../../lib/strategies/strategy-program';

export interface IndicatorExecutionMetadata {
  readonly id: string;
  readonly formulaVersion: string;
  readonly available: boolean;
  readonly defaultParameters: Readonly<Record<string, unknown>>;
  readonly outputs: readonly { readonly key: string; readonly kind: 'number' | 'boolean' | 'category'; readonly unit: IndicatorOutputUnit }[];
  readonly requiredCapabilities: readonly string[];
  readonly repaintBehavior?: 'none' | 'provisional-latest' | 'confirmed-with-delay';
}

export type CompileDiagnosticCode =
  | 'BUY_RULE_REQUIRED'
  | 'SELL_RULE_REQUIRED'
  | 'INDICATOR_UNAVAILABLE'
  | 'PERIOD_INVALID'
  | 'PERIOD_UNSUPPORTED'
  | 'THRESHOLD_INVALID'
  | 'OUTPUT_SELECTION_REQUIRED'
  | 'DATA_CAPABILITY_MISSING'
  | 'OPERATOR_INVALID'
  | 'CONNECTOR_INVALID'
  | 'CONFIRMED_WITH_DELAY_UNSUPPORTED';

export interface CompileDiagnostic {
  readonly code: CompileDiagnosticCode;
  readonly ruleId?: string;
}

export type CompileSimpleStrategyResult =
  | { readonly status: 'ready'; readonly program: SimpleStrategyProgram; readonly diagnostics: readonly [] }
  | { readonly status: 'invalid'; readonly diagnostics: readonly CompileDiagnostic[]; readonly program?: never };

export function compileSimpleStrategy(
  draft: StrategyDraft,
  indicators: readonly IndicatorExecutionMetadata[],
): CompileSimpleStrategyResult {
  const diagnostics: CompileDiagnostic[] = [];
  const inputs: StrategyProgramInput[] = [];
  const inputIds = new Map<string, string>();
  const indicatorsById = new Map(indicators.map((indicator) => [indicator.id, indicator]));

  if (draft.buyRules.length === 0) diagnostics.push({ code: 'BUY_RULE_REQUIRED' });
  if (draft.sellRules.length === 0) diagnostics.push({ code: 'SELL_RULE_REQUIRED' });

  const compileSide = (rules: readonly StrategyRule[]): readonly (readonly StrategyProgramPredicate[])[] => {
    const branches: StrategyProgramPredicate[][] = [];
    for (const rule of rules) {
      const validOperator = ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(rule.operator);
      const validConnector = rule.connector === 'and' || rule.connector === 'or';
      if (!validOperator) diagnostics.push({ code: 'OPERATOR_INVALID', ruleId: rule.id });
      if (!validConnector) diagnostics.push({ code: 'CONNECTOR_INVALID', ruleId: rule.id });
      if (!validOperator || !validConnector) continue;
      const indicator = indicatorsById.get(rule.indicatorId);
      if (!indicator?.available) {
        diagnostics.push({ code: 'INDICATOR_UNAVAILABLE', ruleId: rule.id });
        continue;
      }
      if (indicator.requiredCapabilities.length > 0) {
        diagnostics.push({ code: 'DATA_CAPABILITY_MISSING', ruleId: rule.id });
        continue;
      }
      if (indicator.repaintBehavior === 'confirmed-with-delay') {
        diagnostics.push({ code: 'CONFIRMED_WITH_DELAY_UNSUPPORTED', ruleId: rule.id });
        continue;
      }
      if (!Object.hasOwn(indicator.defaultParameters, 'period')) {
        diagnostics.push({ code: 'PERIOD_UNSUPPORTED', ruleId: rule.id });
        continue;
      }
      if (!Number.isSafeInteger(rule.period) || rule.period <= 0) {
        diagnostics.push({ code: 'PERIOD_INVALID', ruleId: rule.id });
      }
      if (!Number.isFinite(rule.value)) {
        diagnostics.push({ code: 'THRESHOLD_INVALID', ruleId: rule.id });
      }
      const numericOutputs = indicator.outputs.filter((output) => output.kind === 'number');
      const selectedOutput = rule.outputKey
        ? numericOutputs.find((output) => output.key === rule.outputKey)
        : numericOutputs.length === 1 ? numericOutputs[0] : undefined;
      if (!selectedOutput) {
        diagnostics.push({ code: 'OUTPUT_SELECTION_REQUIRED', ruleId: rule.id });
      }
      if (!selectedOutput || !Number.isSafeInteger(rule.period) || rule.period <= 0 || !Number.isFinite(rule.value)) continue;

      const parameters = { ...indicator.defaultParameters, period: rule.period };
      const key = JSON.stringify([indicator.id, indicator.formulaVersion, selectedOutput.key, parameters]);
      let inputId = inputIds.get(key);
      if (!inputId) {
        inputId = `input-${inputs.length + 1}`;
        inputIds.set(key, inputId);
        inputs.push({ id: inputId, kind: 'indicator', indicatorId: indicator.id, formulaVersion: indicator.formulaVersion, outputKey: selectedOutput.key, unit: selectedOutput.unit, parameters });
      }
      if (branches.length === 0 || rule.connector === 'or') branches.push([]);
      branches[branches.length - 1].push({ id: rule.id, inputId, operator: rule.operator, threshold: rule.value });
    }
    return branches;
  };

  const buy = compileSide(draft.buyRules);
  const sell = compileSide(draft.sellRules);
  if (diagnostics.length > 0) return { status: 'invalid', diagnostics };
  return { status: 'ready', diagnostics: [], program: { schemaVersion: 1, timeframe: 'D', inputs, buy, sell } };
}

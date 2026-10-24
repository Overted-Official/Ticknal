import { getIndicatorDefinition } from '@ticknal/quant-engine/canonical';
import { compileFormula, type FormulaDefinition } from '../formula-engine';
import { validRbfModel } from '../rbf-model';

import { normalizeLiveTicker } from '../../indicators/server/types';
import { estimateAdvancedWorkPerBar, MAX_ADVANCED_PROGRAM_BYTES, MAX_ADVANCED_PROGRAM_INPUTS, MAX_ADVANCED_WORK_UNITS_PER_BAR, validScoreConditions, validTickerSelection, type AdvancedStrategyProgram, type ExecutableStrategyProgram, type SimpleStrategyProgram } from '../strategy-program';
import { MAX_UNIVERSE_SYMBOLS } from './run-simple-universe-backtest';
import type { UniverseBacktestRequest } from './run-simple-universe-backtest';

export type ParsedUniverseBacktestRequest =
  | { readonly success: true; readonly value: UniverseBacktestRequest }
  | { readonly success: false; readonly error: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function shortText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validParameters(value: unknown): value is Record<string, unknown> {
  if (!record(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 16 && entries.every(([key, entry]) =>
    key.length > 0 && key.length <= 80 && (
      entry === null || typeof entry === 'boolean'
      || (typeof entry === 'string' && entry.length <= 80)
      || (typeof entry === 'number' && Number.isFinite(entry) && Math.abs(entry) <= 10_000)
    ));
}

function validProgram(value: unknown): value is SimpleStrategyProgram {
  if (!record(value) || value.schemaVersion !== 1 || value.timeframe !== 'D'
    || !Array.isArray(value.inputs) || value.inputs.length < 1 || value.inputs.length > 8) return false;

  const ids = new Set<string>();
  for (const input of value.inputs) {
    if (!record(input) || !shortText(input.id) || ids.has(input.id)
      || input.kind !== 'indicator' || !shortText(input.indicatorId)
      || !shortText(input.formulaVersion) || !shortText(input.outputKey)
      || !validParameters(input.parameters)) return false;
    const definition = getIndicatorDefinition(input.indicatorId);
    if (!definition || definition.formulaVersion !== input.formulaVersion
      || definition.metadata.repaintBehavior === 'confirmed-with-delay'
      || !definition.metadata.outputs.some((output) =>
        output.key === input.outputKey && output.kind === 'number' && output.unit === input.unit)) return false;
    ids.add(input.id);
  }

  const sideValid = (side: unknown): boolean => Array.isArray(side) && side.length > 0 && side.length <= 8
    && side.every((branch) => Array.isArray(branch) && branch.length > 0 && branch.length <= 8
      && branch.every((predicate) => record(predicate) && shortText(predicate.id)
        && typeof predicate.inputId === 'string' && ids.has(predicate.inputId)
        && (predicate.compareInputId === undefined || (typeof predicate.compareInputId === 'string' && ids.has(predicate.compareInputId)))
        && ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(String(predicate.operator))
        && typeof predicate.threshold === 'number' && Number.isFinite(predicate.threshold)));
  return sideValid(value.buy) && sideValid(value.sell);
}

function validAdvancedProgram(value: unknown): value is AdvancedStrategyProgram {
  if (!record(value) || value.schemaVersion !== 2 || value.timeframe !== 'D'
    || !Array.isArray(value.inputs) || value.inputs.length < 1 || value.inputs.length > MAX_ADVANCED_PROGRAM_INPUTS) return false;
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_ADVANCED_PROGRAM_BYTES) return false;
  if (value.execution !== undefined && (!record(value.execution)
    || !['next-session-open', 'signal-close'].includes(String(value.execution.fillPolicy))
    || !['fractional', 'wholeShares'].includes(String(value.execution.shareSizing))
    || ['feeBps', 'slippageBps'].some((key) => value.execution && record(value.execution) && value.execution[key] !== undefined && (typeof value.execution[key] !== 'number' || !Number.isFinite(value.execution[key]) || Number(value.execution[key]) < 0 || Number(value.execution[key]) > 1000))
    || (value.execution.valuation !== undefined && !['net-liquidation', 'net-liquidation-linear-costs'].includes(String(value.execution.valuation))))) return false;
  const ids = new Set<string>();
  const statefulIds = new Set<string>();
  const maximumStateIds = new Set<string>();
  for (const input of value.inputs) {
    if (!record(input) || !shortText(input.id) || ids.has(input.id)) return false;
    if (input.kind === 'rbf-model') {
      if (!Array.isArray(input.sourceIds) || !input.sourceIds.every((id) => typeof id === 'string' && ids.has(id) && !statefulIds.has(id)) || !validRbfModel(input.model, input.sourceIds.length)) return false;
    } else if (input.kind === 'formula') {
      if (!Array.isArray(input.sourceIds) || !input.sourceIds.every((id) => typeof id === 'string' && ids.has(id) && !statefulIds.has(id))) return false;
      try { compileFormula(input as unknown as FormulaDefinition); } catch { return false; }
    } else if (input.kind === 'formula-output') {
      const source = value.inputs.find((candidate) => record(candidate) && candidate.id === input.sourceId);
      if (!ids.has(String(input.sourceId)) || !record(source) || source.kind !== 'formula' || !Array.isArray(source.registers)
        || !source.registers.some((register) => record(register) && register.key === input.outputKey)) return false;
    } else if (input.kind === 'market') {
      if (!['open', 'high', 'low', 'close', 'volume'].includes(String(input.field))) return false;
    } else if (input.kind === 'constant') {
      if (typeof input.value !== 'number' || !Number.isFinite(input.value) || Math.abs(input.value) > 1_000_000_000) return false;
      if (input.overrides !== undefined && (!record(input.overrides) || Object.keys(input.overrides).length > 400
        || !Object.entries(input.overrides).every(([symbol, override]) => normalizeLiveTicker(symbol) === symbol
          && typeof override === 'number' && Number.isFinite(override) && Math.abs(override) <= 1_000_000_000))) return false;
    } else if (input.kind === 'condition-score') {
      if (!validScoreConditions(input.conditions, (id) => ids.has(id) && !statefulIds.has(id))) return false;
    } else if (input.kind === 'ticker-select') {
      if (typeof input.defaultSourceId !== 'string' || typeof input.alternateSourceId !== 'string' || input.defaultSourceId === input.alternateSourceId
        || !ids.has(input.defaultSourceId) || !ids.has(input.alternateSourceId) || statefulIds.has(input.defaultSourceId) || statefulIds.has(input.alternateSourceId)
        || !validTickerSelection(input.alternateSymbols) || !input.alternateSymbols.every((symbol) => normalizeLiveTicker(symbol) === symbol)) return false;
    } else if (input.kind === 'indicator') {
      if (!shortText(input.indicatorId) || !shortText(input.formulaVersion) || !shortText(input.outputKey) || !validParameters(input.parameters)) return false;
      const definition = getIndicatorDefinition(input.indicatorId);
      if (!definition || definition.formulaVersion !== input.formulaVersion || definition.metadata.repaintBehavior === 'confirmed-with-delay'
        || !definition.metadata.outputs.some((output) => output.key === input.outputKey && output.kind === 'number' && output.unit === input.unit)) return false;
    } else if (input.kind === 'position-memory' || input.kind === 'rolling-state') {
      if (typeof input.sourceId !== 'string' || !ids.has(input.sourceId) || statefulIds.has(input.sourceId)) return false;
      if (input.kind === 'position-memory') {
        if (!['entry', 'exit'].includes(String(input.capture)) || !['eachBar', 'never'].includes(String(input.update))) return false;
      } else {
        if (!['minimum', 'maximum'].includes(String(input.operation))) return false;
        if (input.operation === 'maximum') maximumStateIds.add(input.id);
      }
      statefulIds.add(input.id);
    } else if (input.kind === 'calculation') {
      if (!['add', 'subtract', 'multiply', 'divide', 'min', 'max', 'coalesce', 'weighted', 'ema', 'rma', 'lag', 'absolute', 'atan', 'clamp', 'sma', 'wma', 'normalize', 'minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank', 'regimeStart', 'regimeMaximum', 'regimeMinimum'].includes(String(input.operation))
        || !Array.isArray(input.sourceIds) || input.sourceIds.length < 1 || input.sourceIds.length > 8
        || !input.sourceIds.every((id) => typeof id === 'string' && ids.has(id) && !statefulIds.has(id))) return false;
      if (['add', 'subtract', 'multiply', 'divide', 'min', 'max', 'coalesce', 'weighted'].includes(String(input.operation)) && input.sourceIds.length < 2) return false;
      if (['regimeStart', 'regimeMaximum', 'regimeMinimum'].includes(String(input.operation)) && input.sourceIds.length !== 2) return false;
      if (['ema', 'rma', 'lag', 'absolute', 'atan', 'clamp', 'sma', 'wma', 'normalize', 'minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank'].includes(String(input.operation)) && input.sourceIds.length !== 1) return false;
      if (['ema', 'rma', 'lag', 'sma', 'wma', 'minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank'].includes(String(input.operation)) && input.period === undefined) return false;
      if (input.period !== undefined && (!Number.isSafeInteger(input.period) || Number(input.period) < 1 || Number(input.period) > 1000)) return false;
      if (input.minPeriod !== undefined && (input.operation !== 'median' || !Number.isSafeInteger(input.minPeriod)
        || Number(input.minPeriod) < 1 || Number(input.minPeriod) > Number(input.period))) return false;
      if (input.seedMode !== undefined && (!['ema', 'rma'].includes(String(input.operation)) || !['periodMean', 'first'].includes(String(input.seedMode)))) return false;
      if (input.operation === 'clamp' && (typeof input.lowerBound !== 'number' || !Number.isFinite(input.lowerBound) || Math.abs(input.lowerBound) > 1_000_000_000 || typeof input.upperBound !== 'number' || !Number.isFinite(input.upperBound) || Math.abs(input.upperBound) > 1_000_000_000 || input.lowerBound > input.upperBound)) return false;
      if (input.weights !== undefined && (!Array.isArray(input.weights) || input.weights.length !== input.sourceIds.length
        || !input.weights.every((weight) => typeof weight === 'number' && Number.isFinite(weight) && Math.abs(weight) <= 1_000_000))) return false;
      if (input.normalization !== undefined && !['none', 'zeroToHundred', 'zScore', 'minMax'].includes(String(input.normalization))) return false;
    } else return false;
    ids.add(input.id);
  }
  if (estimateAdvancedWorkPerBar(value.inputs as AdvancedStrategyProgram['inputs']) > MAX_ADVANCED_WORK_UNITS_PER_BAR) return false;
  const sideValid = (side: unknown): boolean => Array.isArray(side) && side.length > 0 && side.length <= 16
    && side.every((branch) => Array.isArray(branch) && branch.length > 0 && branch.length <= 16
      && branch.every((predicate) => record(predicate) && shortText(predicate.id)
        && typeof predicate.inputId === 'string' && ids.has(predicate.inputId)
        && (predicate.compareInputId === undefined || (typeof predicate.compareInputId === 'string' && ids.has(predicate.compareInputId)))
        && ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(String(predicate.operator))
        && typeof predicate.threshold === 'number' && Number.isFinite(predicate.threshold)));
  const policies = value.exitPolicies === undefined ? [] : value.exitPolicies;
  if (!Array.isArray(policies) || policies.length > 16) return false;
  const policyIds = new Set<string>();
  for (const policy of policies) {
    if (!record(policy) || !shortText(policy.id) || policyIds.has(policy.id)) return false;
    policyIds.add(policy.id);
    if (policy.gate !== undefined && (!record(policy.gate) || !shortText(policy.gate.id)
      || typeof policy.gate.inputId !== 'string' || !ids.has(policy.gate.inputId)
      || (policy.gate.compareInputId !== undefined && (typeof policy.gate.compareInputId !== 'string' || !ids.has(policy.gate.compareInputId)))
      || !['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(String(policy.gate.operator))
      || typeof policy.gate.threshold !== 'number' || !Number.isFinite(policy.gate.threshold))) return false;
    if (policy.kind === 'profit-target') {
      if (typeof policy.sourceId !== 'string' || !ids.has(policy.sourceId)
        || typeof policy.multiplier !== 'number' || !Number.isFinite(policy.multiplier)
        || policy.multiplier <= 0 || policy.multiplier > 1000
        || (policy.distanceMode !== undefined && !['absolute', 'percentOfEntry'].includes(String(policy.distanceMode)))
        || (policy.targetBase !== undefined && !['entryPrice', 'signalClose'].includes(String(policy.targetBase)))
        || (policy.requireProfit !== undefined && typeof policy.requireProfit !== 'boolean')
        || (policy.freezeAtEntry !== undefined && typeof policy.freezeAtEntry !== 'boolean')
        || (policy.freezeAtEntry === true && statefulIds.has(policy.sourceId))) return false;
    } else if (policy.kind === 'trailing-stop') {
      if (typeof policy.anchorId !== 'string' || !maximumStateIds.has(policy.anchorId)
        || typeof policy.distance !== 'number' || !Number.isFinite(policy.distance)
        || policy.distance <= 0 || policy.distance > 1000
        || (policy.volatilitySourceId !== undefined && (typeof policy.volatilitySourceId !== 'string' || !ids.has(policy.volatilitySourceId)))
        || (policy.requireProfit !== undefined && typeof policy.requireProfit !== 'boolean')
        || !Number.isSafeInteger(policy.volatilityPeriod) || Number(policy.volatilityPeriod) < 1
        || Number(policy.volatilityPeriod) > 1000) return false;
    } else return false;
  }
  return sideValid(value.buy) && (sideValid(value.sell) || (Array.isArray(value.sell) && value.sell.length === 0 && policies.length > 0));
}

export function parseUniverseBacktestRequest(body: unknown): ParsedUniverseBacktestRequest {
  if (!record(body) || !Array.isArray(body.symbols)
    || body.symbols.length < 1 || body.symbols.length > MAX_UNIVERSE_SYMBOLS) {
    return { success: false, error: `Select 1-${MAX_UNIVERSE_SYMBOLS} companies.` };
  }
  const symbols = body.symbols.map((value) => typeof value === 'string' ? normalizeLiveTicker(value) : null);
  if (symbols.some((symbol) => symbol === null) || new Set(symbols).size !== symbols.length) {
    return { success: false, error: 'Company symbols must be valid and unique.' };
  }
  if (body.detail !== undefined && (body.detail !== true || symbols.length !== 1)) {
    return { success: false, error: 'Detailed results require exactly one company.' };
  }
  if (!validProgram(body.program) && !validAdvancedProgram(body.program)) {
    return { success: false, error: 'A valid, bounded daily strategy program is required.' };
  }
  if (!record(body.assumptions) || typeof body.assumptions.initialCapital !== 'number'
    || !Number.isFinite(body.assumptions.initialCapital) || body.assumptions.initialCapital <= 0
    || body.assumptions.initialCapital > 1_000_000_000_000
    || typeof body.assumptions.feeBps !== 'number' || !Number.isFinite(body.assumptions.feeBps)
    || body.assumptions.feeBps < 0 || body.assumptions.feeBps > 1_000) {
    return { success: false, error: 'Initial capital or transaction fee is invalid.' };
  }
  if (!record(body.period) || !validDate(body.period.startDate)
    || !validDate(body.period.endDate) || body.period.startDate > body.period.endDate) {
    return { success: false, error: 'Select a valid start and end date.' };
  }
  return {
    success: true,
    value: {
      symbols: symbols as string[], program: body.program as ExecutableStrategyProgram,
      assumptions: { initialCapital: body.assumptions.initialCapital, feeBps: body.assumptions.feeBps },
      period: { startDate: body.period.startDate, endDate: body.period.endDate },
      ...(body.detail === true ? { detail: true } : {}),
    },
  };
}

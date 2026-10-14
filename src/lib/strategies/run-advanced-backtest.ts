import { evaluateRuleSeries, getIndicatorDefinition, type TimeSeriesFrame } from '@ticknal/quant-engine/canonical';
import type { AdvancedStrategyProgram } from './strategy-program';
import { runBacktestWithSeries, type BacktestAssumptions, type BacktestPeriod, type BacktestResult, type BacktestRuntime } from './run-simple-backtest';

type Values = readonly (number | null)[];
const finite = (value: number): number | null => Number.isFinite(value) ? value : null;

function normalizeSeries(values: Values, mode: 'zeroToHundred' | 'zScore' | 'minMax' | 'none'): (number | null)[] {
  if (mode === 'none') return [...values];
  let count = 0;
  let mean = 0;
  let squaredDistance = 0;
  let min = Infinity;
  let max = -Infinity;
  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) return null;
    count += 1;
    const delta = value - mean;
    mean += delta / count;
    squaredDistance += delta * (value - mean);
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (mode === 'zScore') {
      const deviation = Math.sqrt(squaredDistance / count);
      return deviation === 0 ? 0 : (value - mean) / deviation;
    }
    const ratio = max === min ? 0.5 : (value - min) / (max - min);
    return mode === 'zeroToHundred' ? ratio * 100 : ratio;
  });
}

function emaSeries(values: Values, period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let seed: number[] = [];
  let previous: number | null = null;
  const alpha = 2 / (period + 1);
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) { seed = []; previous = null; result.push(null); continue; }
    if (previous === null) {
      seed.push(value);
      if (seed.length < period) { result.push(null); continue; }
      previous = seed.reduce((total, item) => total + item, 0) / period;
      result.push(previous);
      continue;
    }
    previous = alpha * value + (1 - alpha) * previous;
    result.push(finite(previous));
  }
  return result;
}

function calculate(operation: string, sources: Values[], index: number, period: number): number | null {
  const current = sources.map((source) => source[index]);
  if (current.some((value) => value === null || value === undefined || !Number.isFinite(value))) return null;
  const values = current as number[];
  if (operation === 'add') return finite(values.reduce((total, value) => total + value, 0));
  if (operation === 'subtract') return finite(values.slice(1).reduce((total, value) => total - value, values[0]));
  if (operation === 'multiply') return finite(values.reduce((total, value) => total * value, 1));
  if (operation === 'divide') return values.slice(1).reduce<number | null>((total, value) => total === null || value === 0 ? null : finite(total / value), values[0]);
  const source = sources[0];
  const window = source.slice(Math.max(0, index - period + 1), index + 1);
  if (window.length < period || window.some((value) => value === null)) return null;
  const samples = window as number[];
  if (operation === 'minimum') return Math.min(...samples);
  if (operation === 'maximum') return Math.max(...samples);
  if (operation === 'mean' || operation === 'sma') return finite(samples.reduce((total, value) => total + value, 0) / period);
  if (operation === 'median') { const sorted = [...samples].sort((a, b) => a - b); return period % 2 ? sorted[Math.floor(period / 2)] : (sorted[period / 2 - 1] + sorted[period / 2]) / 2; }
  if (operation === 'wma') { const divisor = period * (period + 1) / 2; return finite(samples.reduce((total, value, position) => total + value * (position + 1), 0) / divisor); }
  return null;
}

export function runAdvancedBacktest(program: AdvancedStrategyProgram, frame: TimeSeriesFrame, assumptions: BacktestAssumptions, period?: BacktestPeriod): BacktestResult {
  if (program.schemaVersion !== 2 || program.timeframe !== 'D' || program.inputs.length === 0 || program.inputs.length > 32
    || !program.buy.length || (!program.sell.length && !program.exitPolicies?.length)) return { status: 'invalid', code: 'PROGRAM_INVALID' };
  const series = new Map<string, (number | null)[]>();
  const stateful = program.inputs.filter((input) => input.kind === 'position-memory' || input.kind === 'rolling-state');
  const formulaVersions: Record<string, string> = {};
  for (const input of program.inputs) {
    if (series.has(input.id)) return { status: 'invalid', code: 'PROGRAM_INVALID', inputId: input.id };
    if (input.kind === 'market') {
      if (!['open', 'high', 'low', 'close', 'volume'].includes(input.field)) return { status: 'invalid', code: 'MARKET_FIELD_INVALID', inputId: input.id };
      series.set(input.id, frame.bars.map((bar) => finite(Number(bar[input.field]))));
    } else if (input.kind === 'constant') {
      if (!Number.isFinite(input.value)) return { status: 'invalid', code: 'CONSTANT_INVALID', inputId: input.id };
      series.set(input.id, frame.bars.map(() => input.value));
    } else if (input.kind === 'indicator') {
      const definition = getIndicatorDefinition(input.indicatorId);
      if (!definition || definition.formulaVersion !== input.formulaVersion || definition.metadata.repaintBehavior === 'confirmed-with-delay'
        || !definition.metadata.outputs.some((output) => output.key === input.outputKey && output.kind === 'number' && output.unit === input.unit)) return { status: 'invalid', code: 'INDICATOR_INVALID', inputId: input.id };
      const result = evaluateRuleSeries({ definitionId: input.indicatorId, formulaVersion: input.formulaVersion, outputKey: input.outputKey, frame, parameters: input.parameters, context: { calculatedAt: frame.meta.receivedAt } });
      if (result.status !== 'ok') return { status: result.status === 'invalid' ? 'invalid' : 'unavailable', code: 'INDICATOR_EVALUATION_FAILED', inputId: input.id, diagnostics: result.diagnostics };
      series.set(input.id, result.points.map((point) => point.value));
      formulaVersions[definition.id] = definition.formulaVersion;
    } else if (input.kind === 'position-memory' || input.kind === 'rolling-state') {
      const source = series.get(input.sourceId);
      if (!source || stateful.some((candidate) => candidate.id === input.sourceId)) return { status: 'invalid', code: 'STATE_SOURCE_INVALID', inputId: input.id };
      if (input.kind === 'position-memory' && (!['entry', 'exit'].includes(input.capture) || !['eachBar', 'never'].includes(input.update))) return { status: 'invalid', code: 'STATE_SETTINGS_INVALID', inputId: input.id };
      if (input.kind === 'rolling-state' && !['minimum', 'maximum'].includes(input.operation)) return { status: 'invalid', code: 'STATE_SETTINGS_INVALID', inputId: input.id };
      series.set(input.id, frame.bars.map(() => null));
    } else {
      if (input.sourceIds.some((id) => stateful.some((candidate) => candidate.id === id))) return { status: 'invalid', code: 'CALCULATION_SOURCE_INVALID', inputId: input.id };
      const sources = input.sourceIds.map((id) => series.get(id));
      if (!sources.length || sources.some((value) => !value)) return { status: 'invalid', code: 'CALCULATION_SOURCE_INVALID', inputId: input.id };
      const periodLength = input.period ?? 1;
      if (!Number.isSafeInteger(periodLength) || periodLength < 1 || periodLength > 1000) return { status: 'invalid', code: 'CALCULATION_PERIOD_INVALID', inputId: input.id };
      const weights = input.weights ?? input.sourceIds.map(() => 1);
      if (weights.length !== sources.length || weights.some((weight) => !Number.isFinite(weight))) return { status: 'invalid', code: 'CALCULATION_WEIGHTS_INVALID', inputId: input.id };
      if (input.operation === 'normalize') {
        series.set(input.id, normalizeSeries(sources[0]!, 'zeroToHundred'));
      } else if (input.operation === 'ema') {
        series.set(input.id, emaSeries(sources[0]!, periodLength));
      } else if (input.operation === 'weighted') {
        const normalized = (sources as Values[]).map((values) => normalizeSeries(values, input.normalization ?? 'none'));
        const divisor = weights.reduce((total, weight) => total + Math.abs(weight), 0);
        if (divisor <= 0) return { status: 'invalid', code: 'CALCULATION_WEIGHTS_INVALID', inputId: input.id };
        series.set(input.id, frame.bars.map((_, index) => {
          const values = normalized.map((values) => values[index]);
          return values.some((value) => value === null || value === undefined) ? null
            : finite(values.reduce<number>((total, value, position) => total + (value ?? 0) * weights[position], 0) / divisor);
        }));
      } else {
        series.set(input.id, frame.bars.map((_, index) => calculate(input.operation, sources as Values[], index, periodLength)));
      }
    }
  }
  if ([...program.buy, ...program.sell].some((branch) => !branch.length || branch.some((predicate) => !series.has(predicate.inputId) || !Number.isFinite(predicate.threshold) || !['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(predicate.operator)))) return { status: 'invalid', code: 'PREDICATE_INVALID' };
  const policies = program.exitPolicies ?? [];
  if (policies.length > 16 || policies.some((policy) => policy.kind === 'profit-target'
    ? !series.has(policy.sourceId) || !Number.isFinite(policy.multiplier) || policy.multiplier <= 0 || policy.multiplier > 1000
    : policy.kind !== 'trailing-stop' || !stateful.some((input) => input.id === policy.anchorId && input.kind === 'rolling-state' && input.operation === 'maximum')
      || !Number.isFinite(policy.distance) || policy.distance <= 0 || policy.distance > 1000
      || !Number.isSafeInteger(policy.volatilityPeriod) || policy.volatilityPeriod < 1 || policy.volatilityPeriod > 1000)) {
    return { status: 'invalid', code: 'EXIT_POLICY_INVALID' };
  }

  const trueRanges = frame.bars.map((bar, index) => {
    const prior = frame.bars[index - 1]?.close;
    return prior === undefined ? bar.high - bar.low : Math.max(bar.high - bar.low, Math.abs(bar.high - prior), Math.abs(bar.low - prior));
  });
  const atrByPeriod = new Map<number, (number | null)[]>();
  for (const policy of policies) {
    if (policy.kind !== 'trailing-stop' || atrByPeriod.has(policy.volatilityPeriod)) continue;
    const values: (number | null)[] = [];
    let sum = 0;
    for (let index = 0; index < trueRanges.length; index += 1) {
      sum += trueRanges[index];
      if (index >= policy.volatilityPeriod) sum -= trueRanges[index - policy.volatilityPeriod];
      values.push(index + 1 < policy.volatilityPeriod ? null : sum / policy.volatilityPeriod);
    }
    atrByPeriod.set(policy.volatilityPeriod, values);
  }
  const stored = new Map<string, number | null>();
  const runtime: BacktestRuntime = {
    onBar: ({ index, position, entered, exited }) => {
      for (const input of stateful) {
        if (input.kind !== 'position-memory' && input.kind !== 'rolling-state') continue;
        const source = series.get(input.sourceId)?.[index] ?? null;
        let value = stored.get(input.id) ?? null;
        if (input.kind === 'position-memory') {
          if (input.capture === 'entry') {
            if (position === null) value = null;
            else if (entered || input.update === 'eachBar') value = source;
          } else if (exited || (position === null && input.update === 'eachBar')) value = source;
        } else if (position === null) value = null;
        else if (source !== null && Number.isFinite(source)) value = entered || value === null ? source
          : input.operation === 'maximum' ? Math.max(value, source) : Math.min(value, source);
        stored.set(input.id, value);
        series.get(input.id)![index] = value;
      }
    },
    exitReason: ({ index, bar, position }) => {
      if (!position) return null;
      for (const policy of policies) {
        if (policy.kind === 'profit-target') {
          const distance = series.get(policy.sourceId)?.[index];
          if (distance !== null && distance !== undefined && distance > 0
            && bar.close >= position.entryPrice + policy.multiplier * distance) return 'Profit target reached.';
        } else {
          const anchor = series.get(policy.anchorId)?.[index];
          const atr = atrByPeriod.get(policy.volatilityPeriod)?.[index];
          if (anchor !== null && anchor !== undefined && atr !== null && atr !== undefined
            && atr > 0 && bar.close <= anchor - policy.distance * atr) return 'Trailing stop reached.';
        }
      }
      return null;
    },
  };
  return runBacktestWithSeries(program, frame, assumptions, period, series, formulaVersions, runtime);
}

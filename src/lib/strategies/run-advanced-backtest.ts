import { evaluateRuleSeries, getIndicatorDefinition, type TimeSeriesFrame } from '@ticknal/quant-engine/canonical';
import type { AdvancedStrategyProgram } from './strategy-program';
import { runBacktestWithSeries, type BacktestAssumptions, type BacktestPeriod, type BacktestResult } from './run-simple-backtest';

type Values = readonly (number | null)[];
const finite = (value: number): number | null => Number.isFinite(value) ? value : null;

function normalizeSeries(values: Values, mode: 'zeroToHundred' | 'zScore' | 'minMax' | 'none'): Values {
  if (mode === 'none') return values;
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

function emaSeries(values: Values, period: number): Values {
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
  if (program.schemaVersion !== 2 || program.timeframe !== 'D' || program.inputs.length === 0 || program.inputs.length > 32 || !program.buy.length || !program.sell.length) return { status: 'invalid', code: 'PROGRAM_INVALID' };
  const series = new Map<string, Values>();
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
    } else {
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
  return runBacktestWithSeries(program, frame, assumptions, period, series, formulaVersions);
}

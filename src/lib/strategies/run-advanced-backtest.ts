import { evaluateRuleSeries, getIndicatorDefinition, type TimeSeriesFrame } from '@ticknal/quant-engine/canonical';
import { estimateAdvancedWorkPerBar, MAX_ADVANCED_PROGRAM_INPUTS, MAX_ADVANCED_WORK_UNITS_PER_BAR, type AdvancedStrategyProgram } from './strategy-program';
import { predicateMatches, runBacktestWithSeries, type BacktestAssumptions, type BacktestPeriod, type BacktestResult, type BacktestRuntime } from './run-simple-backtest';
import { compileFormula, evaluateFormula } from './formula-engine';
import { evaluateRbfModel, validRbfModel } from './rbf-model';

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

function smoothedSeries(values: Values, period: number, alpha: number): (number | null)[] {
  const result: (number | null)[] = [];
  let seed: number[] = [];
  let previous: number | null = null;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) { seed = []; previous = null; result.push(null); continue; }
    if (previous === null) {
      seed.push(value);
      if (seed.length < period) { result.push(null); continue; }
      previous = seed.reduce((mean, item, index) => mean + (item / (index + 1) - mean / (index + 1)), 0);
      result.push(previous);
      continue;
    }
    previous = alpha * value + (1 - alpha) * previous;
    result.push(finite(previous));
  }
  return result;
}

function calculate(operation: string, sources: Values[], index: number, period: number, lowerBound?: number, upperBound?: number, minPeriod?: number): number | null {
  if (operation === 'lag') return index >= period ? sources[0][index - period] ?? null : null;
  if (operation === 'coalesce') return sources.map((source) => source[index]).find((value) => value !== null && value !== undefined && Number.isFinite(value)) ?? null;
  const current = sources.map((source) => source[index]);
  if (current.some((value) => value === null || value === undefined || !Number.isFinite(value))) return null;
  const values = current as number[];
  if (operation === 'add') return finite(values.reduce((total, value) => total + value, 0));
  if (operation === 'subtract') return finite(values.slice(1).reduce((total, value) => total - value, values[0]));
  if (operation === 'multiply') return finite(values.reduce((total, value) => total * value, 1));
  if (operation === 'divide') return values.slice(1).reduce<number | null>((total, value) => total === null || value === 0 ? null : finite(total / value), values[0]);
  if (operation === 'absolute') return Math.abs(values[0]);
  if (operation === 'atan') return Math.atan(values[0]);
  if (operation === 'clamp') return Math.min(upperBound!, Math.max(lowerBound!, values[0]));
  if (operation === 'min') return Math.min(...values);
  if (operation === 'max') return Math.max(...values);
  const source = sources[0];
  const window = source.slice(Math.max(0, index - period + 1), index + 1);
  if (operation === 'median' && minPeriod !== undefined) {
    const samples = window.filter((value): value is number => value !== null && Number.isFinite(value));
    if (samples.length < minPeriod) return null;
    const sorted = samples.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  if (window.length < period || window.some((value) => value === null || !Number.isFinite(value))) return null;
  const samples = window as number[];
  if (operation === 'minimum') return Math.min(...samples);
  if (operation === 'maximum') return Math.max(...samples);
  if (operation === 'mean' || operation === 'sma') return finite(samples.reduce((total, value) => total + value, 0) / period);
  if (operation === 'median') { const sorted = [...samples].sort((a, b) => a - b); return period % 2 ? sorted[Math.floor(period / 2)] : (sorted[period / 2 - 1] + sorted[period / 2]) / 2; }
  if (operation === 'stdDev') {
    let mean = 0;
    let squaredDistance = 0;
    samples.forEach((sample, position) => { const delta = sample - mean; mean += delta / (position + 1); squaredDistance += delta * (sample - mean); });
    return finite(Math.sqrt(squaredDistance / period));
  }
  if (operation === 'percentileRank') {
    const value = values[0];
    const below = samples.filter((sample) => sample < value).length;
    const equal = samples.filter((sample) => sample === value).length;
    return (below + equal / 2) / period * 100;
  }
  if (operation === 'wma') { const divisor = period * (period + 1) / 2; return finite(samples.reduce((total, value, position) => total + value * (position + 1), 0) / divisor); }
  return null;
}

export function runAdvancedBacktest(program: AdvancedStrategyProgram, frame: TimeSeriesFrame, assumptions: BacktestAssumptions, period?: BacktestPeriod): BacktestResult {
  for (const input of program.inputs) if (input.kind === 'formula') { try { compileFormula(input); } catch { return { status: 'invalid', code: 'FORMULA_INVALID', inputId: input.id }; } }
  if (program.schemaVersion !== 2 || program.timeframe !== 'D' || program.inputs.length === 0 || program.inputs.length > MAX_ADVANCED_PROGRAM_INPUTS
    || estimateAdvancedWorkPerBar(program.inputs) > MAX_ADVANCED_WORK_UNITS_PER_BAR
    || !program.buy.length || (!program.sell.length && !program.exitPolicies?.length)) return { status: 'invalid', code: 'PROGRAM_INVALID' };
  if (program.execution && (!['next-session-open', 'signal-close'].includes(program.execution.fillPolicy)
    || !['fractional', 'wholeShares'].includes(program.execution.shareSizing))) return { status: 'invalid', code: 'EXECUTION_INVALID' };
  const series = new Map<string, (number | null)[]>();
  const formulaOutputs = new Map<string, ReadonlyMap<string, (number | null)[]>>();
  const stateful = program.inputs.filter((input) => input.kind === 'position-memory' || input.kind === 'rolling-state');
  const formulaVersions: Record<string, string> = {};
  for (const input of program.inputs) {
    if (series.has(input.id)) return { status: 'invalid', code: 'PROGRAM_INVALID', inputId: input.id };
    if (input.kind === 'rbf-model') {
      const sources = input.sourceIds.map((id) => series.get(id));
      if (!validRbfModel(input.model, sources.length) || sources.some((source) => !source) || input.sourceIds.some((id) => stateful.some((candidate) => candidate.id === id))) return { status: 'invalid', code: 'MODEL_INVALID', inputId: input.id };
      series.set(input.id, evaluateRbfModel(input.model, sources as Values[], frame.bars.length));
    } else if (input.kind === 'formula') {
      const sources = input.sourceIds.map((id) => series.get(id));
      if (sources.some((source) => !source) || input.sourceIds.some((id) => stateful.some((candidate) => candidate.id === id))) return { status: 'invalid', code: 'FORMULA_SOURCE_INVALID', inputId: input.id };
      const outputs = evaluateFormula(input, compileFormula(input), sources as Values[], frame.bars.length);
      formulaOutputs.set(input.id, outputs);
      series.set(input.id, outputs.get(input.outputKey)!);
    } else if (input.kind === 'formula-output') {
      const output = formulaOutputs.get(input.sourceId)?.get(input.outputKey);
      if (!output) return { status: 'invalid', code: 'FORMULA_OUTPUT_INVALID', inputId: input.id };
      series.set(input.id, output);
    } else if (input.kind === 'market') {
      if (!['open', 'high', 'low', 'close', 'volume'].includes(input.field)) return { status: 'invalid', code: 'MARKET_FIELD_INVALID', inputId: input.id };
      series.set(input.id, frame.bars.map((bar) => finite(Number(bar[input.field]))));
    } else if (input.kind === 'constant') {
      if (!Number.isFinite(input.value)) return { status: 'invalid', code: 'CONSTANT_INVALID', inputId: input.id };
      if (input.overrides && (Object.keys(input.overrides).length > 400 || Object.entries(input.overrides).some(([symbol, override]) =>
        !/^[A-Z0-9][A-Z0-9.!-]{0,19}$/.test(symbol) || !Number.isFinite(override) || Math.abs(override) > 1_000_000_000))) return { status: 'invalid', code: 'CONSTANT_INVALID', inputId: input.id };
      const value = input.overrides?.[frame.meta.symbol] ?? input.value;
      series.set(input.id, frame.bars.map(() => value));
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
      if (['add', 'subtract', 'multiply', 'divide', 'min', 'max', 'coalesce', 'weighted'].includes(input.operation) && sources.length < 2) return { status: 'invalid', code: 'CALCULATION_SOURCE_INVALID', inputId: input.id };
      if (['regimeStart', 'regimeMaximum', 'regimeMinimum'].includes(input.operation) && sources.length !== 2) return { status: 'invalid', code: 'CALCULATION_SOURCE_INVALID', inputId: input.id };
      if (['ema', 'rma', 'lag', 'absolute', 'atan', 'clamp', 'sma', 'wma', 'normalize', 'minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank'].includes(input.operation) && sources.length !== 1) return { status: 'invalid', code: 'CALCULATION_SOURCE_INVALID', inputId: input.id };
      if (['ema', 'rma', 'lag', 'sma', 'wma', 'minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank'].includes(input.operation) && input.period === undefined) return { status: 'invalid', code: 'CALCULATION_PERIOD_INVALID', inputId: input.id };
      if (input.operation === 'clamp' && (input.lowerBound === undefined || input.upperBound === undefined || !Number.isFinite(input.lowerBound) || !Number.isFinite(input.upperBound) || input.lowerBound > input.upperBound || Math.abs(input.lowerBound) > 1_000_000_000 || Math.abs(input.upperBound) > 1_000_000_000)) return { status: 'invalid', code: 'CALCULATION_BOUNDS_INVALID', inputId: input.id };
      const periodLength = input.period ?? 1;
      if (!Number.isSafeInteger(periodLength) || periodLength < 1 || periodLength > 1000) return { status: 'invalid', code: 'CALCULATION_PERIOD_INVALID', inputId: input.id };
      if (input.minPeriod !== undefined && (input.operation !== 'median' || !Number.isSafeInteger(input.minPeriod) || input.minPeriod < 1 || input.minPeriod > periodLength)) return { status: 'invalid', code: 'CALCULATION_PERIOD_INVALID', inputId: input.id };
      const weights = input.weights ?? input.sourceIds.map(() => 1);
      if (weights.length !== sources.length || weights.some((weight) => !Number.isFinite(weight))) return { status: 'invalid', code: 'CALCULATION_WEIGHTS_INVALID', inputId: input.id };
      if (input.operation === 'regimeStart' || input.operation === 'regimeMaximum' || input.operation === 'regimeMinimum') {
        const output: (number | null)[] = [];
        let priorRegime: number | null = null;
        let anchored: number | null = null;
        for (let index = 0; index < frame.bars.length; index += 1) {
          const value = sources[0]![index];
          const regime = sources[1]![index];
          if (value === null || value === undefined || regime === null || regime === undefined) {
            priorRegime = null; anchored = null; output.push(null); continue;
          }
          if (priorRegime === null || regime !== priorRegime || anchored === null) anchored = value;
          else if (input.operation === 'regimeMaximum') anchored = Math.max(anchored, value);
          else if (input.operation === 'regimeMinimum') anchored = Math.min(anchored, value);
          priorRegime = regime;
          output.push(anchored);
        }
        series.set(input.id, output);
      } else if (input.operation === 'normalize') {
        series.set(input.id, normalizeSeries(sources[0]!, 'zeroToHundred'));
      } else if (input.operation === 'ema' || input.operation === 'rma') {
        series.set(input.id, smoothedSeries(sources[0]!, periodLength, input.operation === 'rma' ? 1 / periodLength : 2 / (periodLength + 1)));
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
        series.set(input.id, frame.bars.map((_, index) => calculate(input.operation, sources as Values[], index, periodLength, input.lowerBound, input.upperBound, input.minPeriod)));
      }
    }
  }
  if ([...program.buy, ...program.sell].some((branch) => !branch.length || branch.some((predicate) => !series.has(predicate.inputId) || (predicate.compareInputId !== undefined && !series.has(predicate.compareInputId)) || !Number.isFinite(predicate.threshold) || !['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(predicate.operator)))) return { status: 'invalid', code: 'PREDICATE_INVALID' };
  const policies = program.exitPolicies ?? [];
  const invalidGate = (gate: typeof policies[number]['gate']) => gate !== undefined
    && (!series.has(gate.inputId) || (gate.compareInputId !== undefined && !series.has(gate.compareInputId))
      || !Number.isFinite(gate.threshold) || !['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(gate.operator));
  if (policies.length > 16 || policies.some((policy) => invalidGate(policy.gate) || (policy.kind === 'profit-target'
    ? !series.has(policy.sourceId) || !Number.isFinite(policy.multiplier) || policy.multiplier <= 0 || policy.multiplier > 1000
      || (policy.distanceMode !== undefined && !['absolute', 'percentOfEntry'].includes(policy.distanceMode))
      || (policy.targetBase !== undefined && !['entryPrice', 'signalClose'].includes(policy.targetBase))
      || (policy.freezeAtEntry !== undefined && typeof policy.freezeAtEntry !== 'boolean')
      || (policy.requireProfit !== undefined && typeof policy.requireProfit !== 'boolean')
      || (policy.freezeAtEntry && stateful.some((input) => input.id === policy.sourceId))
    : policy.kind !== 'trailing-stop' || !stateful.some((input) => input.id === policy.anchorId && input.kind === 'rolling-state' && input.operation === 'maximum')
      || !Number.isFinite(policy.distance) || policy.distance <= 0 || policy.distance > 1000
      || (policy.volatilitySourceId !== undefined && !series.has(policy.volatilitySourceId))
      || (policy.requireProfit !== undefined && typeof policy.requireProfit !== 'boolean')
      || !Number.isSafeInteger(policy.volatilityPeriod) || policy.volatilityPeriod < 1 || policy.volatilityPeriod > 1000))) {
    return { status: 'invalid', code: 'EXIT_POLICY_INVALID' };
  }

  const trueRanges = frame.bars.map((bar, index) => {
    const prior = frame.bars[index - 1]?.close;
    return prior === undefined ? bar.high - bar.low : Math.max(bar.high - bar.low, Math.abs(bar.high - prior), Math.abs(bar.low - prior));
  });
  const atrByPeriod = new Map<number, (number | null)[]>();
  for (const policy of policies) {
    if (policy.kind !== 'trailing-stop' || policy.volatilitySourceId || atrByPeriod.has(policy.volatilityPeriod)) continue;
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
  const capturedDistance = new Map<string, number | null>();
  const capturedTargetBase = new Map<string, number | null>();
  const runtime: BacktestRuntime = {
    onBar: ({ index, position, entered, exited }) => {
      for (const policy of policies) {
        if (policy.kind !== 'profit-target') continue;
        if (position === null) { capturedDistance.delete(policy.id); capturedTargetBase.delete(policy.id); }
        else if (entered) {
          const signalIndex = program.execution?.fillPolicy === 'signal-close' ? index : index - 1;
          if (policy.freezeAtEntry) capturedDistance.set(policy.id, series.get(policy.sourceId)?.[signalIndex] ?? null);
          if (policy.targetBase === 'signalClose') capturedTargetBase.set(policy.id, frame.bars[signalIndex]?.close ?? null);
        }
      }
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
        if (policy.gate && !predicateMatches(policy.gate, index, series)) continue;
        if (policy.kind === 'profit-target') {
          if (policy.requireProfit && bar.close <= position.entryPrice) continue;
          const distance = policy.freezeAtEntry ? capturedDistance.get(policy.id) : series.get(policy.sourceId)?.[index];
          const base = policy.targetBase === 'signalClose' ? capturedTargetBase.get(policy.id) : position.entryPrice;
          const target = distance === null || distance === undefined || base === null || base === undefined ? null : policy.distanceMode === 'percentOfEntry'
            ? base * (1 + policy.multiplier * distance / 100)
            : base + policy.multiplier * distance;
          if (distance !== null && distance !== undefined && (distance > 0 || distance === 0 && policy.requireProfit)
            && target !== null && Number.isFinite(target) && bar.close >= target) return 'Profit target reached.';
        } else {
          if (policy.requireProfit && bar.close <= position.entryPrice) continue;
          const anchor = series.get(policy.anchorId)?.[index];
          const atr = policy.volatilitySourceId ? series.get(policy.volatilitySourceId)?.[index] : atrByPeriod.get(policy.volatilityPeriod)?.[index];
          if (anchor !== null && anchor !== undefined && atr !== null && atr !== undefined
            && atr > 0 && bar.close <= anchor - policy.distance * atr) return 'Trailing stop reached.';
        }
      }
      return null;
    },
  };
  return runBacktestWithSeries(program, frame, assumptions, period, series, formulaVersions, runtime, program.execution);
}

import {
  evaluateRuleSeries, getIndicatorDefinition, validateMarketFrame,
  type Diagnostic, type ObservationTime, type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';
import type { SimpleStrategyProgram, StrategyProgramPredicate } from './strategy-program';

export interface BacktestAssumptions {
  readonly initialCapital: number;
  readonly feeBps: number;
}

export interface BacktestPeriod {
  readonly startDate: string;
  readonly endDate: string;
}

export interface BacktestTrade {
  readonly entrySignalTime: ObservationTime;
  readonly entryTime: ObservationTime;
  readonly entryPrice: number;
  readonly exitSignalTime: ObservationTime;
  readonly exitTime: ObservationTime;
  readonly exitPrice: number;
  readonly entryFee: number;
  readonly exitFee: number;
  readonly returnPct: number;
  readonly maePct: number;
  readonly mfePct: number;
}

export interface BacktestEquityPoint {
  readonly time: ObservationTime;
  readonly value: number;
  readonly inPosition: boolean;
}

export interface OpenBacktestPosition {
  readonly entrySignalTime: ObservationTime;
  readonly entryTime: ObservationTime;
  readonly entryPrice: number;
  readonly unrealizedReturnPct: number;
  readonly maePct: number;
  readonly mfePct: number;
}

export type BacktestResult =
  | {
      readonly status: 'ok';
      readonly trades: readonly BacktestTrade[];
      readonly equity: readonly BacktestEquityPoint[];
      readonly openPosition: OpenBacktestPosition | null;
      readonly metrics: {
        readonly totalReturnPct: number;
        readonly maxDrawdownPct: number;
        readonly closedTrades: number;
        readonly winRatePct: number | null;
      };
      readonly provenance: {
        readonly sourceRevision: string;
        readonly adjustmentMode: TimeSeriesFrame['meta']['adjustmentMode'];
        readonly adjustmentRevision: string | null;
        readonly asOf: string;
        readonly formulaVersions: Readonly<Record<string, string>>;
        readonly assumptions: BacktestAssumptions;
        readonly fillPolicy: 'next-session-open';
      };
    }
  | { readonly status: 'invalid' | 'unavailable'; readonly code: string; readonly inputId?: string; readonly diagnostics?: readonly Diagnostic[] };

interface ActivePosition {
  readonly entrySignalTime: ObservationTime;
  readonly entryTime: ObservationTime;
  readonly entryPrice: number;
  readonly entryCost: number;
  readonly entryFee: number;
  readonly units: number;
  low: number;
  high: number;
}

function validPredicates(program: SimpleStrategyProgram): boolean {
  const ids = new Set(program.inputs.map((input) => input.id));
  if (ids.size !== program.inputs.length || program.buy.length === 0 || program.sell.length === 0) return false;
  const validSide = (side: SimpleStrategyProgram['buy']) => side.every((branch) => branch.length > 0 && branch.every((predicate) =>
    ids.has(predicate.inputId) && Number.isFinite(predicate.threshold)
    && ['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow'].includes(predicate.operator)));
  return validSide(program.buy) && validSide(program.sell);
}

function predicateMatches(predicate: StrategyProgramPredicate, index: number, series: ReadonlyMap<string, readonly (number | null)[]>): boolean {
  const values = series.get(predicate.inputId);
  const current = values?.[index];
  if (current === null || current === undefined || !Number.isFinite(current)) return false;
  if (predicate.operator === 'isAbove') return current > predicate.threshold;
  if (predicate.operator === 'isBelow') return current < predicate.threshold;
  const previous = values?.[index - 1];
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return false;
  if (predicate.operator === 'crossesAbove') return previous <= predicate.threshold && current > predicate.threshold;
  return previous >= predicate.threshold && current < predicate.threshold;
}

function sideMatches(side: SimpleStrategyProgram['buy'], index: number, series: ReadonlyMap<string, readonly (number | null)[]>): boolean {
  return side.some((branch) => branch.every((predicate) => predicateMatches(predicate, index, series)));
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function runSimpleBacktest(
  program: SimpleStrategyProgram,
  frame: TimeSeriesFrame,
  assumptions: BacktestAssumptions,
  period?: BacktestPeriod,
): BacktestResult {
  if (program.schemaVersion !== 1 || program.timeframe !== 'D' || !validPredicates(program)) return { status: 'invalid', code: 'PROGRAM_INVALID' };
  const series = new Map<string, readonly (number | null)[]>();
  const formulaVersions: Record<string, string> = {};
  for (const input of program.inputs) {
    const definition = getIndicatorDefinition(input.indicatorId);
    if (!definition) return { status: 'invalid', code: 'INDICATOR_UNKNOWN', inputId: input.id };
    if (definition.formulaVersion !== input.formulaVersion) return { status: 'invalid', code: 'FORMULA_VERSION_MISMATCH', inputId: input.id };
    if (definition.metadata.repaintBehavior === 'confirmed-with-delay') {
      return { status: 'invalid', code: 'CONFIRMED_WITH_DELAY_UNSUPPORTED', inputId: input.id };
    }
    if (!definition.metadata.outputs.some((output) => output.key === input.outputKey && output.kind === 'number')) {
      return { status: 'invalid', code: 'OUTPUT_INVALID', inputId: input.id };
    }
    const evaluated = evaluateRuleSeries({
      definitionId: input.indicatorId, formulaVersion: definition.formulaVersion,
      outputKey: input.outputKey, frame, parameters: input.parameters,
      context: { calculatedAt: frame.meta.receivedAt },
    });
    if (evaluated.status !== 'ok') {
      return { status: evaluated.status === 'invalid' ? 'invalid' : 'unavailable', code: 'INDICATOR_EVALUATION_FAILED', inputId: input.id, diagnostics: evaluated.diagnostics };
    }
    series.set(input.id, evaluated.points.map((point) => point.value));
    formulaVersions[definition.id] = definition.formulaVersion;
  }
  return runBacktestWithSeries(program, frame, assumptions, period, series, formulaVersions);
}

export function runBacktestWithSeries(
  program: Pick<SimpleStrategyProgram, 'buy' | 'sell'>,
  frame: TimeSeriesFrame,
  assumptions: BacktestAssumptions,
  period: BacktestPeriod | undefined,
  series: ReadonlyMap<string, readonly (number | null)[]>,
  formulaVersions: Readonly<Record<string, string>>,
): BacktestResult {
  if (!Number.isFinite(assumptions.initialCapital) || assumptions.initialCapital <= 0
    || !Number.isFinite(assumptions.feeBps) || assumptions.feeBps < 0 || assumptions.feeBps >= 10_000) {
    return { status: 'invalid', code: 'ASSUMPTIONS_INVALID' };
  }
  if (frame.meta.effectiveTimeframe !== 'D' || frame.meta.sessionCompleteness !== 'complete'
    || frame.bars.some((bar) => bar.finality !== 'final')) return { status: 'invalid', code: 'DAILY_FINAL_FRAME_REQUIRED' };
  const frameValidation = validateMarketFrame(frame);
  if (!frameValidation.valid) return { status: 'invalid', code: 'FRAME_INVALID', diagnostics: frameValidation.diagnostics };
  if (frame.bars.some((bar) => bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0)) {
    return { status: 'invalid', code: 'NON_POSITIVE_PRICE' };
  }
  if (period && (!validDate(period.startDate) || !validDate(period.endDate) || period.startDate > period.endDate)) {
    return { status: 'invalid', code: 'PERIOD_INVALID' };
  }
  const firstIndex = period
    ? frame.bars.findIndex((bar) => String(bar.time).slice(0, 10) >= period.startDate)
    : 0;
  const lastIndex = period
    ? frame.bars.findLastIndex((bar) => String(bar.time).slice(0, 10) <= period.endDate)
    : frame.bars.length - 1;
  if (firstIndex < 0 || lastIndex < firstIndex) {
    return { status: 'unavailable', code: 'PERIOD_NO_DATA' };
  }

  const feeRate = assumptions.feeBps / 10_000;
  const trades: BacktestTrade[] = [];
  const equity: BacktestEquityPoint[] = [];
  let cash = assumptions.initialCapital;
  let position: ActivePosition | null = null;
  let pending: { readonly side: 'buy' | 'sell'; readonly signalTime: ObservationTime } | null = null;
  let peak = assumptions.initialCapital;
  let maxDrawdownPct = 0;

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const bar = frame.bars[index];
    if (pending?.side === 'buy' && position === null) {
      const units = cash / (bar.open * (1 + feeRate));
      const entryFee = units * bar.open * feeRate;
      position = { entrySignalTime: pending.signalTime, entryTime: bar.time, entryPrice: bar.open,
        entryCost: cash, entryFee, units, low: bar.low, high: bar.high };
      cash = 0;
    } else if (pending?.side === 'sell' && position !== null) {
      const exitFee = position.units * bar.open * feeRate;
      cash = position.units * bar.open - exitFee;
      trades.push({ entrySignalTime: position.entrySignalTime, entryTime: position.entryTime, entryPrice: position.entryPrice,
        exitSignalTime: pending.signalTime, exitTime: bar.time, exitPrice: bar.open,
        entryFee: position.entryFee, exitFee, returnPct: (cash / position.entryCost - 1) * 100,
        maePct: (Math.min(position.low, bar.open) / position.entryPrice - 1) * 100,
        mfePct: (Math.max(position.high, bar.open) / position.entryPrice - 1) * 100 });
      position = null;
    }
    pending = null;

    if (position !== null) {
      position.low = Math.min(position.low, bar.low);
      position.high = Math.max(position.high, bar.high);
    }
    const value = cash + (position === null ? 0 : position.units * bar.close * (1 - feeRate));
    peak = Math.max(peak, value);
    maxDrawdownPct = Math.min(maxDrawdownPct, (value / peak - 1) * 100);
    equity.push({ time: bar.time, value, inPosition: position !== null });

    if (index < lastIndex) {
      if (position === null && sideMatches(program.buy, index, series)) pending = { side: 'buy', signalTime: bar.time };
      else if (position !== null && sideMatches(program.sell, index, series)) pending = { side: 'sell', signalTime: bar.time };
    }
  }

  const finalClose = frame.bars[lastIndex]?.close;
  return {
    status: 'ok', trades, equity,
    openPosition: position !== null && finalClose !== undefined ? {
      entrySignalTime: position.entrySignalTime, entryTime: position.entryTime, entryPrice: position.entryPrice,
      unrealizedReturnPct: (position.units * finalClose * (1 - feeRate) / position.entryCost - 1) * 100,
      maePct: (position.low / position.entryPrice - 1) * 100, mfePct: (position.high / position.entryPrice - 1) * 100,
    } : null,
    metrics: {
      totalReturnPct: ((equity.at(-1)?.value ?? assumptions.initialCapital) / assumptions.initialCapital - 1) * 100,
      maxDrawdownPct, closedTrades: trades.length,
      winRatePct: trades.length > 0 ? trades.filter((trade) => trade.returnPct > 0).length / trades.length * 100 : null,
    },
    provenance: { sourceRevision: frame.meta.sourceRevision, adjustmentMode: frame.meta.adjustmentMode,
      adjustmentRevision: frame.meta.adjustmentRevision, asOf: frame.meta.asOf, formulaVersions,
      assumptions, fillPolicy: 'next-session-open' },
  };
}

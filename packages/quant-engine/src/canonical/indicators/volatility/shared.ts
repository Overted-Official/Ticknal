import type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
import {
  atr,
  ema,
  linearRegressionEnd,
  percentileRank,
  rma,
  rollingMax,
  rollingMin,
  rollingStdDev,
  sma,
  trueRange,
} from "../../core/series";
import { rollingSum } from "../../core/rolling/sum";
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from "../shared/category-definition";

export type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
export {
  atr,
  ema,
  linearRegressionEnd,
  percentileRank,
  rma,
  rollingMax,
  rollingMin,
  rollingStdDev,
  sma,
  trueRange,
} from "../../core/series";
export { rollingSum } from "../../core/rolling/sum";
export { defineCategoryIndicator } from "../shared/category-definition";
export type {
  CategoryIndicatorSpec,
  CategoryParameterRule,
} from "../shared/category-definition";
export type Series = readonly (number | null)[];

export type Params = Record<string, unknown>;

export type Rules = Record<string, CategoryParameterRule>;

export const integer = (min = 1, max = 5000): CategoryParameterRule => ({
  kind: "integer",
  min,
  max,
});

export const number = (min: number, max: number): CategoryParameterRule => ({
  kind: "number",
  min,
  max,
});

export const out = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"] = "dimensionless",
  placement: IndicatorOutputDefinition["placement"] = "pane",
  kind: IndicatorOutputDefinition["kind"] = "number",
): IndicatorOutputDefinition => ({
  key,
  label,
  unit,
  placement,
  kind,
  nullable: true,
});

export const pane = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"] = "dimensionless",
) => out(key, label, unit);

export const overlay = (key: string, label: string) =>
  out(key, label, "price", "overlay");

export const event = (key: string, label: string) =>
  out(key, label, "boolean", "event", "boolean");

export const category = (
  key: string,
  label: string,
  placement: IndicatorOutputDefinition["placement"] = "pane",
) => out(key, label, "category", placement, "category");

export const n = (p: Params, key: string) => p[key] as number;

export const field = (
  frame: TimeSeriesFrame,
  key: "open" | "high" | "low" | "close",
): number[] => frame.bars.map((bar) => bar[key]);

export function map2(
  a: Series,
  b: Series,
  fn: (a: number, b: number, index: number) => number | null,
): (number | null)[] {
  return a.map((left, index) => {
    const right = b[index];
    if (left === null || right === null) return null;
    const value = fn(left, right, index);
    return value !== null && Number.isFinite(value) ? value : null;
  });
}

export function change(series: Series, period = 1): (number | null)[] {
  return series.map((value, i) =>
    value === null ||
    series[i - period] === null ||
    series[i - period] === undefined
      ? null
      : value - series[i - period]!,
  );
}

export function logReturns(series: Series): (number | null)[] {
  return series.map((value, i) =>
    i === 0 ||
    value === null ||
    series[i - 1] === null ||
    value <= 0 ||
    series[i - 1]! <= 0
      ? null
      : Math.log(value / series[i - 1]!),
  );
}

export function bollinger(close: Series, period: number, deviation: number) {
  const middle = sma(close, period);
  const dispersion = rollingStdDev(close, period);
  return {
    middle,
    upper: map2(middle, dispersion, (mean, sigma) => mean + deviation * sigma),
    lower: map2(middle, dispersion, (mean, sigma) => mean - deviation * sigma),
  };
}

export function annualized(
  series: Series,
  period: number,
  annualization: number,
): Series {
  return rollingStdDev(series, period).map((value) =>
    value === null ? null : value * Math.sqrt(annualization) * 100,
  );
}

export function trailingStop(
  frame: TimeSeriesFrame,
  period: number,
  multiplier: number,
): IndicatorOutputs {
  const close = field(frame, "close");
  const range = atr(field(frame, "high"), field(frame, "low"), close, period);
  const stop: (number | null)[] = Array(close.length).fill(null);
  const state: (string | null)[] = Array(close.length).fill(null);
  let bullish = true;
  for (let i = 0; i < close.length; i += 1) {
    if (range[i] === null) continue;
    const longCandidate = close[i] - multiplier * range[i]!;
    const shortCandidate = close[i] + multiplier * range[i]!;
    const prior = stop[i - 1];
    if (prior !== null && prior !== undefined) {
      if (bullish && close[i] < prior) bullish = false;
      else if (!bullish && close[i] > prior) bullish = true;
    }
    stop[i] =
      prior === null || prior === undefined
        ? bullish
          ? longCandidate
          : shortCandidate
        : bullish
          ? Math.max(prior, longCandidate)
          : Math.min(prior, shortCandidate);
    state[i] = bullish ? "bullish" : "bearish";
  }
  return { stop, state };
}

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
  percentileRank,
  rma,
  rollingMax,
  rollingMin,
  rsi,
  sma,
  wma,
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
  percentileRank,
  rma,
  rollingMax,
  rollingMin,
  rsi,
  sma,
  wma,
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

export const event = (key: string, label: string) =>
  out(key, label, "boolean", "event", "boolean");

export const category = (key: string, label: string) =>
  out(key, label, "category", "pane", "category");

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
  return series.map((value, index) =>
    value === null ||
    series[index - period] === null ||
    series[index - period] === undefined
      ? null
      : value - series[index - period]!,
  );
}

export function roc(series: Series, period: number): (number | null)[] {
  return series.map((value, index) => {
    const previous = series[index - period];
    return value === null ||
      previous === null ||
      previous === undefined ||
      previous === 0
      ? null
      : (value / previous - 1) * 100;
  });
}

export function meanDeviation(
  series: Series,
  average: Series,
  period: number,
): (number | null)[] {
  return series.map((_, index) => {
    if (index + 1 < period || average[index] === null) return null;
    let total = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      const value = series[cursor];
      if (value === null) return null;
      total += Math.abs(value - average[index]!);
    }
    return total / period;
  });
}

export function stochastic(
  close: Series,
  high: Series,
  low: Series,
  period: number,
  smoothK: number,
  smoothD: number,
) {
  const highest = rollingMax(high, period);
  const lowest = rollingMin(low, period);
  const raw = close.map((value, index) =>
    value === null ||
    highest[index] === null ||
    lowest[index] === null ||
    highest[index] === lowest[index]
      ? null
      : (100 * (value - lowest[index]!)) / (highest[index]! - lowest[index]!),
  );
  const percentK = sma(raw, smoothK);
  return { percentK, percentD: sma(percentK, smoothD) };
}

export function doubleSmoothedRatio(
  numerator: Series,
  denominator: Series,
  long: number,
  short: number,
  scale = 100,
): Series {
  return map2(
    ema(ema(numerator, long), short),
    ema(ema(denominator, long), short),
    (top, bottom) => (bottom === 0 ? null : (scale * top) / bottom),
  );
}

export function divergence(
  series: Series,
  oscillator: Series,
  left: number,
  right: number,
): IndicatorOutputs {
  const bullish: (boolean | null)[] = Array(series.length).fill(null);
  const bearish: (boolean | null)[] = Array(series.length).fill(null);
  let priorLow: { price: number; oscillator: number } | null = null;
  let priorHigh: { price: number; oscillator: number } | null = null;
  for (let pivot = left; pivot < series.length - right; pivot += 1) {
    const price = series[pivot];
    const value = oscillator[pivot];
    if (price === null || value === null) continue;
    const window = series.slice(pivot - left, pivot + right + 1);
    if (window.some((candidate) => candidate === null)) continue;
    const confirmedIndex = pivot + right;
    const observed = window as number[];
    if (price === Math.min(...observed)) {
      bullish[confirmedIndex] =
        priorLow !== null &&
        price < priorLow.price &&
        value > priorLow.oscillator;
      priorLow = { price, oscillator: value };
    } else bullish[confirmedIndex] = false;
    if (price === Math.max(...observed)) {
      bearish[confirmedIndex] =
        priorHigh !== null &&
        price > priorHigh.price &&
        value < priorHigh.oscillator;
      priorHigh = { price, oscillator: value };
    } else bearish[confirmedIndex] = false;
  }
  return { bullish, bearish };
}

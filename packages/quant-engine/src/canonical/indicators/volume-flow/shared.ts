import {
  createDiagnostic,
  type IndicatorOutputDefinition,
  type IndicatorOutputs,
  type MarketField,
  type TimeSeriesFrame,
  type TimeSeriesIndicatorDefinition,
} from "../../contracts";
import { ema, percentileRank, rollingStdDev, sma } from "../../core/series";
import { rollingSum } from "../../core/rolling/sum";
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from "../shared/category-definition";

export { createDiagnostic } from "../../contracts";
export type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
export { ema, percentileRank, rollingStdDev, sma } from "../../core/series";
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
  unit: IndicatorOutputDefinition["unit"],
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

export const category = (key: string, label: string) =>
  out(key, label, "category", "pane", "category");

export const n = (p: Params, key: string) => p[key] as number;

export const field = (
  frame: TimeSeriesFrame,
  key: "open" | "high" | "low" | "close",
) => frame.bars.map((bar) => bar[key]);

export const volumes = (frame: TimeSeriesFrame): Series =>
  frame.bars.map((bar) => bar.volume);

export const trades = (frame: TimeSeriesFrame): Series =>
  frame.bars.map((bar) => bar.trades);

export const typical = (frame: TimeSeriesFrame) =>
  frame.bars.map((bar) => (bar.high + bar.low + bar.close) / 3);

export function map2(
  a: Series,
  b: Series,
  fn: (a: number, b: number, i: number) => number | null,
): (number | null)[] {
  return a.map((left, i) => {
    const right = b[i];
    if (left === null || right === null) return null;
    const value = fn(left, right, i);
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

export function roc(series: Series, period: number): (number | null)[] {
  return series.map((value, i) => {
    const prior = series[i - period];
    return value === null ||
      prior === null ||
      prior === undefined ||
      prior === 0
      ? null
      : 100 * (value / prior - 1);
  });
}

export function cumulativeVwap(frame: TimeSeriesFrame): Series {
  const price = typical(frame),
    volume = volumes(frame);
  let numerator = 0,
    denominator = 0;
  return price.map((value, i) => {
    const currentVolume = volume[i];
    if (currentVolume === null) return null;
    numerator += value * currentVolume;
    denominator += currentVolume;
    return denominator === 0 ? null : numerator / denominator;
  });
}

export function rollingVwap(frame: TimeSeriesFrame, period: number): Series {
  const price = typical(frame),
    volume = volumes(frame);
  const weighted = map2(price, volume, (a, b) => a * b);
  return map2(
    rollingSum(weighted, period),
    rollingSum(volume, period),
    (a, b) => (b === 0 ? null : a / b),
  );
}

export function accumulationDistribution(frame: TimeSeriesFrame): Series {
  let total = 0;
  return frame.bars.map((bar) => {
    if (bar.volume === null) return null;
    const range = bar.high - bar.low;
    const multiplier =
      range === 0 ? 0 : (bar.close - bar.low - (bar.high - bar.close)) / range;
    total += multiplier * bar.volume;
    return total;
  });
}

export function profile(
  frame: TimeSeriesFrame,
  bins: number,
  useVolume: boolean,
  lookback?: number,
): IndicatorOutputs {
  const poc: (number | null)[] = Array(frame.bars.length).fill(null),
    vah: (number | null)[] = Array(frame.bars.length).fill(null),
    val: (number | null)[] = Array(frame.bars.length).fill(null);
  for (let i = 0; i < frame.bars.length; i += 1) {
    const start = Math.max(0, lookback === undefined ? 0 : i - lookback + 1);
    const window = frame.bars.slice(start, i + 1);
    const minimum = Math.min(...window.map((bar) => bar.low)),
      maximum = Math.max(...window.map((bar) => bar.high));
    if (maximum === minimum) {
      poc[i] = maximum;
      vah[i] = maximum;
      val[i] = minimum;
      continue;
    }
    const width = (maximum - minimum) / bins;
    const weights = Array<number>(bins).fill(0);
    for (const bar of window) {
      const price = (bar.high + bar.low + bar.close) / 3;
      const index = Math.min(bins - 1, Math.floor((price - minimum) / width));
      weights[index] += useVolume ? (bar.volume ?? 0) : 1;
    }
    const point = weights.indexOf(Math.max(...weights));
    const total = weights.reduce((a, b) => a + b, 0);
    let included = weights[point],
      lowIndex = point,
      highIndex = point;
    while (included < total * 0.7 && (lowIndex > 0 || highIndex < bins - 1)) {
      const below = lowIndex > 0 ? weights[lowIndex - 1] : -1;
      const above = highIndex < bins - 1 ? weights[highIndex + 1] : -1;
      if (above >= below) {
        highIndex += 1;
        included += weights[highIndex];
      } else {
        lowIndex -= 1;
        included += weights[lowIndex];
      }
    }
    poc[i] = minimum + (point + 0.5) * width;
    vah[i] = minimum + (highIndex + 1) * width;
    val[i] = minimum + lowIndex * width;
  }
  return { poc, vah, val };
}

export function divergence(
  price: readonly number[],
  flow: Series,
  left: number,
  right: number,
): IndicatorOutputs {
  const bullish: (boolean | null)[] = Array(price.length).fill(null),
    bearish: (boolean | null)[] = Array(price.length).fill(null);
  let lastLow: [number, number] | null = null,
    lastHigh: [number, number] | null = null;
  for (let pivot = left; pivot < price.length - right; pivot += 1) {
    const value = flow[pivot];
    if (value === null) continue;
    const window = price.slice(pivot - left, pivot + right + 1);
    const confirmed = pivot + right;
    if (price[pivot] === Math.min(...window)) {
      bullish[confirmed] =
        lastLow !== null && price[pivot] < lastLow[0] && value > lastLow[1];
      lastLow = [price[pivot], value];
    } else bullish[confirmed] = false;
    if (price[pivot] === Math.max(...window)) {
      bearish[confirmed] =
        lastHigh !== null && price[pivot] > lastHigh[0] && value < lastHigh[1];
      lastHigh = [price[pivot], value];
    } else bearish[confirmed] = false;
  }
  return { bullish, bearish };
}

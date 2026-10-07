import type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
import {
  atr,
  crossDown,
  crossUp,
  ema,
  linearRegressionEnd,
  rma,
  rollingMax,
  rollingMin,
  sma,
  trueRange,
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
  crossDown,
  crossUp,
  ema,
  linearRegressionEnd,
  rma,
  rollingMax,
  rollingMin,
  sma,
  trueRange,
  wma,
} from "../../core/series";
export { rollingSum } from "../../core/rolling/sum";
export { defineCategoryIndicator } from "../shared/category-definition";
export type {
  CategoryIndicatorSpec,
  CategoryParameterRule,
} from "../shared/category-definition";
export type NumberSeries = readonly (number | null)[];

export type Parameters = Record<string, unknown>;

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

export const output = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"],
  placement: IndicatorOutputDefinition["placement"],
  kind: IndicatorOutputDefinition["kind"] = "number",
): IndicatorOutputDefinition => ({
  key,
  label,
  kind,
  unit,
  placement,
  nullable: true,
});

export const priceOverlay = (key: string, label: string) =>
  output(key, label, "price", "overlay");

export const pane = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"] = "dimensionless",
) => output(key, label, unit, "pane");

export const event = (key: string, label: string) =>
  output(key, label, "boolean", "event", "boolean");

export const category = (
  key: string,
  label: string,
  placement: IndicatorOutputDefinition["placement"] = "pane",
) => output(key, label, "category", placement, "category");

export function values(
  frame: TimeSeriesFrame,
  field: "open" | "high" | "low" | "close",
): number[] {
  return frame.bars.map((bar) => bar[field]);
}

export function volume(frame: TimeSeriesFrame): NumberSeries {
  return frame.bars.map((bar) => bar.volume);
}

export function n(parameters: Parameters, key: string): number {
  return parameters[key] as number;
}

export function map2(
  left: NumberSeries,
  right: NumberSeries,
  calculate: (left: number, right: number, index: number) => number | null,
): (number | null)[] {
  return left.map((leftValue, index) => {
    const rightValue = right[index];
    if (leftValue === null || rightValue === null) return null;
    const result = calculate(leftValue, rightValue, index);
    return result !== null && Number.isFinite(result) ? result : null;
  });
}

export function difference(
  series: NumberSeries,
  lookback = 1,
): (number | null)[] {
  return series.map((value, index) => {
    const previous = series[index - lookback];
    return value === null || previous === null || previous === undefined
      ? null
      : value - previous;
  });
}

export function movingAverage(
  series: NumberSeries,
  period: number,
  type: string,
): NumberSeries {
  if (type === "sma") return sma(series, period);
  if (type === "wma") return wma(series, period);
  if (type === "rma") return rma(series, period);
  return ema(series, period);
}

export function directionalMovement(frame: TimeSeriesFrame, period: number) {
  const high = values(frame, "high");
  const low = values(frame, "low");
  const close = values(frame, "close");
  const plusMovement: (number | null)[] = Array(frame.bars.length).fill(null);
  const minusMovement: (number | null)[] = Array(frame.bars.length).fill(null);
  for (let index = 1; index < frame.bars.length; index += 1) {
    const up = high[index] - high[index - 1];
    const down = low[index - 1] - low[index];
    plusMovement[index] = up > down && up > 0 ? up : 0;
    minusMovement[index] = down > up && down > 0 ? down : 0;
  }
  const smoothedRange = rma(trueRange(high, low, close), period);
  const plusDi = map2(
    rma(plusMovement, period),
    smoothedRange,
    (movement, range) => (range === 0 ? null : (100 * movement) / range),
  );
  const minusDi = map2(
    rma(minusMovement, period),
    smoothedRange,
    (movement, range) => (range === 0 ? null : (100 * movement) / range),
  );
  const dx = map2(plusDi, minusDi, (plus, minus) =>
    plus + minus === 0 ? null : (100 * Math.abs(plus - minus)) / (plus + minus),
  );
  return { plusDi, minusDi, adx: rma(dx, period) };
}

export function supertrend(
  frame: TimeSeriesFrame,
  period: number,
  multiplier: number,
): IndicatorOutputs {
  const high = values(frame, "high");
  const low = values(frame, "low");
  const close = values(frame, "close");
  const averageRange = atr(high, low, close, period);
  const line: (number | null)[] = Array(close.length).fill(null);
  const direction: (string | null)[] = Array(close.length).fill(null);
  let finalUpper: number | null = null;
  let finalLower: number | null = null;
  let bullish = true;
  for (let index = 0; index < close.length; index += 1) {
    const range = averageRange[index];
    if (range === null) continue;
    const middle = (high[index] + low[index]) / 2;
    const basicUpper = middle + multiplier * range;
    const basicLower = middle - multiplier * range;
    const previousClose = close[index - 1] ?? close[index];
    finalUpper =
      finalUpper === null ||
      basicUpper < finalUpper ||
      previousClose > finalUpper
        ? basicUpper
        : finalUpper;
    finalLower =
      finalLower === null ||
      basicLower > finalLower ||
      previousClose < finalLower
        ? basicLower
        : finalLower;
    if (bullish && close[index] < finalLower) bullish = false;
    else if (!bullish && close[index] > finalUpper) bullish = true;
    line[index] = bullish ? finalLower : finalUpper;
    direction[index] = bullish ? "bullish" : "bearish";
  }
  return { line, direction };
}

export function parabolicSar(
  frame: TimeSeriesFrame,
  step: number,
  maximum: number,
): IndicatorOutputs {
  const high = values(frame, "high");
  const low = values(frame, "low");
  const sar: (number | null)[] = Array(high.length).fill(null);
  const direction: (string | null)[] = Array(high.length).fill(null);
  if (high.length < 2) return { sar, direction };
  let bullish = frame.bars[1].close >= frame.bars[0].close;
  let extreme = bullish ? Math.max(high[0], high[1]) : Math.min(low[0], low[1]);
  let acceleration = step;
  sar[1] = bullish ? Math.min(low[0], low[1]) : Math.max(high[0], high[1]);
  direction[1] = bullish ? "bullish" : "bearish";
  for (let index = 2; index < high.length; index += 1) {
    let next = sar[index - 1]! + acceleration * (extreme - sar[index - 1]!);
    if (bullish) {
      next = Math.min(next, low[index - 1], low[index - 2]);
      if (low[index] < next) {
        bullish = false;
        next = extreme;
        extreme = low[index];
        acceleration = step;
      } else if (high[index] > extreme) {
        extreme = high[index];
        acceleration = Math.min(maximum, acceleration + step);
      }
    } else {
      next = Math.max(next, high[index - 1], high[index - 2]);
      if (high[index] > next) {
        bullish = true;
        next = extreme;
        extreme = high[index];
        acceleration = step;
      } else if (low[index] < extreme) {
        extreme = low[index];
        acceleration = Math.min(maximum, acceleration + step);
      }
    }
    sar[index] = next;
    direction[index] = bullish ? "bullish" : "bearish";
  }
  return { sar, direction };
}

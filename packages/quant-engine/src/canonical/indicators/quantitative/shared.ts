import {
  createDiagnostic,
  type IndicatorOutputDefinition,
  type IndicatorOutputs,
  type TimeSeriesFrame,
  type TimeSeriesIndicatorDefinition,
} from "../../contracts";
import { ema, percentileRank, rollingStdDev, sma } from "../../core/series";
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from "../shared/category-definition";

export { createDiagnostic } from "../../contracts";
export type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
export { ema, percentileRank, rollingStdDev, sma } from "../../core/series";
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

export const category = (key: string, label: string) =>
  out(key, label, "category", "pane", "category");

export const n = (p: Params, key: string) => p[key] as number;

export const close = (frame: TimeSeriesFrame) =>
  frame.bars.map((bar) => bar.close);

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

export function returns(
  series: readonly number[],
  log = false,
): (number | null)[] {
  return series.map((value, i) =>
    i === 0 ||
    series[i - 1] === 0 ||
    (log && (value <= 0 || series[i - 1] <= 0))
      ? null
      : log
        ? Math.log(value / series[i - 1])
        : value / series[i - 1] - 1,
  );
}

export function windowMap(
  series: Series,
  period: number,
  fn: (window: readonly number[], index: number) => number | null,
): (number | null)[] {
  return series.map((_, i) => {
    if (i + 1 < period) return null;
    const window = series.slice(i - period + 1, i + 1);
    if (window.some((value) => value === null)) return null;
    const value = fn(window as number[], i);
    return value !== null && Number.isFinite(value) ? value : null;
  });
}

export function mean(values: readonly number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: readonly number[]) {
  const m = mean(values);
  return (
    values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length
  );
}

export function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function regression(series: Series, period: number) {
  const slope: (number | null)[] = Array(series.length).fill(null),
    intercept: (number | null)[] = Array(series.length).fill(null),
    r2: (number | null)[] = Array(series.length).fill(null),
    fitted: (number | null)[] = Array(series.length).fill(null),
    residual: (number | null)[] = Array(series.length).fill(null);
  for (let i = period - 1; i < series.length; i += 1) {
    const window = series.slice(i - period + 1, i + 1);
    if (window.some((v) => v === null)) continue;
    const y = window as number[],
      xm = (period - 1) / 2,
      ym = mean(y);
    let xy = 0,
      xx = 0,
      yy = 0;
    for (let j = 0; j < period; j += 1) {
      xy += (j - xm) * (y[j] - ym);
      xx += (j - xm) ** 2;
      yy += (y[j] - ym) ** 2;
    }
    const beta = xx === 0 ? 0 : xy / xx,
      alpha = ym - beta * xm,
      estimate = alpha + beta * (period - 1);
    slope[i] = beta;
    intercept[i] = alpha;
    fitted[i] = estimate;
    residual[i] = y.at(-1)! - estimate;
    r2[i] =
      xx === 0 || yy === 0 ? 1 : Math.max(0, Math.min(1, xy ** 2 / (xx * yy)));
  }
  return { slope, intercept, r2, fitted, residual };
}

export function permutationEntropy(
  series: Series,
  period: number,
  dimension: number,
): Series {
  return windowMap(series, period, (window) => {
    const counts = new Map<string, number>();
    for (let i = 0; i <= window.length - dimension; i += 1) {
      const pattern = window
        .slice(i, i + dimension)
        .map((value, index) => ({ value, index }))
        .sort((a, b) => a.value - b.value || a.index - b.index)
        .map((item) => item.index)
        .join("");
      counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const entropy = -[...counts.values()].reduce((sum, count) => {
      const p = count / total;
      return sum + p * Math.log(p);
    }, 0);
    let factorial = 1;
    for (let i = 2; i <= dimension; i += 1) factorial *= i;
    return entropy / Math.log(factorial);
  });
}

export function shannonEntropy(
  series: Series,
  period: number,
  bins: number,
): Series {
  return windowMap(series, period, (window) => {
    const minimum = Math.min(...window),
      maximum = Math.max(...window);
    if (maximum === minimum) return 0;
    const counts = Array<number>(bins).fill(0);
    for (const value of window)
      counts[
        Math.min(
          bins - 1,
          Math.floor(((value - minimum) / (maximum - minimum)) * bins),
        )
      ] += 1;
    return (
      -counts.reduce(
        (sum, count) =>
          count === 0
            ? sum
            : sum + (count / window.length) * Math.log(count / window.length),
        0,
      ) / Math.log(bins)
    );
  });
}

export function sampleEntropy(
  series: Series,
  period: number,
  dimension: number,
  toleranceFactor: number,
  approximate: boolean,
): Series {
  return windowMap(series, period, (window) => {
    const tolerance = Math.sqrt(variance(window)) * toleranceFactor;
    const phi = (m: number) => {
      let matches = 0,
        total = 0;
      for (let i = 0; i <= window.length - m; i += 1)
        for (let j = approximate ? 0 : i + 1; j <= window.length - m; j += 1) {
          if (i === j) continue;
          total += 1;
          if (
            Math.max(
              ...Array.from({ length: m }, (_, k) =>
                Math.abs(window[i + k] - window[j + k]),
              ),
            ) <= tolerance
          )
            matches += 1;
        }
      return total === 0 ? 0 : matches / total;
    };
    const a = phi(dimension + 1),
      b = phi(dimension);
    return a <= 0 || b <= 0 ? null : -Math.log(a / b);
  });
}

export function rescaledRange(window: readonly number[]) {
  const m = mean(window),
    cumulative: number[] = [];
  let total = 0;
  for (const value of window) {
    total += value - m;
    cumulative.push(total);
  }
  const range = Math.max(...cumulative) - Math.min(...cumulative),
    sd = Math.sqrt(variance(window));
  return sd === 0 ? null : range / sd;
}

export function changePointScore(series: Series, period: number): Series {
  return windowMap(series, period, (window) => {
    const half = Math.floor(window.length / 2),
      first = window.slice(0, half),
      second = window.slice(half),
      pooled = Math.sqrt((variance(first) + variance(second)) / 2);
    return pooled === 0 ? 0 : Math.abs(mean(second) - mean(first)) / pooled;
  });
}

export function unavailable(
  frame: TimeSeriesFrame,
  outputs: readonly IndicatorOutputDefinition[],
): IndicatorOutputs {
  return Object.fromEntries(
    outputs.map((output) => [output.key, Array(frame.bars.length).fill(null)]),
  );
}

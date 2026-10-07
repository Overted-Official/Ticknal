import type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
import {
  atr,
  linearRegressionEnd,
  rollingMax,
  rollingMin,
  rollingStdDev,
  sma,
} from "../../core/series";
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from "../shared/category-definition";

export type {
  IndicatorOutputDefinition,
  IndicatorOutputs,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
export {
  atr,
  linearRegressionEnd,
  rollingMax,
  rollingMin,
  rollingStdDev,
  sma,
} from "../../core/series";
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
  unit: IndicatorOutputDefinition["unit"] = "price",
  placement: IndicatorOutputDefinition["placement"] = "overlay",
  kind: IndicatorOutputDefinition["kind"] = "number",
): IndicatorOutputDefinition => ({
  key,
  label,
  unit,
  placement,
  kind,
  nullable: true,
});

export const overlay = (key: string, label: string) => out(key, label);

export const pane = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"] = "dimensionless",
) => out(key, label, unit, "pane");

export const event = (key: string, label: string) =>
  out(key, label, "boolean", "event", "boolean");

export const category = (
  key: string,
  label: string,
  placement: IndicatorOutputDefinition["placement"] = "overlay",
) => out(key, label, "category", placement, "category");

export const n = (p: Params, key: string) => p[key] as number;

export const field = (
  frame: TimeSeriesFrame,
  key: "open" | "high" | "low" | "close",
) => frame.bars.map((bar) => bar[key]);

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

export function previous(series: readonly number[]): (number | null)[] {
  return series.map((_, i) => (i === 0 ? null : series[i - 1]));
}

export function rollingRegression(series: readonly number[], period: number) {
  const regression = linearRegressionEnd(series, period);
  const slope: (number | null)[] = Array(series.length).fill(null);
  const rSquared: (number | null)[] = Array(series.length).fill(null);
  const deviation: (number | null)[] = Array(series.length).fill(null);
  const maxDeviation: (number | null)[] = Array(series.length).fill(null);
  for (let i = period - 1; i < series.length; i += 1) {
    const window = series.slice(i - period + 1, i + 1);
    const xMean = (period - 1) / 2;
    const yMean = window.reduce((a, b) => a + b, 0) / period;
    let xy = 0,
      xx = 0,
      yy = 0;
    for (let j = 0; j < period; j += 1) {
      xy += (j - xMean) * (window[j] - yMean);
      xx += (j - xMean) ** 2;
      yy += (window[j] - yMean) ** 2;
    }
    const beta = xx === 0 ? 0 : xy / xx;
    const alpha = yMean - beta * xMean;
    const residuals = window.map((value, j) => value - (alpha + beta * j));
    slope[i] = beta;
    rSquared[i] =
      xx === 0 || yy === 0
        ? 1
        : Math.max(0, Math.min(1, (xy * xy) / (xx * yy)));
    deviation[i] = Math.sqrt(
      residuals.reduce((sum, value) => sum + value ** 2, 0) / period,
    );
    maxDeviation[i] = Math.max(...residuals.map(Math.abs));
  }
  return { regression, slope, rSquared, deviation, maxDeviation };
}

export function pivotLevels(
  frame: TimeSeriesFrame,
  mode: "classic" | "fibonacci" | "woodie" | "demark",
): IndicatorOutputs {
  const high = previous(field(frame, "high"));
  const low = previous(field(frame, "low"));
  const close = previous(field(frame, "close"));
  const open = previous(field(frame, "open"));
  const pivot = high.map((h, i) => {
    const l = low[i],
      c = close[i],
      o = open[i];
    if (h === null || l === null || c === null || o === null) return null;
    if (mode === "woodie") return (h + l + 2 * field(frame, "open")[i]) / 4;
    if (mode === "demark") {
      const x = c < o ? h + 2 * l + c : c > o ? 2 * h + l + c : h + l + 2 * c;
      return x / 4;
    }
    return (h + l + c) / 3;
  });
  const range = map2(high, low, (h, l) => h - l);
  if (mode === "fibonacci")
    return {
      pivot,
      r1: map2(pivot, range, (p, r) => p + 0.382 * r),
      s1: map2(pivot, range, (p, r) => p - 0.382 * r),
      r2: map2(pivot, range, (p, r) => p + 0.618 * r),
      s2: map2(pivot, range, (p, r) => p - 0.618 * r),
      r3: map2(pivot, range, (p, r) => p + r),
      s3: map2(pivot, range, (p, r) => p - r),
    };
  if (mode === "demark")
    return {
      pivot,
      resistance: high.map((h, i) =>
        h === null || low[i] === null || close[i] === null || open[i] === null
          ? null
          : (close[i]! < open[i]!
              ? h + 2 * low[i]! + close[i]!
              : close[i]! > open[i]!
                ? 2 * h + low[i]! + close[i]!
                : h + low[i]! + 2 * close[i]!) /
              2 -
            low[i]!,
      ),
      support: high.map((h, i) =>
        h === null || low[i] === null || close[i] === null || open[i] === null
          ? null
          : (close[i]! < open[i]!
              ? h + 2 * low[i]! + close[i]!
              : close[i]! > open[i]!
                ? 2 * h + low[i]! + close[i]!
                : h + low[i]! + 2 * close[i]!) /
              2 -
            h,
      ),
    };
  const r1 = pivot.map((p, i) =>
    p === null || low[i] === null ? null : 2 * p - low[i]!,
  );
  const s1 = pivot.map((p, i) =>
    p === null || high[i] === null ? null : 2 * p - high[i]!,
  );
  const r2 = map2(pivot, range, (p, r) => p + r);
  const s2 = map2(pivot, range, (p, r) => p - r);
  const r3 = high.map((h, i) =>
    h === null || pivot[i] === null || low[i] === null
      ? null
      : h + 2 * (pivot[i]! - low[i]!),
  );
  const s3 = low.map((l, i) =>
    l === null || pivot[i] === null || high[i] === null
      ? null
      : l - 2 * (high[i]! - pivot[i]!),
  );
  const r4 = map2(r3, range, (v, r) => v + r);
  const s4 = map2(s3, range, (v, r) => v - r);
  const r5 = map2(r4, range, (v, r) => v + r);
  const s5 = map2(s4, range, (v, r) => v - r);
  return { pivot, r1, s1, r2, s2, r3, s3, r4, s4, r5, s5 };
}

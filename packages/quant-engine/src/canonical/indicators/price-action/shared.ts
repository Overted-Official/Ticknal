import type {
  IndicatorOutputDefinition,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
import { percentileRank, rollingMax, rollingMin, sma } from "../../core/series";
import {
  defineCategoryIndicator,
  type CategoryIndicatorSpec,
  type CategoryParameterRule,
} from "../shared/category-definition";

export type {
  IndicatorOutputDefinition,
  MarketField,
  TimeSeriesFrame,
  TimeSeriesIndicatorDefinition,
} from "../../contracts";
export { percentileRank, rollingMax, rollingMin, sma } from "../../core/series";
export { defineCategoryIndicator } from "../shared/category-definition";
export type {
  CategoryIndicatorSpec,
  CategoryParameterRule,
} from "../shared/category-definition";
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
  unit: IndicatorOutputDefinition["unit"] = "boolean",
  placement: IndicatorOutputDefinition["placement"] = "event",
  kind: IndicatorOutputDefinition["kind"] = "boolean",
): IndicatorOutputDefinition => ({
  key,
  label,
  unit,
  placement,
  kind,
  nullable: true,
});

export const event = (key: string, label: string) => out(key, label);

export const pane = (
  key: string,
  label: string,
  unit: IndicatorOutputDefinition["unit"] = "percent",
) => out(key, label, unit, "pane", "number");

export const category = (key: string, label: string) =>
  out(key, label, "category", "pane", "category");

export const n = (p: Params, key: string) => p[key] as number;

export const field = (
  frame: TimeSeriesFrame,
  key: "open" | "high" | "low" | "close",
) => frame.bars.map((bar) => bar[key]);

export const ranges = (frame: TimeSeriesFrame) =>
  frame.bars.map((bar) => bar.high - bar.low);

export const bodies = (frame: TimeSeriesFrame) =>
  frame.bars.map((bar) => Math.abs(bar.close - bar.open));

export const direction = (frame: TimeSeriesFrame, index: number) =>
  frame.bars[index].close > frame.bars[index].open
    ? 1
    : frame.bars[index].close < frame.bars[index].open
      ? -1
      : 0;

export const upperWick = (frame: TimeSeriesFrame, index: number) =>
  frame.bars[index].high -
  Math.max(frame.bars[index].open, frame.bars[index].close);

export const lowerWick = (frame: TimeSeriesFrame, index: number) =>
  Math.min(frame.bars[index].open, frame.bars[index].close) -
  frame.bars[index].low;

export const nullableEvents = (
  frame: TimeSeriesFrame,
  lookback: number,
  test: (index: number) => boolean,
) => frame.bars.map((_, index) => (index < lookback ? null : test(index)));

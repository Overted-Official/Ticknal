import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin, rollingRegression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period")),
    slope = rollingRegression(close, n(p, "period")).slope;
  const score = close.map((value, i) =>
    high[i] === null || low[i] === null || slope[i] === null
      ? null
      : (slope[i]! > 0 ? 1 : slope[i]! < 0 ? -1 : 0) +
        (value > (high[i]! + low[i]!) / 2 ? 1 : -1) +
        (i > 0 && high[i - 1] !== null && value > high[i - 1]!
          ? 1
          : i > 0 && low[i - 1] !== null && value < low[i - 1]!
            ? -1
            : 0),
  );
  return {
    score,
    bullish: score.map((v) => (v === null ? null : v >= 2)),
    bearish: score.map((v) => (v === null ? null : v <= -2)),
    neutral: score.map((v) => (v === null ? null : Math.abs(v) < 2)),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin, rollingRegression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period")),
    slope = rollingRegression(close, n(p, "period")).slope;
  return {
    bullish_choch: close.map((value, i) =>
      i === 0 || high[i - 1] === null || slope[i - 1] === null
        ? null
        : slope[i - 1]! < 0 && value > high[i - 1]!,
    ),
    bearish_choch: close.map((value, i) =>
      i === 0 || low[i - 1] === null || slope[i - 1] === null
        ? null
        : slope[i - 1]! > 0 && value < low[i - 1]!,
    ),
  };
};

export default compute;

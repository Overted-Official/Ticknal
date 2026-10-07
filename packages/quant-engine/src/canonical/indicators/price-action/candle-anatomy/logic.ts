import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, direction, lowerWick, ranges, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const range = ranges(frame);
  return {
    body_pct: range.map((value, i) =>
      value === 0 ? null : (100 * bodies(frame)[i]) / value,
    ),
    upper_wick_pct: range.map((value, i) =>
      value === 0 ? null : (100 * upperWick(frame, i)) / value,
    ),
    lower_wick_pct: range.map((value, i) =>
      value === 0 ? null : (100 * lowerWick(frame, i)) / value,
    ),
    direction: frame.bars.map((_, i) =>
      direction(frame, i) > 0
        ? "bullish"
        : direction(frame, i) < 0
          ? "bearish"
          : "neutral",
    ),
  };
};

export default compute;

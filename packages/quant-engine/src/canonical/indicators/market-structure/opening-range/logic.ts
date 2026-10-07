import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const count = n(p, "bars");
  const high = Math.max(...field(frame, "high").slice(0, count)),
    low = Math.min(...field(frame, "low").slice(0, count));
  return {
    opening_high: frame.bars.map((_, i) => (i + 1 < count ? null : high)),
    opening_low: frame.bars.map((_, i) => (i + 1 < count ? null : low)),
    breakout_up: frame.bars.map((bar, i) =>
      i < count ? null : bar.close > high,
    ),
    breakout_down: frame.bars.map((bar, i) =>
      i < count ? null : bar.close < low,
    ),
  };
};

export default compute;

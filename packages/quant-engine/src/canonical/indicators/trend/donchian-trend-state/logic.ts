import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingMax, rollingMin, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const upper = rollingMax(values(frame, "high"), period);
  const lower = rollingMin(values(frame, "low"), period);
  const close = values(frame, "close");
  return {
    upper,
    lower,
    middle: map2(upper, lower, (a, b) => (a + b) / 2),
    breakout_state: close.map((price, i) =>
      upper[i - 1] === null ||
      upper[i - 1] === undefined ||
      lower[i - 1] === null ||
      lower[i - 1] === undefined
        ? null
        : price > upper[i - 1]!
          ? "bullish-breakout"
          : price < lower[i - 1]!
            ? "bearish-breakout"
            : "inside",
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingSum, trueRange, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const high = values(frame, "high");
  const low = values(frame, "low");
  const plus = high.map((value, i) =>
    i === 0 ? null : Math.abs(value - low[i - 1]),
  );
  const minus = low.map((value, i) =>
    i === 0 ? null : Math.abs(value - high[i - 1]),
  );
  const range = rollingSum(
    trueRange(high, low, values(frame, "close")),
    period,
  );
  return {
    vi_plus: map2(rollingSum(plus, period), range, (a, b) =>
      b === 0 ? null : a / b,
    ),
    vi_minus: map2(rollingSum(minus, period), range, (a, b) =>
      b === 0 ? null : a / b,
    ),
  };
};

export default compute;

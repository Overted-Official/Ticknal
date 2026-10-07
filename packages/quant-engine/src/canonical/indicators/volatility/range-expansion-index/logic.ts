import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = field(frame, "high"),
    low = field(frame, "low");
  const movement = high.map((value, i) =>
    i < n(p, "comparison")
      ? null
      : value -
        high[i - n(p, "comparison")] +
        (low[i] - low[i - n(p, "comparison")]),
  );
  const absolute = movement.map((value) =>
    value === null ? null : Math.abs(value),
  );
  return {
    rei: map2(
      rollingSum(movement, n(p, "period")),
      rollingSum(absolute, n(p, "period")),
      (a, b) => (b === 0 ? 0 : (100 * a) / b),
    ),
  };
};

export default compute;

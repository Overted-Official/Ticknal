import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = field(frame, "high"),
    low = field(frame, "low"),
    close = field(frame, "close");
  let maximum = -Infinity,
    minimum = Infinity;
  const allHigh = high.map((value) => {
    maximum = Math.max(maximum, value);
    return maximum;
  });
  const allLow = low.map((value) => {
    minimum = Math.min(minimum, value);
    return minimum;
  });
  const yearHigh = rollingMax(high, n(p, "yearBars")),
    yearLow = rollingMin(low, n(p, "yearBars"));
  return {
    all_time_high: allHigh,
    all_time_low: allLow,
    year_high: yearHigh,
    year_low: yearLow,
    distance_to_high_pct: close.map((value, i) =>
      yearHigh[i] === null || yearHigh[i] === 0
        ? null
        : 100 * (value / yearHigh[i]! - 1),
    ),
  };
};

export default compute;

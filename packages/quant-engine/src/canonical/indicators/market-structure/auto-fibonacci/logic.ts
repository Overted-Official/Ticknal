import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period"));
  return {
    swing_high: high,
    swing_low: low,
    level_382: map2(high, low, (h, l) => h - 0.382 * (h - l)),
    level_618: map2(high, low, (h, l) => h - 0.618 * (h - l)),
  };
};

export default compute;

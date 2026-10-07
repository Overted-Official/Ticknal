import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period"));
  const make = (ratio: number) =>
    map2(high, low, (h, l) => l + ratio * (h - l));
  return {
    level_1272: make(1.272),
    level_1618: make(1.618),
    level_2618: make(2.618),
  };
};

export default compute;

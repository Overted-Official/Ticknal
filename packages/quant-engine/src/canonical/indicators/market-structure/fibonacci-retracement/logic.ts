import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period"));
  const make = (ratio: number) =>
    map2(high, low, (h, l) => h - ratio * (h - l));
  return {
    level_236: make(0.236),
    level_382: make(0.382),
    level_500: make(0.5),
    level_618: make(0.618),
    level_786: make(0.786),
  };
};

export default compute;

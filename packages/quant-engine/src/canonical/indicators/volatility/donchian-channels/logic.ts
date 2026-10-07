import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const upper = rollingMax(field(frame, "high"), n(p, "period"));
  const lower = rollingMin(field(frame, "low"), n(p, "period"));
  return { upper, lower, middle: map2(upper, lower, (a, b) => (a + b) / 2) };
};

export default compute;

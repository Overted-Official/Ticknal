import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingStdDev, rollingVwap, typical } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const vwap = rollingVwap(frame, n(p, "period")),
    deviation = rollingStdDev(typical(frame), n(p, "period"));
  return {
    vwap,
    upper: map2(vwap, deviation, (a, b) => a + n(p, "deviations") * b),
    lower: map2(vwap, deviation, (a, b) => a - n(p, "deviations") * b),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const resistance = rollingMax(field(frame, "high"), n(p, "period")),
    support = rollingMin(field(frame, "low"), n(p, "period"));
  return {
    support,
    resistance,
    midpoint: map2(resistance, support, (a, b) => (a + b) / 2),
  };
};

export default compute;

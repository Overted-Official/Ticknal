import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingRegression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = rollingRegression(field(frame, "close"), n(p, "period"));
  return {
    center: result.regression,
    upper: map2(result.regression, result.maxDeviation, (a, b) => a + b),
    lower: map2(result.regression, result.maxDeviation, (a, b) => a - b),
  };
};

export default compute;

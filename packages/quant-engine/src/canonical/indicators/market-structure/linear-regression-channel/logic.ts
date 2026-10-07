import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingRegression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = rollingRegression(field(frame, "close"), n(p, "period"));
  return {
    regression: result.regression,
    upper: map2(
      result.regression,
      result.deviation,
      (a, b) => a + n(p, "deviations") * b,
    ),
    lower: map2(
      result.regression,
      result.deviation,
      (a, b) => a - n(p, "deviations") * b,
    ),
    slope: result.slope,
    r_squared: result.rSquared,
  };
};

export default compute;

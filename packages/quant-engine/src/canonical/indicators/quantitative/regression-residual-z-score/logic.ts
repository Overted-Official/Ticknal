import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, map2, n, regression, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const residual = regression(close(frame), n(p, "period")).residual,
    deviation = rollingStdDev(residual, n(p, "period"));
  return {
    residual,
    z_score: map2(residual, deviation, (a, b) => (b === 0 ? null : a / b)),
  };
};

export default compute;

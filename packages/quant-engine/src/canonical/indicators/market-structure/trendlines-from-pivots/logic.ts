import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingRegression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const upper = rollingRegression(field(frame, "high"), n(p, "period")),
    lower = rollingRegression(field(frame, "low"), n(p, "period"));
  return {
    upper_trendline: upper.regression,
    lower_trendline: lower.regression,
    upper_slope: upper.slope,
    lower_slope: lower.slope,
  };
};

export default compute;

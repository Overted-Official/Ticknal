import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  field,
  linearRegressionEnd,
  map2,
  n,
  rollingMax,
  rollingMin,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const resistance = rollingMax(field(frame, "high"), period),
    support = rollingMin(field(frame, "low"), period);
  return {
    resistance,
    support,
    midpoint: map2(resistance, support, (a, b) => (a + b) / 2),
    upper_trend: linearRegressionEnd(field(frame, "high"), period),
    lower_trend: linearRegressionEnd(field(frame, "low"), period),
  };
};

export default compute;

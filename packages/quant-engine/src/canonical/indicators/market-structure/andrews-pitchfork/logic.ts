import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  field,
  map2,
  n,
  rollingMax,
  rollingMin,
  rollingRegression,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = rollingRegression(field(frame, "close"), n(p, "period"));
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period"));
  const width = map2(high, low, (a, b) => (a - b) / 2);
  return {
    median: result.regression,
    upper: map2(result.regression, width, (a, b) => a + b),
    lower: map2(result.regression, width, (a, b) => a - b),
  };
};

export default compute;

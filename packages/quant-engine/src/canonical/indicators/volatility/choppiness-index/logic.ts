import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  field,
  map2,
  n,
  rollingMax,
  rollingMin,
  rollingSum,
  trueRange,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const sum = rollingSum(
    trueRange(field(frame, "high"), field(frame, "low"), field(frame, "close")),
    period,
  );
  const span = map2(
    rollingMax(field(frame, "high"), period),
    rollingMin(field(frame, "low"), period),
    (a, b) => a - b,
  );
  return {
    choppiness_0_100: map2(sum, span, (a, b) =>
      a <= 0 || b <= 0 ? null : (100 * Math.log10(a / b)) / Math.log10(period),
    ),
  };
};

export default compute;

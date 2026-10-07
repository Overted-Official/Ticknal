import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const rangeFor = (period: number) =>
    map2(
      rollingMax(field(frame, "high"), period),
      rollingMin(field(frame, "low"), period),
      (a, b) => a - b,
    );
  return {
    expansion_ratio: map2(
      rangeFor(n(p, "short")),
      rangeFor(n(p, "long")),
      (a, b) => (b === 0 ? null : a / b),
    ),
  };
};

export default compute;

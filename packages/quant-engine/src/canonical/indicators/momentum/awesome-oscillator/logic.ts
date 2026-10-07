import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const median = field(frame, "high").map(
    (high, i) => (high + field(frame, "low")[i]) / 2,
  );
  return {
    awesome: map2(
      sma(median, n(p, "fast")),
      sma(median, n(p, "slow")),
      (a, b) => a - b,
    ),
  };
};

export default compute;

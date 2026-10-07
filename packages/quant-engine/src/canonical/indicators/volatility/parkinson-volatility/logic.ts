import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const squared = field(frame, "high").map((high, i) =>
    field(frame, "low")[i] <= 0
      ? null
      : Math.log(high / field(frame, "low")[i]) ** 2,
  );
  const mean = rollingSum(squared, n(p, "period")).map((value) =>
    value === null ? null : value / n(p, "period"),
  );
  return {
    volatility_pct: mean.map((value) =>
      value === null
        ? null
        : 100 * Math.sqrt((value / (4 * Math.log(2))) * n(p, "annualization")),
    ),
  };
};

export default compute;

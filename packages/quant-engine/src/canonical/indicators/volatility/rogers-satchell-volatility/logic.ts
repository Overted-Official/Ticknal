import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const terms = field(frame, "close").map((close, i) => {
    const open = field(frame, "open")[i],
      high = field(frame, "high")[i],
      low = field(frame, "low")[i];
    return open <= 0 || low <= 0 || close <= 0
      ? null
      : Math.log(high / open) * Math.log(high / close) +
          Math.log(low / open) * Math.log(low / close);
  });
  const mean = rollingSum(terms, n(p, "period")).map((value) =>
    value === null ? null : Math.max(0, value / n(p, "period")),
  );
  return {
    volatility_pct: mean.map((value) =>
      value === null ? null : 100 * Math.sqrt(value * n(p, "annualization")),
    ),
  };
};

export default compute;

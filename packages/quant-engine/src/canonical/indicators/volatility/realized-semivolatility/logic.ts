import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, logReturns, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const returns = logReturns(field(frame, "close"));
  const period = n(p, "period");
  const scale = Math.sqrt(n(p, "annualization") / period) * 100;
  const upside = rollingSum(
    returns.map((v) => (v === null ? null : v > 0 ? v ** 2 : 0)),
    period,
  );
  const downside = rollingSum(
    returns.map((v) => (v === null ? null : v < 0 ? v ** 2 : 0)),
    period,
  );
  return {
    upside_vol: upside.map((v) => (v === null ? null : Math.sqrt(v) * scale)),
    downside_vol: downside.map((v) =>
      v === null ? null : Math.sqrt(v) * scale,
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, map2, n, returns, rollingStdDev, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    average = sma(ret, n(p, "period")),
    deviation = rollingStdDev(ret, n(p, "period")),
    dailyRf = n(p, "riskFreeAnnualPct") / 100 / n(p, "annualization");
  return {
    rolling_sharpe: map2(average, deviation, (a, b) =>
      b === 0 ? null : ((a - dailyRf) / b) * Math.sqrt(n(p, "annualization")),
    ),
  };
};

export default compute;

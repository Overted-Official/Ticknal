import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, map2, mean, n, returns, sma, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    target = n(p, "targetAnnualPct") / 100 / n(p, "annualization"),
    average = sma(ret, n(p, "period")),
    downside = windowMap(ret, n(p, "period"), (window) =>
      Math.sqrt(mean(window.map((value) => Math.min(0, value - target) ** 2))),
    );
  return {
    rolling_sortino: map2(average, downside, (a, b) =>
      b === 0 ? null : ((a - target) / b) * Math.sqrt(n(p, "annualization")),
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, regression, returns, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    fit = regression(source, n(p, "period")),
    volatility = rollingStdDev(returns(source), n(p, "period"));
  const score = source.map((value, i) =>
    fit.slope[i] === null ||
    fit.r2[i] === null ||
    volatility[i] === null ||
    value === 0
      ? null
      : Math.min(
          100,
          100 *
            fit.r2[i]! *
            Math.min(
              1,
              Math.abs(fit.slope[i]! / value) / Math.max(volatility[i]!, 1e-12),
            ),
        ),
  );
  return {
    score_0_100: score,
    state: score.map((value) =>
      value === null
        ? null
        : value >= 70
          ? "strong"
          : value >= 40
            ? "moderate"
            : "weak",
    ),
  };
};

export default compute;

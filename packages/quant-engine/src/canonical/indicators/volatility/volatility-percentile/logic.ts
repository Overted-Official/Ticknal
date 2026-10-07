import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { annualized, field, logReturns, n, percentileRank } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  percentile_0_100: percentileRank(
    annualized(
      logReturns(field(frame, "close")),
      n(p, "volatilityPeriod"),
      n(p, "annualization"),
    ),
    n(p, "rankPeriod"),
  ),
});

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, logReturns, n, percentileRank, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const rank = percentileRank(
    rollingStdDev(logReturns(field(frame, "close")), n(p, "volatilityPeriod")),
    n(p, "rankPeriod"),
  );
  return {
    state: rank.map((value) =>
      value === null
        ? null
        : value < 25
          ? "low"
          : value < 75
            ? "normal"
            : value < 95
              ? "high"
              : "extreme",
    ),
  };
};

export default compute;

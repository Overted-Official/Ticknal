import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, percentileRank, roc } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  percentile_0_100: percentileRank(
    roc(field(frame, "close"), n(p, "momentumPeriod")),
    n(p, "rankPeriod"),
  ),
});

export default compute;

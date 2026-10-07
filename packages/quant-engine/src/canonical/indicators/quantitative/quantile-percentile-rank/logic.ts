import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, percentileRank } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  percentile_0_100: percentileRank(close(frame), n(p, "period")),
});

export default compute;

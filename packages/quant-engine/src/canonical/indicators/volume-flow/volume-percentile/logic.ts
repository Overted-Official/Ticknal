import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, percentileRank, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  percentile_0_100: percentileRank(volumes(frame), n(p, "period")),
});

export default compute;

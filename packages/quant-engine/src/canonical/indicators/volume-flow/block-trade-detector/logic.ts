import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, percentileRank, trades, typical, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const size = map2(
    map2(typical(frame), volumes(frame), (a, b) => a * b),
    trades(frame),
    (a, b) => (b === 0 ? null : a / b),
  );
  const rank = percentileRank(size, n(p, "period"));
  return {
    block_event: rank.map((value) =>
      value === null ? null : value >= n(p, "percentileThreshold"),
    ),
    size_percentile: rank,
  };
};

export default compute;

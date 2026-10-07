import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, percentileRank, ranges, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = ranges(frame);
  const average = sma(range, n(p, "period"));
  const ratio = range.map((value, i) =>
    average[i] === null || average[i] === 0 ? null : value / average[i]!,
  );
  const percentile = percentileRank(range, n(p, "period"));
  return {
    event: ratio.map((value) =>
      value === null ? null : value >= n(p, "ratioThreshold"),
    ),
    range_ratio: ratio,
    percentile,
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bollinger, field, n, percentileRank } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const bands = bollinger(
    field(frame, "close"),
    n(p, "period"),
    n(p, "deviation"),
  );
  const bandwidth = bands.middle.map((middle, i) =>
    middle === null ||
    middle === 0 ||
    bands.upper[i] === null ||
    bands.lower[i] === null
      ? null
      : (100 * (bands.upper[i]! - bands.lower[i]!)) / middle,
  );
  const percentile = percentileRank(bandwidth, n(p, "rankPeriod"));
  return {
    squeeze_state: percentile.map((value) =>
      value === null ? null : value <= n(p, "threshold"),
    ),
    percentile,
  };
};

export default compute;

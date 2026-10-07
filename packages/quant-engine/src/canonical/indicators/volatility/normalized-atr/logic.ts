import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, map2, n, percentileRank } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const base = map2(
    atr(field(frame, "high"), field(frame, "low"), close, n(p, "atrPeriod")),
    close,
    (range, price) => (price === 0 ? null : (100 * range) / price),
  );
  return { normalized_atr: percentileRank(base, n(p, "rankPeriod")) };
};

export default compute;

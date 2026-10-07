import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n } from "../shared";
import type { TimeSeriesFrame } from "../shared";

type Parameters = Record<string, unknown>;

function confirmedPivots(frame: TimeSeriesFrame, left: number, right: number) {
  const high = field(frame, "high");
  const low = field(frame, "low");
  const pivotHigh: (number | null)[] = Array(high.length).fill(null);
  const pivotLow: (number | null)[] = Array(low.length).fill(null);
  for (let i = left; i < high.length - right; i += 1) {
    const highs = high.slice(i - left, i + right + 1);
    const lows = low.slice(i - left, i + right + 1);
    if (high[i] === Math.max(...highs)) pivotHigh[i] = high[i];
    if (low[i] === Math.min(...lows)) pivotLow[i] = low[i];
  }
  return { pivotHigh, pivotLow };
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const pivots = confirmedPivots(frame, n(p, "left"), n(p, "right"));
  return { pivot_high: pivots.pivotHigh, pivot_low: pivots.pivotLow };
};

export default compute;

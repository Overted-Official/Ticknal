import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const pivots: (number | null)[] = Array(close.length).fill(null),
    legs: (number | null)[] = Array(close.length).fill(null),
    changes: (number | null)[] = Array(close.length).fill(null);
  let pivot = close[0] ?? 0,
    pivotIndex = 0,
    trend = 0;
  for (let i = 1; i < close.length; i += 1) {
    const pct = pivot === 0 ? 0 : 100 * (close[i] / pivot - 1);
    if (trend >= 0 && close[i] >= pivot) {
      pivot = close[i];
      pivotIndex = i;
      trend = 1;
    } else if (trend <= 0 && close[i] <= pivot) {
      pivot = close[i];
      pivotIndex = i;
      trend = -1;
    } else if (
      (trend >= 0 && pct <= -n(p, "reversalPct")) ||
      (trend <= 0 && pct >= n(p, "reversalPct"))
    ) {
      pivots[pivotIndex] = pivot;
      changes[i] = pct;
      trend = trend >= 0 ? -1 : 1;
      pivot = close[i];
      pivotIndex = i;
    }
    legs[i] = trend;
  }
  pivots[pivotIndex] = pivot;
  return { pivots, legs, change_pct: changes };
};

export default compute;

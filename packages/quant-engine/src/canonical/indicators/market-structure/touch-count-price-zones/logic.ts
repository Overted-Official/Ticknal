import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const center = sma(close, n(p, "period"));
  const upper = center.map((value) =>
    value === null ? null : value * (1 + n(p, "tolerancePct") / 100),
  );
  const lower = center.map((value) =>
    value === null ? null : value * (1 - n(p, "tolerancePct") / 100),
  );
  const touches = close.map((_, i) => {
    if (center[i] === null) return null;
    let count = 0;
    for (let j = i - n(p, "period") + 1; j <= i; j += 1)
      if (Math.abs(close[j] / center[i]! - 1) * 100 <= n(p, "tolerancePct"))
        count += 1;
    return count;
  });
  return {
    zone_center: center,
    zone_upper: upper,
    zone_lower: lower,
    touches,
    strength: touches.map((value) =>
      value === null ? null : (100 * value) / n(p, "period"),
    ),
  };
};

export default compute;

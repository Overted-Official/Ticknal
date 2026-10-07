import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = field(frame, "high");
  const low = field(frame, "low");
  const deMax = high.map((value, i) =>
    i === 0 ? null : Math.max(value - high[i - 1], 0),
  );
  const deMin = low.map((value, i) =>
    i === 0 ? null : Math.max(low[i - 1] - value, 0),
  );
  return {
    demarker: map2(
      sma(deMax, n(p, "period")),
      sma(deMin, n(p, "period")),
      (a, b) => (a + b === 0 ? 50 : (100 * a) / (a + b)),
    ),
  };
};

export default compute;

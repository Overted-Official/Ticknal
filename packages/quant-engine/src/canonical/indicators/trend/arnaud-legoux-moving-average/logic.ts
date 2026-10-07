import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const period = n(p, "period");
  const offset = ((period - 1) * n(p, "offsetPct")) / 100;
  const width = period / n(p, "sigma");
  const result = close.map((_, i) => {
    if (i + 1 < period) return null;
    let weighted = 0;
    let weights = 0;
    for (let j = 0; j < period; j += 1) {
      const weight = Math.exp(-((j - offset) ** 2) / (2 * width ** 2));
      weighted += close[i - period + 1 + j] * weight;
      weights += weight;
    }
    return weighted / weights;
  });
  return { alma: result };
};

export default compute;

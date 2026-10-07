import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const period = n(p, "period");
  const cog = close.map((_, i) => {
    if (i + 1 < period) return null;
    let numerator = 0,
      denominator = 0;
    for (let j = 0; j < period; j += 1) {
      const value = close[i - j];
      numerator += value * (j + 1);
      denominator += value;
    }
    return denominator === 0 ? null : -numerator / denominator;
  });
  return { cog, signal: sma(cog, n(p, "signal")) };
};

export default compute;

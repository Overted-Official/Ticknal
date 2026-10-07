import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const period = n(p, "period");
  const result: (number | null)[] = Array(close.length).fill(null);
  if (close.length > 0) result[0] = close[0];
  for (let i = 1; i < close.length; i += 1) {
    const prior = result[i - 1]!;
    const ratio = prior === 0 ? 1 : close[i] / prior;
    const denominator = period * Math.max(0.1, ratio ** 4);
    result[i] = prior + (close[i] - prior) / denominator;
  }
  return { mcginley: result };
};

export default compute;

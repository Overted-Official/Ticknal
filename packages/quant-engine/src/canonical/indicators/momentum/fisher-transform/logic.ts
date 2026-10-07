import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const median = field(frame, "high").map(
    (high, i) => (high + field(frame, "low")[i]) / 2,
  );
  const high = rollingMax(median, n(p, "period"));
  const low = rollingMin(median, n(p, "period"));
  const fisher: (number | null)[] = Array(median.length).fill(null);
  let normalized = 0;
  for (let i = 0; i < median.length; i += 1) {
    if (high[i] === null || low[i] === null || high[i] === low[i]) continue;
    normalized = Math.max(
      -0.999,
      Math.min(
        0.999,
        0.33 * 2 * ((median[i] - low[i]!) / (high[i]! - low[i]!) - 0.5) +
          0.67 * normalized,
      ),
    );
    fisher[i] = 0.5 * Math.log((1 + normalized) / (1 - normalized));
  }
  return { fisher, trigger: fisher.map((_, i) => fisher[i - 1] ?? null) };
};

export default compute;

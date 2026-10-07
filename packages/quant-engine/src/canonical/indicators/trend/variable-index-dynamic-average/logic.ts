import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { difference, map2, n, rollingSum, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const period = n(p, "period");
  const momentumPeriod = n(p, "momentumPeriod");
  const changes = difference(close);
  const gains = changes.map((v) => (v === null ? null : Math.max(v, 0)));
  const losses = changes.map((v) => (v === null ? null : Math.max(-v, 0)));
  const momentum = map2(
    rollingSum(gains, momentumPeriod),
    rollingSum(losses, momentumPeriod),
    (g, l) => (g + l === 0 ? 0 : Math.abs(g - l) / (g + l)),
  );
  const result: (number | null)[] = Array(close.length).fill(null);
  const alpha = 2 / (period + 1);
  for (let i = momentumPeriod; i < close.length; i += 1) {
    const factor = momentum[i];
    if (factor === null) continue;
    const prior = result[i - 1] ?? close[i - 1];
    result[i] = prior + alpha * factor * (close[i] - prior);
  }
  return { vidya: result };
};

export default compute;

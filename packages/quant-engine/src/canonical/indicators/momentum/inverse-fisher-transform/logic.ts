import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rsi, wma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const base = wma(
    rsi(field(frame, "close"), n(p, "rsiPeriod")).map((v) =>
      v === null ? null : 0.1 * (v - 50),
    ),
    n(p, "smoothing"),
  );
  return {
    inverse_fisher: base.map((v) =>
      v === null ? null : (Math.exp(2 * v) - 1) / (Math.exp(2 * v) + 1),
    ),
  };
};

export default compute;

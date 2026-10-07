import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const fast = ema(close, n(p, "fast"));
  const slow = ema(close, n(p, "slow"));
  return {
    spread: map2(fast, slow, (a, b) => a - b),
    spread_pct: map2(fast, slow, (a, b) =>
      b === 0 ? null : (a / b - 1) * 100,
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const fast = ema(close, n(p, "fast"));
  const slow = ema(close, n(p, "slow"));
  const ppo = map2(fast, slow, (a, b) => (b === 0 ? null : (a / b - 1) * 100));
  const signal = ema(ppo, n(p, "signal"));
  return { ppo, signal, histogram: map2(ppo, signal, (a, b) => a - b) };
};

export default compute;

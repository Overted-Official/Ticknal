import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, volume } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = volume(frame);
  const fast = ema(source, n(p, "fast"));
  const slow = ema(source, n(p, "slow"));
  const pvo = map2(fast, slow, (a, b) => (b === 0 ? null : (a / b - 1) * 100));
  const signal = ema(pvo, n(p, "signal"));
  return { pvo, signal, histogram: map2(pvo, signal, (a, b) => a - b) };
};

export default compute;

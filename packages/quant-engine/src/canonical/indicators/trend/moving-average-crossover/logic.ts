import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { crossDown, crossUp, ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const fast = ema(close, n(p, "fast"));
  const slow = ema(close, n(p, "slow"));
  return { cross_up: crossUp(fast, slow), cross_down: crossDown(fast, slow) };
};

export default compute;

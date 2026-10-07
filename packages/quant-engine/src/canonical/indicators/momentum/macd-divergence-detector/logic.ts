import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { divergence, ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const macd = map2(
    ema(close, n(p, "fast")),
    ema(close, n(p, "slow")),
    (a, b) => a - b,
  );
  return divergence(close, macd, n(p, "left"), n(p, "right"));
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  return {
    ma_short: ema(close, n(p, "short")),
    ma_medium: ema(close, n(p, "medium")),
    ma_long: ema(close, n(p, "long")),
    ma_anchor: ema(close, n(p, "anchor")),
  };
};

export default compute;

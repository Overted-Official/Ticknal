import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  return {
    distance_pct: map2(close, ema(close, n(p, "period")), (price, average) =>
      average === 0 ? null : (price / average - 1) * 100,
    ),
  };
};

export default compute;

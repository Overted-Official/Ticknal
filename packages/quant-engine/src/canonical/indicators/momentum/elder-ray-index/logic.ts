import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const average = ema(field(frame, "close"), n(p, "period"));
  return {
    bull_power: map2(field(frame, "high"), average, (a, b) => a - b),
    bear_power: map2(field(frame, "low"), average, (a, b) => a - b),
  };
};

export default compute;

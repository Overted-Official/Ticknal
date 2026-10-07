import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  oscillator: map2(
    ema(field(frame, "close"), n(p, "fast")),
    ema(field(frame, "close"), n(p, "slow")),
    (a, b) => a - b,
  ),
});

export default compute;

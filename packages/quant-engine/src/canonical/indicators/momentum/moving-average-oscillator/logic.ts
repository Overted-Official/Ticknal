import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  mao: map2(
    ema(field(frame, "close"), n(p, "fast")),
    ema(field(frame, "close"), n(p, "slow")),
    (a, b) => (b === 0 ? null : (a / b - 1) * 100),
  ),
});

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { accumulationDistribution, ema, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  oscillator: map2(
    ema(accumulationDistribution(frame), n(p, "fast")),
    ema(accumulationDistribution(frame), n(p, "slow")),
    (a, b) => a - b,
  ),
});

export default compute;

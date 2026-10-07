import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  rvol_ratio: map2(
    volumes(frame),
    sma(volumes(frame), n(p, "period")),
    (a, b) => (b === 0 ? null : a / b),
  ),
});

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, ema, field, map2, n, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  force_index: ema(
    map2(change(field(frame, "close")), volumes(frame), (a, b) => a * b),
    n(p, "period"),
  ),
});

export default compute;

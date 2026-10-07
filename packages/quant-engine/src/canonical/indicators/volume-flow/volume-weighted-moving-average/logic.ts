import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingSum, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  vwma: map2(
    rollingSum(
      map2(field(frame, "close"), volumes(frame), (a, b) => a * b),
      n(p, "period"),
    ),
    rollingSum(volumes(frame), n(p, "period")),
    (a, b) => (b === 0 ? null : a / b),
  ),
});

export default compute;

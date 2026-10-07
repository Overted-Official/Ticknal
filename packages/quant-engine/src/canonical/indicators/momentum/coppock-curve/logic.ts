import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, roc, wma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  coppock: wma(
    map2(
      roc(field(frame, "close"), n(p, "shortRoc")),
      roc(field(frame, "close"), n(p, "longRoc")),
      (a, b) => a + b,
    ),
    n(p, "wmaPeriod"),
  ),
});

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, roc } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  roc_pct: roc(field(frame, "close"), n(p, "period")),
});

export default compute;

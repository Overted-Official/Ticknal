import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  stdev: rollingStdDev(field(frame, "close"), n(p, "period")),
});

export default compute;

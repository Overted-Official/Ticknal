import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { linearRegressionEnd, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  lsma: linearRegressionEnd(values(frame, "close"), n(p, "period")),
});

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, values, wma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  wma: wma(values(frame, "close"), n(p, "period")),
});

export default compute;

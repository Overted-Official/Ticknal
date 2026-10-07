import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, rollingVwap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  rolling_vwap: rollingVwap(frame, n(p, "period")),
});

export default compute;

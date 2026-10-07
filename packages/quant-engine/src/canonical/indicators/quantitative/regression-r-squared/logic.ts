import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, regression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  r_squared: regression(close(frame), n(p, "period")).r2,
});

export default compute;

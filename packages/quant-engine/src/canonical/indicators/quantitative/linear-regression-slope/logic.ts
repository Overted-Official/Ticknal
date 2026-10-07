import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, regression } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = regression(close(frame), n(p, "period"));
  return { slope: result.slope, intercept: result.intercept };
};

export default compute;

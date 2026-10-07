import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, trailingStop } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = trailingStop(frame, n(p, "period"), n(p, "multiplier"));
  return { stop_line: result.stop, direction: result.state };
};

export default compute;

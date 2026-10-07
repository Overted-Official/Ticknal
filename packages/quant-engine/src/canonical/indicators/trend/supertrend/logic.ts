import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, supertrend } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  supertrend(frame, n(p, "period"), n(p, "multiplier"));

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, trailingStop } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  trailingStop(frame, n(p, "period"), n(p, "multiplier"));

export default compute;

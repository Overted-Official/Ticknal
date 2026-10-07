import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, profile } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  profile(frame, n(p, "bins"), false, n(p, "period"));

export default compute;

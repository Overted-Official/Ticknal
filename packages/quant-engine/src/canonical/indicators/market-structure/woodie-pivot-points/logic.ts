import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { pivotLevels } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) =>
  pivotLevels(frame, "woodie");

export default compute;

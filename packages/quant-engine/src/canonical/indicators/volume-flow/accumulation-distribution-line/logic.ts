import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { accumulationDistribution } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  ad_line: accumulationDistribution(frame),
});

export default compute;

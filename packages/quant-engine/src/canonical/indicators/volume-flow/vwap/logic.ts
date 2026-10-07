import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { cumulativeVwap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  vwap: cumulativeVwap(frame),
});

export default compute;

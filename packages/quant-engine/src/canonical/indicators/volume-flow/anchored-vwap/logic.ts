import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { cumulativeVwap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  avwap: cumulativeVwap(frame),
});

export default compute;

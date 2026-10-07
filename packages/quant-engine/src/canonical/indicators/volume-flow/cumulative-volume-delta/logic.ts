import type { CategoryIndicatorSpec } from "../../shared/category-definition";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  delta: Array(frame.bars.length).fill(null),
  cumulative_delta: Array(frame.bars.length).fill(null),
});

export default compute;

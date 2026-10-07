import type { CategoryIndicatorSpec } from "../../shared/category-definition";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  spread: Array(frame.bars.length).fill(null),
  spread_bps: Array(frame.bars.length).fill(null),
});

export default compute;

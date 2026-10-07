import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, n, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  top: nullableEvents(
    frame,
    1,
    (i) =>
      Math.abs(frame.bars[i].high / frame.bars[i - 1].high - 1) * 100 <=
        n(p, "tolerancePct") &&
      direction(frame, i - 1) > 0 &&
      direction(frame, i) < 0,
  ),
  bottom: nullableEvents(
    frame,
    1,
    (i) =>
      Math.abs(frame.bars[i].low / frame.bars[i - 1].low - 1) * 100 <=
        n(p, "tolerancePct") &&
      direction(frame, i - 1) < 0 &&
      direction(frame, i) > 0,
  ),
});

export default compute;

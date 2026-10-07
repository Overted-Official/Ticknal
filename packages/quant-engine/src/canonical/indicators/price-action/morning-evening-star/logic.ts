import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, direction, n, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  bullish: nullableEvents(
    frame,
    2,
    (i) =>
      direction(frame, i - 2) < 0 &&
      bodies(frame)[i - 1] <= bodies(frame)[i - 2] * n(p, "smallBodyRatio") &&
      direction(frame, i) > 0 &&
      frame.bars[i].close >
        (frame.bars[i - 2].open + frame.bars[i - 2].close) / 2,
  ),
  bearish: nullableEvents(
    frame,
    2,
    (i) =>
      direction(frame, i - 2) > 0 &&
      bodies(frame)[i - 1] <= bodies(frame)[i - 2] * n(p, "smallBodyRatio") &&
      direction(frame, i) < 0 &&
      frame.bars[i].close <
        (frame.bars[i - 2].open + frame.bars[i - 2].close) / 2,
  ),
});

export default compute;

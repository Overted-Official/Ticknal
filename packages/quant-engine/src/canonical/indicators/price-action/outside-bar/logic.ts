import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  outside_bar: nullableEvents(
    frame,
    1,
    (i) =>
      frame.bars[i].high >= frame.bars[i - 1].high &&
      frame.bars[i].low <= frame.bars[i - 1].low,
  ),
  direction: frame.bars.map((_, i) =>
    i === 0
      ? null
      : direction(frame, i) > 0
        ? "bullish"
        : direction(frame, i) < 0
          ? "bearish"
          : "neutral",
  ),
});

export default compute;

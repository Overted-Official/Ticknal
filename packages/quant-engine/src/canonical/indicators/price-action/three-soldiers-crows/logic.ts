import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  bullish: nullableEvents(
    frame,
    2,
    (i) =>
      [i - 2, i - 1, i].every((j) => direction(frame, j) > 0) &&
      frame.bars[i].close > frame.bars[i - 1].close &&
      frame.bars[i - 1].close > frame.bars[i - 2].close,
  ),
  bearish: nullableEvents(
    frame,
    2,
    (i) =>
      [i - 2, i - 1, i].every((j) => direction(frame, j) < 0) &&
      frame.bars[i].close < frame.bars[i - 1].close &&
      frame.bars[i - 1].close < frame.bars[i - 2].close,
  ),
});

export default compute;

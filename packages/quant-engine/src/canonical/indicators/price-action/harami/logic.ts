import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  bullish: nullableEvents(
    frame,
    1,
    (i) =>
      direction(frame, i) > 0 &&
      direction(frame, i - 1) < 0 &&
      Math.max(frame.bars[i].open, frame.bars[i].close) <=
        frame.bars[i - 1].open &&
      Math.min(frame.bars[i].open, frame.bars[i].close) >=
        frame.bars[i - 1].close,
  ),
  bearish: nullableEvents(
    frame,
    1,
    (i) =>
      direction(frame, i) < 0 &&
      direction(frame, i - 1) > 0 &&
      Math.max(frame.bars[i].open, frame.bars[i].close) <=
        frame.bars[i - 1].close &&
      Math.min(frame.bars[i].open, frame.bars[i].close) >=
        frame.bars[i - 1].open,
  ),
});

export default compute;

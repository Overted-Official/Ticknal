import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, direction, n, nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const fraction = n(p, "penetrationPct") / 100;
  return {
    bullish: nullableEvents(
      frame,
      1,
      (i) =>
        direction(frame, i - 1) < 0 &&
        direction(frame, i) > 0 &&
        frame.bars[i].open < frame.bars[i - 1].close &&
        frame.bars[i].close >=
          frame.bars[i - 1].close + bodies(frame)[i - 1] * fraction &&
        frame.bars[i].close < frame.bars[i - 1].open,
    ),
    bearish: nullableEvents(
      frame,
      1,
      (i) =>
        direction(frame, i - 1) > 0 &&
        direction(frame, i) < 0 &&
        frame.bars[i].open > frame.bars[i - 1].close &&
        frame.bars[i].close <=
          frame.bars[i - 1].close - bodies(frame)[i - 1] * fraction &&
        frame.bars[i].close > frame.bars[i - 1].open,
    ),
  };
};

export default compute;

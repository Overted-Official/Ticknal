import type { CategoryIndicatorSpec } from "../../shared/category-definition";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const bullUpper: (number | null)[] = Array(frame.bars.length).fill(null),
    bullLower: (number | null)[] = Array(frame.bars.length).fill(null),
    bearUpper: (number | null)[] = Array(frame.bars.length).fill(null),
    bearLower: (number | null)[] = Array(frame.bars.length).fill(null),
    state: (string | null)[] = Array(frame.bars.length).fill(null);
  for (let i = 2; i < frame.bars.length; i += 1) {
    if (frame.bars[i].low > frame.bars[i - 2].high) {
      bullUpper[i] = frame.bars[i].low;
      bullLower[i] = frame.bars[i - 2].high;
      state[i] = "bullish-open";
    } else if (frame.bars[i].high < frame.bars[i - 2].low) {
      bearUpper[i] = frame.bars[i - 2].low;
      bearLower[i] = frame.bars[i].high;
      state[i] = "bearish-open";
    } else state[i] = "none";
  }
  return {
    bullish_upper: bullUpper,
    bullish_lower: bullLower,
    bearish_upper: bearUpper,
    bearish_lower: bearLower,
    fill_state: state,
  };
};

export default compute;

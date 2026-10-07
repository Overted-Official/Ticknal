import type { CategoryIndicatorSpec } from "../../shared/category-definition";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const upper: (number | null)[] = Array(frame.bars.length).fill(null),
    lower: (number | null)[] = Array(frame.bars.length).fill(null),
    fill: (number | null)[] = Array(frame.bars.length).fill(null),
    state: (string | null)[] = Array(frame.bars.length).fill(null);
  for (let i = 1; i < frame.bars.length; i += 1) {
    if (frame.bars[i].low > frame.bars[i - 1].high) {
      upper[i] = frame.bars[i].low;
      lower[i] = frame.bars[i - 1].high;
      fill[i] = 0;
      state[i] = "gap-up";
    } else if (frame.bars[i].high < frame.bars[i - 1].low) {
      upper[i] = frame.bars[i - 1].low;
      lower[i] = frame.bars[i].high;
      fill[i] = 0;
      state[i] = "gap-down";
    } else {
      fill[i] = 100;
      state[i] = "none";
    }
  }
  return { upper, lower, fill_pct: fill, state };
};

export default compute;

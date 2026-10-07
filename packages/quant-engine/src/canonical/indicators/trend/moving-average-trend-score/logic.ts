import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const close = values(frame, "close");
  const lines = [5, 10, 20, 50].map((period) => ema(close, period));
  const score = close.map((_, i) => {
    const observed = lines.map((line) => line[i]);
    if (observed.some((value) => value === null)) return null;
    const nums = observed as number[];
    let value = 0;
    for (let j = 0; j < nums.length - 1; j += 1)
      value += nums[j] > nums[j + 1] ? 1 : nums[j] < nums[j + 1] ? -1 : 0;
    return value;
  });
  return {
    score,
    alignment_state: score.map((value) =>
      value === null
        ? null
        : value === 3
          ? "bullish"
          : value === -3
            ? "bearish"
            : "mixed",
    ),
  };
};

export default compute;

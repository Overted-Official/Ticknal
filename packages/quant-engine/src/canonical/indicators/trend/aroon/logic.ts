import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const high = values(frame, "high");
  const low = values(frame, "low");
  const up: (number | null)[] = Array(high.length).fill(null);
  const down: (number | null)[] = Array(high.length).fill(null);
  for (let i = period; i < high.length; i += 1) {
    const highs = high.slice(i - period, i + 1);
    const lows = low.slice(i - period, i + 1);
    let highIndex = 0;
    let lowIndex = 0;
    for (let j = 1; j < highs.length; j += 1) {
      if (highs[j] >= highs[highIndex]) highIndex = j;
      if (lows[j] <= lows[lowIndex]) lowIndex = j;
    }
    up[i] = (100 * highIndex) / period;
    down[i] = (100 * lowIndex) / period;
  }
  return {
    aroon_up: up,
    aroon_down: down,
    oscillator: map2(up, down, (a, b) => a - b),
  };
};

export default compute;

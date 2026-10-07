import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, rollingStdDev, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    average = sma(ret, n(p, "period")),
    deviation = rollingStdDev(ret, n(p, "period"));
  const positive: (number | null)[] = Array(ret.length).fill(null),
    negative: (number | null)[] = Array(ret.length).fill(null),
    events: (boolean | null)[] = Array(ret.length).fill(null);
  let up = 0,
    down = 0;
  for (let i = 0; i < ret.length; i += 1) {
    if (
      ret[i] === null ||
      average[i] === null ||
      deviation[i] === null ||
      deviation[i] === 0
    )
      continue;
    const z = (ret[i]! - average[i]!) / deviation[i]!;
    up = Math.max(0, up + z);
    down = Math.min(0, down + z);
    events[i] = up >= n(p, "threshold") || down <= -n(p, "threshold");
    if (events[i]) {
      up = 0;
      down = 0;
    }
    positive[i] = up;
    negative[i] = down;
  }
  return { positive_cusum: positive, negative_cusum: negative, event: events };
};

export default compute;

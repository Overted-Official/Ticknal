import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, percentileRank, roc, rsi } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const streak: number[] = Array(close.length).fill(0);
  for (let i = 1; i < close.length; i += 1)
    streak[i] =
      close[i] > close[i - 1]
        ? Math.max(1, streak[i - 1] + 1)
        : close[i] < close[i - 1]
          ? Math.min(-1, streak[i - 1] - 1)
          : 0;
  const first = rsi(close, n(p, "rsiPeriod"));
  const second = rsi(streak, n(p, "streakPeriod"));
  const third = percentileRank(roc(close, 1), n(p, "rankPeriod"));
  return {
    connors_rsi: first.map((value, i) =>
      value === null || second[i] === null || third[i] === null
        ? null
        : (value + second[i]! + third[i]!) / 3,
    ),
  };
};

export default compute;

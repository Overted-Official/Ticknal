import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  close,
  n,
  returns,
  rollingStdDev,
  shannonEntropy,
  sma,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    average = sma(source, n(p, "period")),
    deviation = rollingStdDev(source, n(p, "period")),
    entropy = shannonEntropy(returns(source), n(p, "period"), 10);
  const z = source.map((value, i) =>
    average[i] === null || deviation[i] === null || deviation[i] === 0
      ? null
      : (value - average[i]!) / deviation[i]!,
  );
  const score = z.map((value, i) =>
    value === null || entropy[i] === null
      ? null
      : Math.min(100, Math.abs(value) * 25 + (1 - entropy[i]!) * 50),
  );
  return {
    score_0_100: score,
    direction: z.map((value) =>
      value === null ? null : value > 0 ? "down" : value < 0 ? "up" : "neutral",
    ),
  };
};

export default compute;

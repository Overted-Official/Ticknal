import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  changePointScore,
  close,
  n,
  percentileRank,
  regression,
  returns,
  rollingStdDev,
  shannonEntropy,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    ret = returns(source),
    trend = regression(source, n(p, "period")).slope,
    volatility = percentileRank(
      rollingStdDev(ret, n(p, "period")),
      n(p, "period"),
    ),
    entropy = shannonEntropy(ret, n(p, "period"), 10),
    change = changePointScore(ret, n(p, "period"));
  const votes = source.map((_, i) =>
    trend[i] === null ||
    volatility[i] === null ||
    entropy[i] === null ||
    change[i] === null
      ? null
      : (trend[i]! > 0 ? 1 : -1) +
        (volatility[i]! > 80 ? -1 : 1) +
        (entropy[i]! < 0.7 ? 1 : -1) +
        (change[i]! > 2 ? -1 : 1),
  );
  return {
    regime: votes.map((value) =>
      value === null
        ? null
        : value >= 2
          ? "risk-on"
          : value <= -2
            ? "risk-off"
            : "mixed",
    ),
    confidence: votes.map((value) =>
      value === null ? null : Math.abs(value) / 4,
    ),
    component_votes: votes,
  };
};

export default compute;

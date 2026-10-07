import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  close,
  n,
  permutationEntropy,
  returns,
  rollingStdDev,
  sma,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    entropy = permutationEntropy(
      returns(source),
      n(p, "period"),
      n(p, "dimension"),
    ),
    average = sma(source, n(p, "period")),
    deviation = rollingStdDev(source, n(p, "period"));
  return {
    entropy,
    regime: entropy.map((value) =>
      value === null
        ? null
        : value > 0.8
          ? "random"
          : value < 0.5
            ? "ordered"
            : "mixed",
    ),
    adaptive_upper: average.map((value, i) =>
      value === null || deviation[i] === null || entropy[i] === null
        ? null
        : value + deviation[i]! * (1 + entropy[i]!),
    ),
    adaptive_lower: average.map((value, i) =>
      value === null || deviation[i] === null || entropy[i] === null
        ? null
        : value - deviation[i]! * (1 + entropy[i]!),
    ),
  };
};

export default compute;

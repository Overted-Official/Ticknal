import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, lowerWick, n, ranges, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = ranges(frame);
  const doji = range.map((value, i) =>
    value === 0
      ? false
      : (100 * bodies(frame)[i]) / value <= n(p, "bodyThresholdPct"),
  );
  return {
    doji,
    long_legged: doji.map(
      (value, i) =>
        value &&
        upperWick(frame, i) / range[i] >= 0.35 &&
        lowerWick(frame, i) / range[i] >= 0.35,
    ),
    dragonfly: doji.map(
      (value, i) =>
        value &&
        lowerWick(frame, i) / range[i] >= 0.6 &&
        upperWick(frame, i) / range[i] <= 0.1,
    ),
    gravestone: doji.map(
      (value, i) =>
        value &&
        upperWick(frame, i) / range[i] >= 0.6 &&
        lowerWick(frame, i) / range[i] <= 0.1,
    ),
  };
};

export default compute;

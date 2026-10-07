import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n, returns, variance, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const kurtosis = windowMap(
    returns(close(frame)),
    n(p, "period"),
    (window) => {
      const m = mean(window),
        sd = Math.sqrt(variance(window));
      return sd === 0
        ? 3
        : mean(window.map((value) => ((value - m) / sd) ** 4));
    },
  );
  return {
    kurtosis,
    excess_kurtosis: kurtosis.map((value) =>
      value === null ? null : value - 3,
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, rescaledRange, returns, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const hurst = windowMap(returns(close(frame)), n(p, "period"), (window) => {
    const rs = rescaledRange(window);
    return rs === null || rs <= 0
      ? null
      : Math.log(rs) / Math.log(window.length);
  });
  return {
    hurst,
    state: hurst.map((value) =>
      value === null
        ? null
        : value > 0.55
          ? "trending"
          : value < 0.45
            ? "mean-reverting"
            : "random",
    ),
  };
};

export default compute;

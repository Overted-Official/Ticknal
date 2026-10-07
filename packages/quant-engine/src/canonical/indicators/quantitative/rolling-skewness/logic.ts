import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n, returns, variance, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  skewness: windowMap(returns(close(frame)), n(p, "period"), (window) => {
    const m = mean(window),
      sd = Math.sqrt(variance(window));
    return sd === 0 ? 0 : mean(window.map((value) => ((value - m) / sd) ** 3));
  }),
});

export default compute;

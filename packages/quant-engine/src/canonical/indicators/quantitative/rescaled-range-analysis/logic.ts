import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, rescaledRange, returns, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const rs = windowMap(returns(close(frame)), n(p, "period"), (window) =>
    rescaledRange(window),
  );
  return {
    r_over_s: rs,
    hurst_estimate: rs.map((value) =>
      value === null || value <= 0
        ? null
        : Math.log(value) / Math.log(n(p, "period")),
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    coefficient = source.map((_, i) => {
      const period = n(p, "period");
      if (i < period) return null;
      const window = source.slice(i - period, i + 1),
        x = window.slice(0, -1),
        y = window.slice(1);
      const xm = mean(x),
        ym = mean(y),
        xx = x.reduce((sum, value) => sum + (value - xm) ** 2, 0);
      return xx === 0
        ? null
        : x.reduce((sum, value, j) => sum + (value - xm) * (y[j] - ym), 0) / xx;
    });
  return {
    half_life: coefficient.map((value) =>
      value === null || value <= 0 || value >= 1
        ? null
        : -Math.log(2) / Math.log(value),
    ),
    ar_coefficient: coefficient,
  };
};

export default compute;

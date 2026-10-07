import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    statistic = source.map((_, i) => {
      const period = n(p, "period");
      if (i < period) return null;
      const window = source.slice(i - period, i + 1),
        x = window.slice(0, -1),
        y = window.slice(1).map((value, j) => value - window[j]);
      const xm = mean(x),
        ym = mean(y);
      const xx = x.reduce((sum, value) => sum + (value - xm) ** 2, 0);
      if (xx === 0) return null;
      const beta =
        x.reduce((sum, value, j) => sum + (value - xm) * (y[j] - ym), 0) / xx;
      const alpha = ym - beta * xm;
      const residualVariance =
        y.reduce(
          (sum, value, j) => sum + (value - alpha - beta * x[j]) ** 2,
          0,
        ) / Math.max(1, y.length - 2);
      const se = Math.sqrt(residualVariance / xx);
      return se === 0 ? null : beta / se;
    });
  const pValue = statistic.map((value) =>
    value === null ? null : 1 / (1 + Math.exp(-1.7 * (value + 2.86))),
  );
  return {
    test_statistic: statistic,
    p_value: pValue,
    stationary: statistic.map((value) =>
      value === null ? null : value < -2.86,
    ),
  };
};

export default compute;

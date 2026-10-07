import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n, percentileRank, returns, variance } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    range = frame.bars.map((bar) =>
      bar.close === 0 ? null : (bar.high - bar.low) / bar.close,
    );
  const score = ret.map((value, i) => {
    const period = n(p, "period");
    if (value === null || i + 1 < period) return null;
    const xs = ret.slice(i - period + 1, i + 1),
      ys = range.slice(i - period + 1, i + 1);
    if (xs.some((v) => v === null) || ys.some((v) => v === null)) return null;
    const x = xs as number[],
      y = ys as number[],
      mx = mean(x),
      my = mean(y),
      vx = variance(x),
      vy = variance(y),
      covariance =
        x.reduce((sum, item, j) => sum + (item - mx) * (y[j] - my), 0) / period,
      determinant = vx * vy - covariance ** 2;
    if (determinant <= 0) return 0;
    const dx = value - mx,
      dy = range[i]! - my;
    return Math.sqrt(
      Math.max(
        0,
        (vy * dx ** 2 - 2 * covariance * dx * dy + vx * dy ** 2) / determinant,
      ),
    );
  });
  return {
    anomaly_score: score,
    percentile: percentileRank(score, n(p, "period")),
  };
};

export default compute;

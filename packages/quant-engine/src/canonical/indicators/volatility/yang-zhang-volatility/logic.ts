import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const open = field(frame, "open"),
    high = field(frame, "high"),
    low = field(frame, "low"),
    close = field(frame, "close");
  const overnight = open.map((value, i) =>
    i === 0 || value <= 0 || close[i - 1] <= 0
      ? null
      : Math.log(value / close[i - 1]),
  );
  const session = close.map((value, i) =>
    value <= 0 || open[i] <= 0 ? null : Math.log(value / open[i]),
  );
  const rs = close.map((value, i) =>
    open[i] <= 0 || low[i] <= 0 || value <= 0
      ? null
      : Math.log(high[i] / open[i]) * Math.log(high[i] / value) +
        Math.log(low[i] / open[i]) * Math.log(low[i] / value),
  );
  const period = n(p, "period");
  const k = 0.34 / (1.34 + (period + 1) / (period - 1));
  const variance = close.map((_, i) => {
    if (i + 1 < period) return null;
    const o = overnight.slice(i - period + 1, i + 1);
    const s = session.slice(i - period + 1, i + 1);
    const r = rs.slice(i - period + 1, i + 1);
    if (
      o.some((v) => v === null) ||
      s.some((v) => v === null) ||
      r.some((v) => v === null)
    )
      return null;
    const varianceOf = (items: readonly (number | null)[]) => {
      const nums = items as number[];
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    };
    return (
      varianceOf(o) +
      k * varianceOf(s) +
      ((1 - k) * (r as number[]).reduce((a, b) => a + b, 0)) / period
    );
  });
  return {
    volatility_pct: variance.map((value) =>
      value === null
        ? null
        : 100 * Math.sqrt(Math.max(0, value) * n(p, "annualization")),
    ),
  };
};

export default compute;

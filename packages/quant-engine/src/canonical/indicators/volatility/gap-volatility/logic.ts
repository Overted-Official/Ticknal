import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const open = field(frame, "open"),
    close = field(frame, "close");
  const gaps = open.map((value, i) =>
    i === 0 || close[i - 1] === 0 ? null : 100 * (value / close[i - 1] - 1),
  );
  const period = n(p, "period");
  return {
    average_gap: sma(
      gaps.map((v) => (v === null ? null : Math.abs(v))),
      period,
    ),
    positive_gap: sma(
      gaps.map((v) => (v === null ? null : Math.max(v, 0))),
      period,
    ),
    negative_gap: sma(
      gaps.map((v) => (v === null ? null : Math.min(v, 0))),
      period,
    ),
  };
};

export default compute;

import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  return {
    pgo: close.map((value, i) => {
      const mean = sma(close, n(p, "period"))[i];
      const range = atr(
        field(frame, "high"),
        field(frame, "low"),
        close,
        n(p, "period"),
      )[i];
      return mean === null || range === null || range === 0
        ? null
        : (value - mean) / range;
    }),
  };
};

export default compute;

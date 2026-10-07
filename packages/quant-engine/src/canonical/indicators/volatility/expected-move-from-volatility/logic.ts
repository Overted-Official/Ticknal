import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, logReturns, map2, n, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const volatility = rollingStdDev(logReturns(close), n(p, "period"));
  const confidence = n(p, "confidencePct");
  const z =
    confidence >= 99
      ? 2.576
      : confidence >= 95
        ? 1.96
        : confidence >= 90
          ? 1.645
          : 1;
  const move = volatility.map((value, i) =>
    value === null ? null : close[i] * z * value * Math.sqrt(n(p, "horizon")),
  );
  return {
    upper: map2(close, move, (a, b) => a + b),
    lower: map2(close, move, (a, b) => a - b),
  };
};

export default compute;

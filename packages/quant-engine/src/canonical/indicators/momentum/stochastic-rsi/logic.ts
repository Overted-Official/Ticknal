import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin, rsi, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const base = rsi(field(frame, "close"), n(p, "rsiPeriod"));
  const highest = rollingMax(base, n(p, "stochPeriod"));
  const lowest = rollingMin(base, n(p, "stochPeriod"));
  const raw = base.map((value, i) =>
    value === null ||
    highest[i] === null ||
    lowest[i] === null ||
    highest[i] === lowest[i]
      ? null
      : (100 * (value - lowest[i]!)) / (highest[i]! - lowest[i]!),
  );
  const k = sma(raw, n(p, "smoothK"));
  return { stoch_rsi_k: k, stoch_rsi_d: sma(k, n(p, "smoothD")) };
};

export default compute;

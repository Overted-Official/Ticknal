import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, roc, rsi, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const returns = roc(close, 1);
  const volatility = sma(
    returns.map((v) => (v === null ? null : Math.abs(v))),
    n(p, "volatilityPeriod"),
  );
  const baseline = sma(volatility, n(p, "volatilityPeriod"));
  const periods = volatility.map((value, i) =>
    value === null || baseline[i] === null || value === 0
      ? null
      : Math.max(
          n(p, "minPeriod"),
          Math.min(
            n(p, "maxPeriod"),
            Math.round((n(p, "basePeriod") * baseline[i]!) / value),
          ),
        ),
  );
  const dynamic = close.map((_, i) => {
    const period = periods[i];
    if (period === null || i < period) return null;
    const segment = close.slice(i - period, i + 1);
    return rsi(segment, period).at(-1) ?? null;
  });
  return { dynamic_rsi: dynamic, adaptive_period: periods };
};

export default compute;

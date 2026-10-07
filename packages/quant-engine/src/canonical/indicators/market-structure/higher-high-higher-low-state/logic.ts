import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period"));
  const hh = high.map((value, i) =>
    i === 0 || value === null || high[i - 1] === null
      ? null
      : value > high[i - 1]!,
  );
  const hl = low.map((value, i) =>
    i === 0 || value === null || low[i - 1] === null
      ? null
      : value > low[i - 1]!,
  );
  const lh = high.map((value, i) =>
    i === 0 || value === null || high[i - 1] === null
      ? null
      : value < high[i - 1]!,
  );
  const ll = low.map((value, i) =>
    i === 0 || value === null || low[i - 1] === null
      ? null
      : value < low[i - 1]!,
  );
  return {
    higher_high: hh,
    higher_low: hl,
    lower_high: lh,
    lower_low: ll,
    trend_state: hh.map((_, i) =>
      hh[i] && hl[i]
        ? "bullish"
        : lh[i] && ll[i]
          ? "bearish"
          : high[i] === null
            ? null
            : "mixed",
    ),
  };
};

export default compute;

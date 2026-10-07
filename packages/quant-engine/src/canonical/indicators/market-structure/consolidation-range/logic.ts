import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const upper = rollingMax(field(frame, "high"), n(p, "period")),
    lower = rollingMin(field(frame, "low"), n(p, "period")),
    close = field(frame, "close");
  const width = close.map((value, i) =>
    upper[i] === null || lower[i] === null || value === 0
      ? null
      : (100 * (upper[i]! - lower[i]!)) / value,
  );
  const duration: (number | null)[] = Array(close.length).fill(null);
  let run = 0;
  for (let i = 0; i < close.length; i += 1) {
    if (width[i] !== null && width[i]! <= n(p, "maximumWidthPct")) run += 1;
    else run = 0;
    duration[i] = width[i] === null ? null : run;
  }
  return { upper, lower, duration, width_pct: width };
};

export default compute;

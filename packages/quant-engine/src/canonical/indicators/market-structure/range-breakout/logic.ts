import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    upper = rollingMax(field(frame, "high"), n(p, "period")),
    lower = rollingMin(field(frame, "low"), n(p, "period"));
  const tight = close.map((value, i) =>
    upper[i] === null || lower[i] === null || value === 0
      ? null
      : (100 * (upper[i]! - lower[i]!)) / value <= n(p, "maximumWidthPct"),
  );
  const up = close.map((value, i) =>
    i === 0 || tight[i - 1] !== true || upper[i - 1] === null
      ? tight[i - 1] === null
        ? null
        : false
      : value > upper[i - 1]!,
  );
  const down = close.map((value, i) =>
    i === 0 || tight[i - 1] !== true || lower[i - 1] === null
      ? tight[i - 1] === null
        ? null
        : false
      : value < lower[i - 1]!,
  );
  return {
    breakout_up: up,
    breakout_down: down,
    level: close.map((_, i) =>
      up[i] ? upper[i - 1]! : down[i] ? lower[i - 1]! : null,
    ),
  };
};

export default compute;

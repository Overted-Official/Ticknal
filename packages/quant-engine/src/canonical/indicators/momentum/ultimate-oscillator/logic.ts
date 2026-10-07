import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const high = field(frame, "high");
  const low = field(frame, "low");
  const bp = close.map((value, i) =>
    i === 0 ? null : value - Math.min(low[i], close[i - 1]),
  );
  const tr = high.map((value, i) =>
    i === 0
      ? null
      : Math.max(value, close[i - 1]) - Math.min(low[i], close[i - 1]),
  );
  const average = (period: number) =>
    map2(rollingSum(bp, period), rollingSum(tr, period), (a, b) =>
      b === 0 ? null : a / b,
    );
  const short = average(n(p, "short"));
  const medium = average(n(p, "medium"));
  const long = average(n(p, "long"));
  return {
    ultimate_oscillator: short.map((value, i) =>
      value === null || medium[i] === null || long[i] === null
        ? null
        : (100 * (4 * value + 2 * medium[i]! + long[i]!)) / 7,
    ),
  };
};

export default compute;

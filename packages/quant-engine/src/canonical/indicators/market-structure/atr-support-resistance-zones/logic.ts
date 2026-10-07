import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const resistance = rollingMax(field(frame, "high"), n(p, "period")),
    support = rollingMin(field(frame, "low"), n(p, "period")),
    range = atr(
      field(frame, "high"),
      field(frame, "low"),
      field(frame, "close"),
      n(p, "atrPeriod"),
    ),
    multiplier = n(p, "multiplier");
  return {
    resistance_upper: map2(resistance, range, (a, b) => a + multiplier * b),
    resistance_lower: map2(resistance, range, (a, b) => a - multiplier * b),
    support_upper: map2(support, range, (a, b) => a + multiplier * b),
    support_lower: map2(support, range, (a, b) => a - multiplier * b),
  };
};

export default compute;

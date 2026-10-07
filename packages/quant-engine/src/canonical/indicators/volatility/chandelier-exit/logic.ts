import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, map2, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const range = atr(
    field(frame, "high"),
    field(frame, "low"),
    field(frame, "close"),
    period,
  );
  return {
    long_exit: map2(
      rollingMax(field(frame, "high"), period),
      range,
      (a, b) => a - n(p, "multiplier") * b,
    ),
    short_exit: map2(
      rollingMin(field(frame, "low"), period),
      range,
      (a, b) => a + n(p, "multiplier") * b,
    ),
  };
};

export default compute;

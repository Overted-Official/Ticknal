import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const middle = ema(field(frame, "close"), n(p, "period"));
  const range = atr(
    field(frame, "high"),
    field(frame, "low"),
    field(frame, "close"),
    n(p, "period"),
  );
  return {
    middle,
    upper: map2(middle, range, (a, b) => a + n(p, "multiplier") * b),
    lower: map2(middle, range, (a, b) => a - n(p, "multiplier") * b),
  };
};

export default compute;

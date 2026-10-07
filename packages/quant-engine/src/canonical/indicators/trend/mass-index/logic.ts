import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, rollingSum, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = map2(
    values(frame, "high"),
    values(frame, "low"),
    (high, low) => high - low,
  );
  const first = ema(range, n(p, "emaPeriod"));
  const second = ema(first, n(p, "emaPeriod"));
  const ratio = map2(first, second, (a, b) => (b === 0 ? null : a / b));
  return { mass_index: rollingSum(ratio, n(p, "sumPeriod")) };
};

export default compute;

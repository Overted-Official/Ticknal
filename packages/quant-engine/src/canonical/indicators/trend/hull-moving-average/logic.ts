import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, values, wma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = values(frame, "close");
  const raw = map2(
    wma(close, Math.max(1, Math.floor(period / 2))),
    wma(close, period),
    (half, full) => 2 * half - full,
  );
  return { hma: wma(raw, Math.max(1, Math.round(Math.sqrt(period)))) };
};

export default compute;

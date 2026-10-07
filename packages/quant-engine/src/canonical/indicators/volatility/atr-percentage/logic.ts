import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  atr_pct: map2(
    atr(
      field(frame, "high"),
      field(frame, "low"),
      field(frame, "close"),
      n(p, "period"),
    ),
    field(frame, "close"),
    (range, close) => (close === 0 ? null : (100 * range) / close),
  ),
});

export default compute;

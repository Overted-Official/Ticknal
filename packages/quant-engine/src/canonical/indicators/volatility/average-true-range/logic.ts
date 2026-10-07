import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  atr: atr(
    field(frame, "high"),
    field(frame, "low"),
    field(frame, "close"),
    n(p, "period"),
  ),
});

export default compute;

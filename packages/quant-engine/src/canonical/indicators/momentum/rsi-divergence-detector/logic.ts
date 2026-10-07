import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { divergence, field, n, rsi } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  divergence(
    field(frame, "close"),
    rsi(field(frame, "close"), n(p, "rsiPeriod")),
    n(p, "left"),
    n(p, "right"),
  );

export default compute;

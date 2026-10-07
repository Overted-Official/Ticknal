import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rsi } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  rsi: rsi(field(frame, "close"), n(p, "period")),
});

export default compute;

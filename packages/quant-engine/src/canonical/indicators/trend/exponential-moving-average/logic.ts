import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  ema: ema(values(frame, "close"), n(p, "period")),
});

export default compute;
